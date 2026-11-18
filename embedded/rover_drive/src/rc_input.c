#include "rc_input.h"
#include "ibus.h"
#include "drive_config.h"
#include "stm32h7xx_hal.h"

static UART_HandleTypeDef huart2;
static ibus_parser_t s_parser;              /* written only in the IRQ */
static volatile uint32_t s_last_frame_ms;
static volatile uint16_t s_snapshot[IBUS_CHANNELS];
static volatile bool s_have_frame;

void HAL_UART_MspInit(UART_HandleTypeDef *h)
{
    if (h->Instance != USART2) return;
    __HAL_RCC_USART2_CLK_ENABLE();
    __HAL_RCC_GPIOD_CLK_ENABLE();

    GPIO_InitTypeDef g = {0};
    g.Pin = GPIO_PIN_5 | GPIO_PIN_6;        /* PD5 TX (unused), PD6 RX */
    g.Mode = GPIO_MODE_AF_PP;
    g.Pull = GPIO_PULLUP;
    g.Speed = GPIO_SPEED_FREQ_LOW;
    g.Alternate = GPIO_AF7_USART2;
    HAL_GPIO_Init(GPIOD, &g);

    HAL_NVIC_SetPriority(USART2_IRQn, 5, 0);
    HAL_NVIC_EnableIRQ(USART2_IRQn);
}

void rc_input_init(void)
{
    ibus_init(&s_parser);
    s_have_frame = false;

    huart2.Instance = USART2;
    huart2.Init.BaudRate = 115200;
    huart2.Init.WordLength = UART_WORDLENGTH_8B;
    huart2.Init.StopBits = UART_STOPBITS_1;
    huart2.Init.Parity = UART_PARITY_NONE;
    huart2.Init.Mode = UART_MODE_RX;
    huart2.Init.HwFlowCtl = UART_HWCONTROL_NONE;
    huart2.Init.OverSampling = UART_OVERSAMPLING_16;
    huart2.Init.OneBitSampling = UART_ONE_BIT_SAMPLE_DISABLE;
    huart2.Init.ClockPrescaler = UART_PRESCALER_DIV1;
    huart2.AdvancedInit.AdvFeatureInit = UART_ADVFEATURE_NO_INIT;
    HAL_UART_Init(&huart2);

    __HAL_UART_ENABLE_IT(&huart2, UART_IT_RXNE);
}

void rc_input_uart_irq(void)
{
    uint32_t isr = USART2->ISR;
    if (isr & (USART_ISR_ORE | USART_ISR_FE | USART_ISR_NE))
        USART2->ICR = USART_ICR_ORECF | USART_ICR_FECF | USART_ICR_NECF;

    if (isr & USART_ISR_RXNE_RXFNE) {
        uint8_t b = (uint8_t)USART2->RDR;
        if (ibus_feed(&s_parser, b)) {
            for (int i = 0; i < IBUS_CHANNELS; i++)
                s_snapshot[i] = s_parser.channels[i];
            s_last_frame_ms = HAL_GetTick();
            s_have_frame = true;
        }
    }
}

static float stick_to_unit(uint16_t us, bool reverse)
{
    int32_t off = (int32_t)us - CFG_RC_CENTER_US;
    if (off > -CFG_RC_DEADBAND_US && off < CFG_RC_DEADBAND_US) return 0.0f;
    /* Rescale so output starts at 0 just outside the deadband. */
    off += (off > 0) ? -CFG_RC_DEADBAND_US : CFG_RC_DEADBAND_US;
    float v = (float)off / (float)(CFG_RC_HALF_RANGE_US - CFG_RC_DEADBAND_US);
    if (v > 1.0f) v = 1.0f;
    if (v < -1.0f) v = -1.0f;
    return reverse ? -v : v;
}

void rc_input_get(rc_command_t *cmd)
{
    uint16_t ch[IBUS_CHANNELS];
    uint32_t last;

    __disable_irq();
    for (int i = 0; i < IBUS_CHANNELS; i++) ch[i] = s_snapshot[i];
    last = s_last_frame_ms;
    bool have = s_have_frame;
    __enable_irq();

    cmd->link_ok = have && (HAL_GetTick() - last) <= CFG_RC_TIMEOUT_MS;
    if (!cmd->link_ok) {
        cmd->armed = false;
        cmd->left = cmd->right = 0.0f;
        return;
    }
    cmd->armed = ch[CFG_RC_CH_ARM - 1] > CFG_RC_ARM_THRESHOLD_US;
    cmd->left  = stick_to_unit(ch[CFG_RC_CH_LEFT - 1],  CFG_RC_REVERSE_LEFT);
    cmd->right = stick_to_unit(ch[CFG_RC_CH_RIGHT - 1], CFG_RC_REVERSE_RIGHT);
}
