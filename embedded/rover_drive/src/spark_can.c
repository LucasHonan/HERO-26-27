#include "spark_can.h"
#include "spark_protocol.h"
#include "drive_config.h"
#include "stm32h7xx_hal.h"

#include <string.h>

static FDCAN_HandleTypeDef hfdcan1;

static const uint8_t k_can_id[MOTOR_COUNT] = {
    CFG_CAN_ID_FRONT_LEFT, CFG_CAN_ID_REAR_LEFT,
    CFG_CAN_ID_FRONT_RIGHT, CFG_CAN_ID_REAR_RIGHT,
};

static struct {
    spark_status1_t status;
    uint32_t last_ms;
    bool seen;
} s_fb[MOTOR_COUNT];

void HAL_FDCAN_MspInit(FDCAN_HandleTypeDef *h)
{
    if (h->Instance != FDCAN1) return;

    RCC_PeriphCLKInitTypeDef pclk = {0};
    pclk.PeriphClockSelection = RCC_PERIPHCLK_FDCAN;
    pclk.FdcanClockSelection = RCC_FDCANCLKSOURCE_PLL;   /* PLL1Q = 80 MHz */
    HAL_RCCEx_PeriphCLKConfig(&pclk);

    __HAL_RCC_FDCAN_CLK_ENABLE();
    __HAL_RCC_GPIOD_CLK_ENABLE();

    GPIO_InitTypeDef g = {0};
    g.Pin = GPIO_PIN_0 | GPIO_PIN_1;
    g.Mode = GPIO_MODE_AF_PP;
    g.Pull = GPIO_NOPULL;
    g.Speed = GPIO_SPEED_FREQ_HIGH;
    g.Alternate = GPIO_AF9_FDCAN1;
    HAL_GPIO_Init(GPIOD, &g);
}

bool spark_can_init(void)
{
    hfdcan1.Instance = FDCAN1;
    hfdcan1.Init.FrameFormat = FDCAN_FRAME_CLASSIC;
    hfdcan1.Init.Mode = FDCAN_MODE_NORMAL;
    hfdcan1.Init.AutoRetransmission = ENABLE;
    hfdcan1.Init.TransmitPause = DISABLE;
    hfdcan1.Init.ProtocolException = DISABLE;
    /* 80 MHz kernel clock / 1 = 80 tq per bit -> 1 Mbit/s, 80 % sample point */
    hfdcan1.Init.NominalPrescaler = 1;
    hfdcan1.Init.NominalSyncJumpWidth = 16;
    hfdcan1.Init.NominalTimeSeg1 = 63;
    hfdcan1.Init.NominalTimeSeg2 = 16;
    hfdcan1.Init.DataPrescaler = 1;
    hfdcan1.Init.DataSyncJumpWidth = 1;
    hfdcan1.Init.DataTimeSeg1 = 1;
    hfdcan1.Init.DataTimeSeg2 = 1;
    hfdcan1.Init.MessageRAMOffset = 0;
    hfdcan1.Init.StdFiltersNbr = 0;
    hfdcan1.Init.ExtFiltersNbr = 1;
    hfdcan1.Init.RxFifo0ElmtsNbr = 16;
    hfdcan1.Init.RxFifo0ElmtSize = FDCAN_DATA_BYTES_8;
    hfdcan1.Init.RxFifo1ElmtsNbr = 0;
    hfdcan1.Init.RxFifo1ElmtSize = FDCAN_DATA_BYTES_8;
    hfdcan1.Init.RxBuffersNbr = 0;
    hfdcan1.Init.RxBufferSize = FDCAN_DATA_BYTES_8;
    hfdcan1.Init.TxEventsNbr = 0;
    hfdcan1.Init.TxBuffersNbr = 0;
    hfdcan1.Init.TxFifoQueueElmtsNbr = 16;
    hfdcan1.Init.TxFifoQueueMode = FDCAN_TX_FIFO_OPERATION;
    hfdcan1.Init.TxElmtSize = FDCAN_DATA_BYTES_8;
    if (HAL_FDCAN_Init(&hfdcan1) != HAL_OK) return false;

    /* Accept only Spark status-1 frames (any device ID) into FIFO 0. */
    FDCAN_FilterTypeDef f = {0};
    f.IdType = FDCAN_EXTENDED_ID;
    f.FilterIndex = 0;
    f.FilterType = FDCAN_FILTER_MASK;
    f.FilterConfig = FDCAN_FILTER_TO_RXFIFO0;
    f.FilterID1 = spark_make_id(SPARK_API_STATUS1, 0);
    f.FilterID2 = 0x1FFFFFC0u;                 /* ignore device-ID bits */
    if (HAL_FDCAN_ConfigFilter(&hfdcan1, &f) != HAL_OK) return false;
    if (HAL_FDCAN_ConfigGlobalFilter(&hfdcan1, FDCAN_REJECT, FDCAN_REJECT,
                                     FDCAN_REJECT_REMOTE, FDCAN_REJECT_REMOTE) != HAL_OK)
        return false;

    memset(s_fb, 0, sizeof(s_fb));
    return HAL_FDCAN_Start(&hfdcan1) == HAL_OK;
}

