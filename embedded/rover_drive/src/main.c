/**
 * Rover drive firmware — Nucleo-H755ZI-Q, Cortex-M7 core.
 *
 * FS-i6X (tank sticks) --i-BUS--> USART2 --> drive logic (5 mph cap)
 *     --> FDCAN1 --> 4x SPARK Flex --> 4x NEO Vortex (skid steer)
 *
 * Safety behaviour:
 *   - Motors only run while the arm switch (SwA / CH5) is ON and fresh
 *     i-BUS frames are arriving.
 *   - Arming only takes effect if both sticks are centred at that moment.
 *   - Lost RC link (>100 ms) or disarm -> duty 0 and the CAN heartbeat stops,
 *     so the Sparks disable themselves even if this MCU then hangs.
 *   - Overspeed trip latches until the driver disarms and re-arms.
 *
 * LEDs: LD1 green = armed, LD2 yellow = RC link OK, LD3 red = fault.
 */
#include "stm32h7xx_hal.h"
#include "drive.h"
#include "drive_config.h"
#include "rc_input.h"
#include "spark_can.h"

static void clock_init(void);
static void led_init(void);
static void fatal(void);

#define LED_GREEN_PORT  GPIOB
#define LED_GREEN_PIN   GPIO_PIN_0
#define LED_YELLOW_PORT GPIOE
#define LED_YELLOW_PIN  GPIO_PIN_1
#define LED_RED_PORT    GPIOB
#define LED_RED_PIN     GPIO_PIN_14

int main(void)
{
    HAL_Init();
    clock_init();
    led_init();

    drive_init();
    rc_input_init();
    if (!spark_can_init()) fatal();

    bool was_armed_switch = false;
    bool armed = false;
    uint32_t last_ms = HAL_GetTick();

    for (;;) {
        spark_can_poll();

        uint32_t now = HAL_GetTick();
        if (now - last_ms < CFG_CONTROL_PERIOD_MS) continue;
        float dt = (float)(now - last_ms) / 1000.0f;
        last_ms = now;

        rc_command_t rc;
        rc_input_get(&rc);

        /* --- Arming state machine -------------------------------------- */
        bool sw = rc.link_ok && rc.armed;
        if (sw && !was_armed_switch) {
            /* Rising edge: only arm with sticks centred. */
            if (rc.left == 0.0f && rc.right == 0.0f) {
                drive_clear_fault();
                armed = true;
            }
        }
        if (!sw) armed = false;
        was_armed_switch = sw;

        drive_set_enabled(armed);
        if (armed) {
            drive_tank(rc.left, rc.right);
        }

        /* --- Limiter + output ------------------------------------------ */
        drive_feedback_t fb;
        spark_can_get_feedback(&fb);

        drive_output_t out;
        drive_update(&fb, dt, &out);
        spark_can_send(&out);

        /* --- Status LEDs ----------------------------------------------- */
        const drive_status_t *st = drive_get_status();
        HAL_GPIO_WritePin(LED_GREEN_PORT, LED_GREEN_PIN, out.enable ? GPIO_PIN_SET : GPIO_PIN_RESET);
        HAL_GPIO_WritePin(LED_YELLOW_PORT, LED_YELLOW_PIN, rc.link_ok ? GPIO_PIN_SET : GPIO_PIN_RESET);
        HAL_GPIO_WritePin(LED_RED_PORT, LED_RED_PIN, st->overspeed_tripped ? GPIO_PIN_SET : GPIO_PIN_RESET);
    }
}

/**
 * 400 MHz SYSCLK from the 8 MHz HSE via PLL1. On the Nucleo the HSE is the
 * ST-LINK's crystal-derived MCO output (HSE bypass) — crystal accuracy is
 * needed for reliable 1 Mbit/s CAN; the internal HSI drifts too much with
 * temperature. PLL1Q = 80 MHz feeds FDCAN.
 *
 * IMPORTANT: the Nucleo-H755ZI-Q ships wired for the internal SMPS
 * ("direct SMPS supply"). If someone re-solders it for LDO, change
 * PWR_DIRECT_SMPS_SUPPLY to PWR_LDO_SUPPLY — the wrong setting can lock the
 * board until it's recovered with BOOT0 + STM32CubeProgrammer.
 */
static void clock_init(void)
{
    HAL_PWREx_ConfigSupply(PWR_DIRECT_SMPS_SUPPLY);
    __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE1);
    while (!__HAL_PWR_GET_FLAG(PWR_FLAG_VOSRDY)) {}

    RCC_OscInitTypeDef osc = {0};
    osc.OscillatorType = RCC_OSCILLATORTYPE_HSE;
    osc.HSEState = RCC_HSE_BYPASS;                /* 8 MHz from ST-LINK MCO */
    osc.PLL.PLLState = RCC_PLL_ON;
    osc.PLL.PLLSource = RCC_PLLSOURCE_HSE;
    osc.PLL.PLLM = 2;                             /* 4 MHz ref */
    osc.PLL.PLLN = 200;                           /* 800 MHz VCO */
    osc.PLL.PLLP = 2;                             /* 400 MHz SYSCLK */
    osc.PLL.PLLQ = 10;                            /* 80 MHz FDCAN */
    osc.PLL.PLLR = 2;
    osc.PLL.PLLRGE = RCC_PLL1VCIRANGE_2;      /* 4-8 MHz */
    osc.PLL.PLLVCOSEL = RCC_PLL1VCOWIDE;
    osc.PLL.PLLFRACN = 0;
    if (HAL_RCC_OscConfig(&osc) != HAL_OK) fatal();

    RCC_ClkInitTypeDef clk = {0};
    clk.ClockType = RCC_CLOCKTYPE_HCLK | RCC_CLOCKTYPE_SYSCLK |
                    RCC_CLOCKTYPE_PCLK1 | RCC_CLOCKTYPE_PCLK2 |
                    RCC_CLOCKTYPE_D3PCLK1 | RCC_CLOCKTYPE_D1PCLK1;
    clk.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
    clk.SYSCLKDivider = RCC_SYSCLK_DIV1;
    clk.AHBCLKDivider = RCC_HCLK_DIV2;            /* 200 MHz */
    clk.APB3CLKDivider = RCC_APB3_DIV2;           /* 100 MHz */
    clk.APB1CLKDivider = RCC_APB1_DIV2;
    clk.APB2CLKDivider = RCC_APB2_DIV2;
    clk.APB4CLKDivider = RCC_APB4_DIV2;
    if (HAL_RCC_ClockConfig(&clk, FLASH_LATENCY_2) != HAL_OK) fatal();
}

static void led_init(void)
{
    __HAL_RCC_GPIOB_CLK_ENABLE();
    __HAL_RCC_GPIOE_CLK_ENABLE();

    GPIO_InitTypeDef g = {0};
    g.Mode = GPIO_MODE_OUTPUT_PP;
    g.Pull = GPIO_NOPULL;
    g.Speed = GPIO_SPEED_FREQ_LOW;
    g.Pin = LED_GREEN_PIN | LED_RED_PIN;
    HAL_GPIO_Init(GPIOB, &g);
    g.Pin = LED_YELLOW_PIN;
    HAL_GPIO_Init(GPIOE, &g);
}

/* Unrecoverable init error: no heartbeat is ever sent, so motors stay off. */
static void fatal(void)
{
    __disable_irq();
    for (;;) {
        HAL_GPIO_TogglePin(LED_RED_PORT, LED_RED_PIN);
        for (volatile uint32_t i = 0; i < 2000000; i++) {}
    }
}
