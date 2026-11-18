/**
 * drive.h — hardware-independent skid-steer drive logic with a hard speed
 * limiter. No HAL calls here, so it builds and unit-tests on a laptop.
 *
 * Commands are normalized: +1.0 = forward at the speed limit, -1.0 = reverse
 * at the speed limit. Nothing that goes in can produce a duty cycle above
 * the ceiling that corresponds to CFG_SPEED_LIMIT_MPH.
 */
#ifndef DRIVE_H
#define DRIVE_H

#include <stdbool.h>
#include <stdint.h>

typedef enum {
    MOTOR_FRONT_LEFT = 0,
    MOTOR_REAR_LEFT,
    MOTOR_FRONT_RIGHT,
    MOTOR_REAR_RIGHT,
    MOTOR_COUNT
} motor_index_t;

/** Measured data coming back from the Spark Flexes (status frame 1). */
typedef struct {
    bool  valid[MOTOR_COUNT];      /* false if stale / never received */
    float motor_rpm[MOTOR_COUNT];  /* signed, as reported by the Spark */
    float bus_voltage[MOTOR_COUNT];
} drive_feedback_t;

/** What the CAN layer should send this cycle. */
typedef struct {
    float duty[MOTOR_COUNT];       /* -1..1, already speed-limited + inverted */
    bool  enable;                  /* false -> stop sending heartbeat */
} drive_output_t;

typedef struct {
    float wheel_rpm_limit;
    float motor_rpm_limit;
    float duty_ceiling;            /* |duty| never exceeds this */
    float governor;                /* 0..1 extra scale-down after overspeed */
    float max_measured_rpm;
    bool  overspeed_tripped;
} drive_status_t;

void drive_init(void);

/* ---- Basic movement API ------------------------------------------------ */
/* speed is 0..1 of the speed limit; values outside are clamped.            */
void drive_forward(float speed);
void drive_backward(float speed);
void drive_turn_left(float speed);   /* spin in place, counter-clockwise */
void drive_turn_right(float speed);  /* spin in place, clockwise */
void drive_stop(void);

/** Direct tank control, each side -1..1. Used by the RC stick mapping. */
void drive_tank(float left, float right);

/** Enable/disable output (arm switch, RC link). Disabling also stops. */
void drive_set_enabled(bool enabled);

/** Clears a latched overspeed trip. Call only when the driver re-arms. */
void drive_clear_fault(void);

/**
 * Run once per control period. Applies ramping, the duty ceiling, the
 * overspeed governor and motor inversion.
 * @param fb    latest motor feedback (may be NULL if none yet)
 * @param dt_s  seconds since the last call
 */
void drive_update(const drive_feedback_t *fb, float dt_s, drive_output_t *out);

const drive_status_t *drive_get_status(void);

/** Pure helpers, exposed for tests. */
float drive_mph_to_wheel_rpm(float mph, float wheel_diameter_in);
float drive_compute_duty_ceiling(float motor_rpm_limit, float kv, float vbus);

#endif /* DRIVE_H */
