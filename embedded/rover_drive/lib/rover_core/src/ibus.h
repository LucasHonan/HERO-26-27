/**
 * ibus.h — FlySky i-BUS frame parser (FS-iA6B receiver, 115200 8N1).
 *
 * Frame: 32 bytes = 0x20 0x40, 14 x uint16 little-endian channels (us),
 * then uint16 checksum = 0xFFFF - sum(first 30 bytes).
 *
 * Feed bytes one at a time (from the UART RX interrupt). Pure C, no HAL.
 */
#ifndef IBUS_H
#define IBUS_H

#include <stdbool.h>
#include <stdint.h>

#define IBUS_CHANNELS   14
#define IBUS_FRAME_LEN  32

typedef struct {
    uint8_t  buf[IBUS_FRAME_LEN];
    uint8_t  pos;
    uint16_t channels[IBUS_CHANNELS];
    uint32_t frame_count;    /* increments on every good frame */
    uint32_t error_count;    /* checksum failures */
} ibus_parser_t;

void ibus_init(ibus_parser_t *p);

/** Returns true when this byte completed a valid frame. */
bool ibus_feed(ibus_parser_t *p, uint8_t byte);

/** 1-based channel (1..14). Returns 0 for an out-of-range channel. */
uint16_t ibus_channel(const ibus_parser_t *p, uint8_t ch);

#endif /* IBUS_H */
