#include "stm32h7xx_hal.h"
#include "rc_input.h"

void SysTick_Handler(void)
{
    HAL_IncTick();
}

void USART2_IRQHandler(void)
{
    rc_input_uart_irq();
}

/* Any hard fault: spin. No heartbeat -> Sparks disable within 100 ms. */
void HardFault_Handler(void)
{
    for (;;) {}
}
