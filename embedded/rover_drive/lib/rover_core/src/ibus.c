#include "ibus.h"

#include <string.h>

void ibus_init(ibus_parser_t *p)
{
    memset(p, 0, sizeof(*p));
}

bool ibus_feed(ibus_parser_t *p, uint8_t byte)
{
    /* Re-sync on the 2-byte header. */
    if (p->pos == 0 && byte != 0x20) return false;
    if (p->pos == 1 && byte != 0x40) {
        p->pos = (byte == 0x20) ? 1 : 0;
        return false;
    }

    p->buf[p->pos++] = byte;
    if (p->pos < IBUS_FRAME_LEN) return false;
    p->pos = 0;

    uint16_t sum = 0xFFFF;
    for (int i = 0; i < IBUS_FRAME_LEN - 2; i++) sum -= p->buf[i];
    uint16_t rx_sum = (uint16_t)(p->buf[30] | (p->buf[31] << 8));
    if (sum != rx_sum) {
        p->error_count++;
        return false;
    }

    for (int ch = 0; ch < IBUS_CHANNELS; ch++) {
        const uint8_t *b = &p->buf[2 + ch * 2];
        p->channels[ch] = (uint16_t)((b[0] | (b[1] << 8)) & 0x0FFF);
    }
    p->frame_count++;
    return true;
}

uint16_t ibus_channel(const ibus_parser_t *p, uint8_t ch)
{
    if (ch < 1 || ch > IBUS_CHANNELS) return 0;
    return p->channels[ch - 1];
}
