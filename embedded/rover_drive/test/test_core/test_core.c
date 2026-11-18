/* Host-side unit tests: `pio test -e native` */
#include <unity.h>
#include <math.h>
#include <string.h>

#include "drive.h"
#include "drive_config.h"
#include "ibus.h"
#include "spark_protocol.h"

void setUp(void) { drive_init(); }
void tearDown(void) {}

static drive_output_t run(const drive_feedback_t *fb, int cycles)
{
    drive_output_t out;
    for (int i = 0; i < cycles; i++) drive_update(fb, 0.02f, &out);
    return out;
}

static float max_abs_duty(const drive_output_t *o)
{
    float m = 0;
    for (int i = 0; i < MOTOR_COUNT; i++) if (fabsf(o->duty[i]) > m) m = fabsf(o->duty[i]);
    return m;
}

/* ---- speed limit math -------------------------------------------------- */

void test_5mph_on_9in_wheel_is_about_187_rpm(void)
{
    TEST_ASSERT_FLOAT_WITHIN(0.5f, 186.7f, drive_mph_to_wheel_rpm(5.0f, 9.0f));
}

void test_duty_ceiling_at_full_4s_pack(void)
{
    const drive_status_t *st = drive_get_status();
    float expect = st->motor_rpm_limit / (CFG_MOTOR_KV_RPM_PER_V * CFG_VBUS_MAX_V);
    TEST_ASSERT_FLOAT_WITHIN(1e-5f, expect, st->duty_ceiling);
    TEST_ASSERT_TRUE(st->duty_ceiling > 0.0f && st->duty_ceiling < 0.05f);
}

/* ---- basic moves -------------------------------------------------------- */

void test_disabled_outputs_zero(void)
{
    drive_forward(1.0f);
    drive_output_t o = run(NULL, 100);
    TEST_ASSERT_FALSE(o.enable);
    TEST_ASSERT_EQUAL_FLOAT(0.0f, max_abs_duty(&o));
}

void test_forward_full_hits_ceiling_and_right_is_inverted(void)
{
    drive_set_enabled(true);
    drive_forward(1.0f);
    drive_output_t o = run(NULL, 100);
    float c = drive_get_status()->duty_ceiling;
    TEST_ASSERT_TRUE(o.enable);
    TEST_ASSERT_FLOAT_WITHIN(1e-6f,  c, o.duty[MOTOR_FRONT_LEFT]);
    TEST_ASSERT_FLOAT_WITHIN(1e-6f,  c, o.duty[MOTOR_REAR_LEFT]);
    TEST_ASSERT_FLOAT_WITHIN(1e-6f, -c, o.duty[MOTOR_FRONT_RIGHT]);
    TEST_ASSERT_FLOAT_WITHIN(1e-6f, -c, o.duty[MOTOR_REAR_RIGHT]);
}

void test_backward_and_turns_have_correct_signs(void)
{
    drive_set_enabled(true);
    drive_backward(0.5f);
    drive_output_t o = run(NULL, 100);
    TEST_ASSERT_TRUE(o.duty[MOTOR_FRONT_LEFT] < 0 && o.duty[MOTOR_FRONT_RIGHT] > 0);

    drive_turn_left(0.5f);
    o = run(NULL, 100);   /* left side back, right side forward (inverted -> neg) */
    TEST_ASSERT_TRUE(o.duty[MOTOR_FRONT_LEFT] < 0 && o.duty[MOTOR_FRONT_RIGHT] < 0);

    drive_turn_right(0.5f);
    o = run(NULL, 100);
    TEST_ASSERT_TRUE(o.duty[MOTOR_FRONT_LEFT] > 0 && o.duty[MOTOR_FRONT_RIGHT] > 0);
}

void test_stop_is_immediate(void)
{
    drive_set_enabled(true);
    drive_forward(1.0f);
    run(NULL, 100);
    drive_stop();
    drive_output_t o = run(NULL, 1);
    TEST_ASSERT_EQUAL_FLOAT(0.0f, max_abs_duty(&o));
}

void test_accel_is_ramped(void)
{
    drive_set_enabled(true);
    drive_forward(1.0f);
    drive_output_t o = run(NULL, 1);
    float c = drive_get_status()->duty_ceiling;
    TEST_ASSERT_TRUE(max_abs_duty(&o) < 0.1f * c);
}

