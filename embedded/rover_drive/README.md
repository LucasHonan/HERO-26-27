# Rover Drive Firmware (draft)

Skid-steer drive for 4x NEO Vortex + SPARK Flex, controlled by a Nucleo-H755ZI-Q
(Cortex-M7 core) over CAN, driven from a FlySky FS-i6X (tank sticks) over i-BUS.
**Hard speed limit: 5 mph.**

```
FS-i6X ─RF─> FS-iA6B ─i-BUS─> PD6 (USART2_RX)
                                   Nucleo-H755ZI-Q
          PD1 (FDCAN1_TX) ─> CAN transceiver ─CANH/CANL─> Spark Flex 1..4
          PD0 (FDCAN1_RX) <─
```

## Build / test

```bash
pio test -e native                   # logic tests on your laptop
pio run -e nucleo_h755zi_q           # build firmware
pio run -e nucleo_h755zi_q -t upload # flash over on-board ST-LINK
```

All tunables are in [`include/drive_config.h`](include/drive_config.h).

## Code layout

| File | What it does |
|---|---|
| `lib/rover_core/src/drive.c` | forward / backward / turn_left / turn_right / stop / tank, ramping, **speed limiter** |
| `lib/rover_core/src/ibus.c` | FlySky i-BUS frame parser |
| `lib/rover_core/src/spark_protocol.c` | SPARK CAN frame IDs + packing |
| `src/spark_can.c` | FDCAN1 driver (send setpoints/heartbeat, read status) |
| `src/rc_input.c` | USART2 i-BUS input, stick → command, link timeout |
| `src/main.c` | clocks, arming logic, 50 Hz control loop |

## How the 5 mph limit works

1. **Duty ceiling.** Full stick = the duty that spins an unloaded motor at 5 mph
   at the *highest* bus voltage (16.8 V, fully charged 4S). Every output is clamped to this.
2. **Governor.** If any Spark reports a wheel over the limit (e.g. rolling downhill),
   all outputs are scaled down.
3. **Overspeed trip.** >125 % of the limit for 250 ms cuts all motors. The fault stays latched
   until the driver disarms and re-arms.

Under load the rover will go *slower* than 5 mph at full stick (open-loop duty).
Next step: switch to Spark closed-loop velocity mode once PID gains are tuned.

## Hardware setup checklist

- **SPARK firmware must be 24.0.x.** REV has no public non-roboRIO CAN spec. The frames here
  follow the community `sparkcan` library, which does **not** work with firmware 25.x.
  Don't click "update" in REV Hardware Client.
- In REV Hardware Client set CAN IDs 1=FL, 2=RL, 3=FR, 4=RR, motor type = NEO Vortex,
  idle mode = **Brake**, and set a smart current limit.
- CAN transceiver: any 3.3 V part (SN65HVD230, TCAN332, MCP2562 with 3.3 V VIO).
  Use **120 Ω termination at both ends** of the bus. Bus speed is 1 Mbit/s.
- Nucleo power config is **direct SMPS** (factory default). If the board is re-jumpered
  for LDO, change `clock_init()` first or the board will lock up.

### FS-i6X setup
- Mode 2, throttle stick **spring-modded** to self-center.
- *Functions setup → Aux. channels*: **CH5 = SwA** (arm switch).
- *Functions setup → Failsafe*: set CH5 to the **disarmed** position and CH2/CH3 to center.
  Without this, the FS-iA6B keeps sending the last stick values when the signal drops.
  The firmware also stops if i-BUS frames stop for 100 ms.
- Receiver i-BUS servo port signal → PD6, GND → GND, 5 V → 5 V.

### Driving
1. Power up with SwA **off**. Yellow LED = RC link OK.
2. Center both sticks, flip SwA **on**. Green LED = armed. If sticks weren't centered,
   it won't arm; flip SwA off and on again.
3. Left stick = left side, right stick = right side.
4. Red LED = overspeed trip. Flip SwA off/on to clear.

## ⚠️ Gearing

With direct drive on 9" wheels, 5 mph = ~187 wheel RPM, which is **~2.8 % of Vortex free speed**.
The duty ceiling is ≈ **2 %**. Expect very little torque at the wheel, high current, and
possibly no motion under load. A reduction (≈ 20:1–30:1) would put 5 mph in a sane part of the
motor curve. When a gearbox is added, update `CFG_GEAR_RATIO` and nothing else changes.
