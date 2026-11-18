#include "spark_protocol.h"

#include <string.h>

uint32_t spark_make_id(uint8_t api_class, uint8_t api_index, uint8_t device_id)
{
    return ((uint32_t)SPARK_DEVICE_TYPE << 24) |
           ((uint32_t)SPARK_MANUFACTURER << 16) |
           ((uint32_t)(api_class & 0x3F) << 10) |
           ((uint32_t)(api_index & 0x0F) << 6) |
           (uint32_t)(device_id & 0x3F);
}

uint32_t spark_heartbeat_id(void)
{
    return spark_make_id(SPARK_API_HEARTBEAT, 0);
}

void spark_pack_heartbeat(uint8_t out[8])
{
    memset(out, 0xFF, 8);
}

void spark_pack_duty(uint8_t out[8], float duty)
{
    if (!(duty == duty)) duty = 0.0f;    /* NaN guard */
    if (duty > 1.0f) duty = 1.0f;
    if (duty < -1.0f) duty = -1.0f;
    memset(out, 0, 8);
    memcpy(out, &duty, sizeof(duty));    /* Cortex-M is little-endian */
}

void spark_parse_status1(const uint8_t d[8], spark_status1_t *out)
{
    memcpy(&out->velocity_rpm, d, sizeof(float));
    out->temperature_c = d[4];
    uint16_t v = (uint16_t)(d[5] | (d[6] << 8));
    uint16_t c = (uint16_t)(d[6] | (d[7] << 8));
    out->bus_voltage = (float)(v & 0x0FFF) / 128.0f;
    out->output_current = (float)(c >> 4) / 32.0f;
}