static void send_frame(uint32_t id, const uint8_t data[8])
{
    FDCAN_TxHeaderTypeDef h = {0};
    h.Identifier = id;
    h.IdType = FDCAN_EXTENDED_ID;
    h.TxFrameType = FDCAN_DATA_FRAME;
    h.DataLength = FDCAN_DLC_BYTES_8;
    h.ErrorStateIndicator = FDCAN_ESI_ACTIVE;
    h.BitRateSwitch = FDCAN_BRS_OFF;
    h.FDFormat = FDCAN_CLASSIC_CAN;
    h.TxEventFifoControl = FDCAN_NO_TX_EVENTS;
    h.MessageMarker = 0;
    /* If the bus is unplugged the FIFO fills and this fails; that's fine,
     * the Sparks will time out with no heartbeat and stop on their own. */
    (void)HAL_FDCAN_AddMessageToTxFifoQ(&hfdcan1, &h, (uint8_t *)data);
}

void spark_can_send(const drive_output_t *out)
{
    uint8_t buf[8];

    for (int i = 0; i < MOTOR_COUNT; i++) {
        spark_pack_duty(buf, out->enable ? out->duty[i] : 0.0f);
        send_frame(spark_make_id(SPARK_API_DUTY_CYCLE, k_can_id[i]), buf);
    }

    /* No heartbeat when disabled -> Sparks disable within 100 ms. */
    if (out->enable) {
        spark_pack_heartbeat(buf);
        send_frame(spark_heartbeat_id(), buf);
    }
}

void spark_can_poll(void)
{
    FDCAN_RxHeaderTypeDef rh;
    uint8_t data[8];

    while (HAL_FDCAN_GetRxFifoFillLevel(&hfdcan1, FDCAN_RX_FIFO0) > 0) {
        if (HAL_FDCAN_GetRxMessage(&hfdcan1, FDCAN_RX_FIFO0, &rh, data) != HAL_OK)
            break;
        if (rh.IdType != FDCAN_EXTENDED_ID) continue;

        uint8_t dev = spark_id_device(rh.Identifier);
        for (int i = 0; i < MOTOR_COUNT; i++) {
            if (k_can_id[i] != dev) continue;
            spark_parse_status1(data, &s_fb[i].status);
            s_fb[i].last_ms = HAL_GetTick();
            s_fb[i].seen = true;
        }
    }
}

void spark_can_get_feedback(drive_feedback_t *fb)
{
    uint32_t now = HAL_GetTick();
    for (int i = 0; i < MOTOR_COUNT; i++) {
        fb->valid[i] = s_fb[i].seen && (now - s_fb[i].last_ms) <= CFG_FEEDBACK_STALE_MS;
        fb->motor_rpm[i] = s_fb[i].status.velocity_rpm;
        fb->bus_voltage[i] = s_fb[i].status.bus_voltage;
    }
}