/* ---- hard limit can't be beaten ---------------------------------------- */

void test_garbage_input_never_exceeds_ceiling(void)
{
    drive_set_enabled(true);
    float c = drive_get_status()->duty_ceiling;
    float inputs[] = { 1e9f, -1e9f, INFINITY, -INFINITY, NAN, 2.0f };
    for (unsigned i = 0; i < sizeof inputs / sizeof inputs[0]; i++) {
        drive_tank(inputs[i], inputs[i]);
        drive_output_t o = run(NULL, 100);
        TEST_ASSERT_TRUE(max_abs_duty(&o) <= c + 1e-7f);
    }
}

void test_higher_measured_voltage_lowers_ceiling(void)
{
    drive_feedback_t fb = {0};
    for (int i = 0; i < MOTOR_COUNT; i++) { fb.valid[i] = true; fb.bus_voltage[i] = 24.0f; }
    float before = drive_get_status()->duty_ceiling;
    drive_set_enabled(true);
    run(&fb, 1);
    TEST_ASSERT_TRUE(drive_get_status()->duty_ceiling < before);
}

void test_governor_scales_down_when_overspeeding(void)
{
    drive_set_enabled(true);
    drive_forward(1.0f);
    run(NULL, 100);
    float c = drive_get_status()->duty_ceiling;

    drive_feedback_t fb = {0};
    float lim = drive_get_status()->motor_rpm_limit;
    fb.valid[0] = true; fb.motor_rpm[0] = lim * 1.1f;   /* downhill, 10 % over */
    drive_output_t o = run(&fb, 1);
    TEST_ASSERT_TRUE(max_abs_duty(&o) < c * 0.95f);
    TEST_ASSERT_FALSE(drive_get_status()->overspeed_tripped);
}

void test_overspeed_trip_latches_until_cleared(void)
{
    drive_set_enabled(true);
    drive_forward(1.0f);
    drive_feedback_t fb = {0};
    fb.valid[2] = true;
    fb.motor_rpm[2] = -drive_get_status()->motor_rpm_limit * 1.5f;
    drive_output_t o = run(&fb, 20);                /* 400 ms */
    TEST_ASSERT_TRUE(drive_get_status()->overspeed_tripped);
    TEST_ASSERT_FALSE(o.enable);
    TEST_ASSERT_EQUAL_FLOAT(0.0f, max_abs_duty(&o));

    memset(&fb, 0, sizeof fb);                       /* back to normal speed */
    o = run(&fb, 5);
    TEST_ASSERT_FALSE(o.enable);                     /* still latched */

    drive_clear_fault();
    drive_forward(1.0f);
    o = run(&fb, 5);
    TEST_ASSERT_TRUE(o.enable);
}

void test_stale_feedback_is_ignored(void)
{
    drive_set_enabled(true);
    drive_forward(1.0f);
    drive_feedback_t fb = {0};
    fb.valid[0] = false; fb.motor_rpm[0] = 99999.0f;
    drive_output_t o = run(&fb, 100);
    TEST_ASSERT_FLOAT_WITHIN(1e-6f, drive_get_status()->duty_ceiling, o.duty[0]);
}

/* ---- i-BUS -------------------------------------------------------------- */

static void make_frame(uint8_t f[32], const uint16_t ch[14])
{
    f[0] = 0x20; f[1] = 0x40;
    for (int i = 0; i < 14; i++) { f[2 + 2*i] = ch[i] & 0xFF; f[3 + 2*i] = ch[i] >> 8; }
    uint16_t sum = 0xFFFF;
    for (int i = 0; i < 30; i++) sum -= f[i];
    f[30] = sum & 0xFF; f[31] = sum >> 8;
}

