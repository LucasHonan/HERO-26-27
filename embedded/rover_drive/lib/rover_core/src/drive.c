/**
 * drive.c — skid-steer mixing + hard 5 mph limiter.
 *
 * The speed limit is enforced in three layers:
 *   1. Duty ceiling (open loop): the duty that would spin an unloaded motor
 *      at exactly the limit, computed at the highest battery voltage. Every
 *      output is clamped to +/- this, no matter what is commanded.
 *   2. Governor (closed loop on encoder RPM): if any wheel is measured over
 *      the limit (e.g. rolling downhill), all outputs are scaled down.
 *   3. Overspeed trip: well over the limit for too long -> cut all motors and
 *      latch a fault until the driver disarms and re-arms.
 */
#include "drive.h"
#include "drive_config.h"

#include <math.h>
#include <stddef.h>

#define INCHES_PER_MILE 63360.0f
#define PI_F            3.14159265f

static struct {
    float target[2];        /* requested left/right, -1..1 */
    float ramped[2];        /* after accel ramp */
    bool  enabled;
    float overspeed_ms;
    drive_status_t st;
} s;

static const uint8_t k_side[MOTOR_COUNT] = { 0, 0, 1, 1 }; /* 0=left 1=right */
static const bool k_invert[MOTOR_COUNT] = {
    CFG_INVERT_FRONT_LEFT, CFG_INVERT_REAR_LEFT,
    CFG_INVERT_FRONT_RIGHT, CFG_INVERT_REAR_RIGHT,
};

static float clampf(float v, float lo, float hi)
{
    if (!(v == v)) return 0.0f;          /* NaN -> 0 */
    return v < lo ? lo : (v > hi ? hi : v);
}

float drive_mph_to_wheel_rpm(float mph, float wheel_diameter_in)
{
    float in_per_min = mph * INCHES_PER_MILE / 60.0f;
    return in_per_min / (PI_F * wheel_diameter_in);
}

float drive_compute_duty_ceiling(float motor_rpm_limit, float kv, float vbus)
{
    if (kv <= 0.0f || vbus <= 0.0f) return 0.0f;
    return clampf(motor_rpm_limit / (kv * vbus), 0.0f, 1.0f);
}

void drive_init(void)
{
    s.target[0] = s.target[1] = 0.0f;
    s.ramped[0] = s.ramped[1] = 0.0f;
    s.enabled = false;
    s.overspeed_ms = 0.0f;

    s.st.wheel_rpm_limit = drive_mph_to_wheel_rpm(CFG_SPEED_LIMIT_MPH,
                                                  CFG_WHEEL_DIAMETER_IN);
    s.st.motor_rpm_limit = s.st.wheel_rpm_limit * CFG_GEAR_RATIO;
    s.st.duty_ceiling = drive_compute_duty_ceiling(s.st.motor_rpm_limit,
                                                   CFG_MOTOR_KV_RPM_PER_V,
                                                   CFG_VBUS_MAX_V);
    s.st.governor = 1.0f;
    s.st.max_measured_rpm = 0.0f;
    s.st.overspeed_tripped = false;
}

void drive_tank(float left, float right)
{
    s.target[0] = clampf(left, -1.0f, 1.0f);
    s.target[1] = clampf(right, -1.0f, 1.0f);
}

void drive_forward(float speed)    { speed = clampf(speed, 0, 1); drive_tank( speed,  speed); }
void drive_backward(float speed)   { speed = clampf(speed, 0, 1); drive_tank(-speed, -speed); }
void drive_turn_left(float speed)  { speed = clampf(speed, 0, 1); drive_tank(-speed,  speed); }
void drive_turn_right(float speed) { speed = clampf(speed, 0, 1); drive_tank( speed, -speed); }

void drive_stop(void)
{
    drive_tank(0.0f, 0.0f);
    s.ramped[0] = s.ramped[1] = 0.0f;   /* stop is immediate, no ramp */
}

void drive_set_enabled(bool enabled)
{
    if (!enabled) drive_stop();
    s.enabled = enabled;
}

void drive_clear_fault(void)
{
    s.st.overspeed_tripped = false;
    s.st.governor = 1.0f;
    s.overspeed_ms = 0.0f;
}

const drive_status_t *drive_get_status(void) { return &s.st; }

/* Allow |value| to grow by at most max_step; shrinking is immediate. */
static float ramp(float current, float target, float max_step)
{
    bool same_dir = (current >= 0.0f) == (target >= 0.0f);
    if (!same_dir) current = 0.0f;               /* reversing: drop to 0 first */
    if (fabsf(target) <= fabsf(current)) return target;
    float step = target - current;
    if (step >  max_step) step =  max_step;
    if (step < -max_step) step = -max_step;
    return current + step;
}

static void update_limits(const drive_feedback_t *fb, float dt_s)
{
    float vbus = CFG_VBUS_MAX_V;
    float max_rpm = 0.0f;

    if (fb != NULL) {
        for (int i = 0; i < MOTOR_COUNT; i++) {
            if (!fb->valid[i]) continue;
            if (fb->bus_voltage[i] > vbus) vbus = fb->bus_voltage[i];
            float r = fabsf(fb->motor_rpm[i]);
            if (r > max_rpm) max_rpm = r;
        }
    }
    s.st.max_measured_rpm = max_rpm;

    /* Layer 1: recompute ceiling if the bus is above what we assumed. */
    s.st.duty_ceiling = drive_compute_duty_ceiling(s.st.motor_rpm_limit,
                                                   CFG_MOTOR_KV_RPM_PER_V, vbus);

    /* Layer 2: governor. */
    float limit = s.st.motor_rpm_limit;
    if (max_rpm > limit && max_rpm > 0.0f) {
        float g = limit / max_rpm;
        if (g < s.st.governor) s.st.governor = g;
    } else {
        s.st.governor += CFG_GOVERNOR_RECOVER_PER_S * dt_s;
        if (s.st.governor > 1.0f) s.st.governor = 1.0f;
    }

    /* Layer 3: overspeed trip. */
    if (max_rpm > limit * CFG_OVERSPEED_TRIP_FACTOR) {
        s.overspeed_ms += dt_s * 1000.0f;
        if (s.overspeed_ms >= (float)CFG_OVERSPEED_TRIP_MS)
            s.st.overspeed_tripped = true;
    } else {
        s.overspeed_ms = 0.0f;
    }
}

void drive_update(const drive_feedback_t *fb, float dt_s, drive_output_t *out)
{
    if (dt_s < 0.0f) dt_s = 0.0f;
    update_limits(fb, dt_s);

    float max_step = CFG_ACCEL_RAMP_PER_S * dt_s;
    for (int side = 0; side < 2; side++)
        s.ramped[side] = ramp(s.ramped[side], s.target[side], max_step);

    bool run = s.enabled && !s.st.overspeed_tripped;
    out->enable = run;

    float ceiling = s.st.duty_ceiling;
    float scale = ceiling * s.st.governor;

    for (int i = 0; i < MOTOR_COUNT; i++) {
        float d = run ? s.ramped[k_side[i]] * scale : 0.0f;
        d = clampf(d, -ceiling, ceiling);     /* final hard clamp */
        out->duty[i] = k_invert[i] ? -d : d;
    }
}
