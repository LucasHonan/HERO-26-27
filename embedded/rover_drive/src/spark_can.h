/**
 * spark_can.h — FDCAN1 driver for the 4 drive Spark Flexes.
 * Pins: PD0 = FDCAN1_RX, PD1 = FDCAN1_TX (Zio connector CN9), 1 Mbit/s.
 * Needs an external 3.3 V CAN transceiver (e.g. SN65HVD230 / TCAN332).
 */
#ifndef SPARK_CAN_H
#define SPARK_CAN_H

#include <stdbool.h>
#include "drive.h"

bool spark_can_init(void);

/** Send duty setpoints for all motors, plus the heartbeat if enabled. */
void spark_can_send(const drive_output_t *out);

/** Drain the RX FIFO and update per-motor feedback. Call every loop. */
void spark_can_poll(void);

/** Copy latest feedback; entries older than CFG_FEEDBACK_STALE_MS are invalid. */
void spark_can_get_feedback(drive_feedback_t *fb);

#endif /* SPARK_CAN_H */