void test_ibus_parses_valid_frame_after_garbage(void)
{
    ibus_parser_t p; ibus_init(&p);
    uint16_t ch[14]; for (int i = 0; i < 14; i++) ch[i] = 1000 + i * 50;
    uint8_t f[32]; make_frame(f, ch);

    uint8_t junk[] = { 0x00, 0x20, 0x13, 0xFF, 0x20 };
    for (unsigned i = 0; i < sizeof junk; i++) ibus_feed(&p, junk[i]);
    bool done = false;
    for (int i = 0; i < 32; i++) done = ibus_feed(&p, f[i]);

    TEST_ASSERT_TRUE(done);
    TEST_ASSERT_EQUAL_UINT16(1000, ibus_channel(&p, 1));
    TEST_ASSERT_EQUAL_UINT16(1100, ibus_channel(&p, 3));
    TEST_ASSERT_EQUAL_UINT16(0, ibus_channel(&p, 15));
}

void test_ibus_rejects_bad_checksum(void)
{
    ibus_parser_t p; ibus_init(&p);
    uint16_t ch[14]; for (int i = 0; i < 14; i++) ch[i] = 1500;
    uint8_t f[32]; make_frame(f, ch);
    f[10] ^= 0x01;
    bool done = false;
    for (int i = 0; i < 32; i++) done |= ibus_feed(&p, f[i]);
    TEST_ASSERT_FALSE(done);
    TEST_ASSERT_EQUAL_UINT32(1, p.error_count);
}

/* ---- Spark CAN frames --------------------------------------------------- */

void test_spark_ids_match_known_values(void)
{
    TEST_ASSERT_EQUAL_HEX32(0x02050083, spark_make_id(SPARK_API_DUTY_CYCLE, 3));
    TEST_ASSERT_EQUAL_HEX32(0x02052C80, spark_heartbeat_id());
    TEST_ASSERT_EQUAL_HEX32(0x02051841, spark_make_id(SPARK_API_STATUS1, 1));
}

void test_spark_duty_packing_is_float_le_and_clamped(void)
{
    uint8_t b[8];
    spark_pack_duty(b, 0.5f);
    float f; memcpy(&f, b, 4);
    TEST_ASSERT_EQUAL_FLOAT(0.5f, f);
    spark_pack_duty(b, 7.0f);
    memcpy(&f, b, 4);
    TEST_ASSERT_EQUAL_FLOAT(1.0f, f);
}

void test_spark_status1_parse(void)
{
    uint8_t d[8] = {0};
    float rpm = -123.5f; memcpy(d, &rpm, 4);
    d[4] = 41;
    uint16_t v = (uint16_t)(14.8f * 128);      /* 12 bits */
    uint16_t c = (uint16_t)(10.0f * 32);       /* 12 bits */
    d[5] = v & 0xFF;
    d[6] = (uint8_t)(((v >> 8) & 0x0F) | ((c & 0x0F) << 4));
    d[7] = (uint8_t)(c >> 4);
    spark_status1_t s; spark_parse_status1(d, &s);
    TEST_ASSERT_EQUAL_FLOAT(-123.5f, s.velocity_rpm);
    TEST_ASSERT_EQUAL_UINT8(41, s.temperature_c);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 14.8f, s.bus_voltage);
    TEST_ASSERT_FLOAT_WITHIN(0.05f, 10.0f, s.output_current);
}

int main(void)
{
    UNITY_BEGIN();
    RUN_TEST(test_5mph_on_9in_wheel_is_about_187_rpm);
    RUN_TEST(test_duty_ceiling_at_full_4s_pack);
    RUN_TEST(test_disabled_outputs_zero);
    RUN_TEST(test_forward_full_hits_ceiling_and_right_is_inverted);
    RUN_TEST(test_backward_and_turns_have_correct_signs);
    RUN_TEST(test_stop_is_immediate);
    RUN_TEST(test_accel_is_ramped);
    RUN_TEST(test_garbage_input_never_exceeds_ceiling);
    RUN_TEST(test_higher_measured_voltage_lowers_ceiling);
    RUN_TEST(test_governor_scales_down_when_overspeeding);
    RUN_TEST(test_overspeed_trip_latches_until_cleared);
    RUN_TEST(test_stale_feedback_is_ignored);
    RUN_TEST(test_ibus_parses_valid_frame_after_garbage);
    RUN_TEST(test_ibus_rejects_bad_checksum);
    RUN_TEST(test_spark_ids_match_known_values);
    RUN_TEST(test_spark_duty_packing_is_float_le_and_clamped);
    RUN_TEST(test_spark_status1_parse);
    return UNITY_END();
}
