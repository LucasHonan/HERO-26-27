/**
 * spark_protocol.h — REV SPARK Flex / SPARK MAX CAN frame encoding.
 *
 * REV does not publish a non-roboRIO CAN spec. These IDs match the
 * community library grayson-arendt/sparkcan and only work with Spark
 * FIRMWARE 24.0.x. Do NOT update the Sparks to 25.x in REV Hardware Client.
 *
 * 29-bit extended ID (FRC CAN layout):
 *   [28:24] device type (2 = motor controller)
 *   [23:16] manufacturer (5 = REV)
 *   [15:10] API class
 *   [ 9: 6] API index
 *   [ 5: 0] device (CAN) ID, 0..62
 * Bus speed: 1 Mbit/s classic CAN.
 */
#ifndef SPARK_PROTOCOL_H
#define SPARK_PROTOCOL_H

#include <stdbool.h>
#include <stdint.h>

#define SPARK_DEVICE_TYPE   2u
#define SPARK_MANUFACTURER  5u

/* (API class, API index) pairs */
#define SPARK_API_DUTY_CYCLE   0u, 2u
#define SPARK_API_VELOCITY     1u, 2u
#define SPARK_API_STATUS0      6u, 0u
#define SPARK_API_STATUS1      6u, 1u
#define SPARK_API_HEARTBEAT    11u, 2u

uint32_t spark_make_id(uint8_t api_class, uint8_t api_index, uint8_t device_id);

/** Device ID field (low 6 bits) of a received frame. */
static inline uint8_t spark_id_device(uint32_t id) { return (uint8_t)(id & 0x3F); }
/** ID with the device field cleared, for comparing frame types. */
static inline uint32_t spark_id_base(uint32_t id) { return id & 0x1FFFFFC0u; }

/** Heartbeat: broadcast (device 0), 8 bytes of 0xFF enables every Spark.
 *  Must be sent at least every 100 ms or the Sparks disable themselves. */
uint32_t spark_heartbeat_id(void);
void spark_pack_heartbeat(uint8_t out[8]);
/* To DISABLE the Sparks, simply stop sending the heartbeat. */

/** Duty-cycle setpoint: float32 little-endian in bytes 0..3, -1..1. */
void spark_pack_duty(uint8_t out[8], float duty);

typedef struct {
    float velocity_rpm;
    uint8_t temperature_c;
    float bus_voltage;
    float output_current;
} spark_status1_t;

/** Parse periodic status 1 (velocity / temp / voltage / current). */
void spark_parse_status1(const uint8_t data[8], spark_status1_t *out);

#endif /* SPARK_PROTOCOL_H */
