/**
 * rc_input.h — FS-i6X via FS-iA6B i-BUS on USART2.
 * Wire receiver "i-BUS" servo port signal -> PD6 (USART2_RX, Zio CN9).
 * Receiver is powered from 5 V; its i-BUS signal is 3.3 V logic, and PD6
 * is 5 V tolerant anyway. Share ground between receiver and Nucleo.
 */
#ifndef RC_INPUT_H
#define RC_INPUT_H

#include <stdbool.h>

typedef struct {
    bool  link_ok;     /* fresh frames are arriving */
    bool  armed;       /* arm switch on */
    float left;        /* -1..1 after deadband */
    float right;
} rc_command_t;

void rc_input_init(void);
void rc_input_get(rc_command_t *cmd);

/** Called from USART2_IRQHandler. */
void rc_input_uart_irq(void);

#endif /* RC_INPUT_H */
