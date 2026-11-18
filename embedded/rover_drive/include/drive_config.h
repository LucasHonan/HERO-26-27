/**
 * drive_config.h — every tunable number for the drive system lives here.
 *
 * Change values here, not in the .c files.
 */
#ifndef DRIVE_CONFIG_H
#define DRIVE_CONFIG_H

/* ------------------------------------------------------------------------ */
/* Speed limit                                                              */
/* ------------------------------------------------------------------------ */

/** Hard ground-speed limit. Full stick = this speed (at no load). */
#define CFG_SPEED_LIMIT_MPH        5.0f

/** If any wheel exceeds the limit by this factor for CFG_OVERSPEED_TRIP_MS,
 *  all motors are cut and the fault latches until the driver disarms. */
#define CFG_OVERSPEED_TRIP_FACTOR  1.25f
#define CFG_OVERSPEED_TRIP_MS      250u

/** How fast the governor gives back authority after an overspeed (per s). */
#define CFG_GOVERNOR_RECOVER_PER_S 0.5f

/* ------------------------------------------------------------------------ */
/* Drivetrain geometry                                                      */
/* ------------------------------------------------------------------------ */

#define CFG_WHEEL_DIAMETER_IN      9.0f

/** Motor revolutions per wheel revolution. 1.0 = direct drive (no gearbox).
 *  NOTE: at 1:1 the 5 mph cap is ~187 wheel RPM ≈ 2.8 % of Vortex free
 *  speed. A reduction gearbox is strongly recommended — just change this. */
#define CFG_GEAR_RATIO             1.0f

/* ------------------------------------------------------------------------ */
/* Motor + battery                                                          */
/* ------------------------------------------------------------------------ */

/** NEO Vortex: 6784 RPM free speed at 12 V  ->  ~565 RPM per volt. */
#define CFG_MOTOR_KV_RPM_PER_V     (6784.0f / 12.0f)

/** Worst-case (highest) bus voltage. 4S LiPo fully charged = 4 x 4.2 V.
 *  The duty ceiling is computed from this so a fresh pack can't exceed the
 *  limit. If the Sparks report a higher voltage, that is used instead. */
#define CFG_VBUS_MAX_V             16.8f

/* ------------------------------------------------------------------------ */
/* Spark Flex CAN IDs (set with REV Hardware Client, firmware 24.x!)        */
/* ------------------------------------------------------------------------ */

#define CFG_CAN_ID_FRONT_LEFT      1
#define CFG_CAN_ID_REAR_LEFT       2
#define CFG_CAN_ID_FRONT_RIGHT     3
#define CFG_CAN_ID_REAR_RIGHT      4

/** Right-side motors face the opposite way, so they spin backwards for
 *  "forward". Flip these if a wheel runs the wrong way on the bench. */
#define CFG_INVERT_FRONT_LEFT      0
#define CFG_INVERT_REAR_LEFT       0
#define CFG_INVERT_FRONT_RIGHT     1
#define CFG_INVERT_REAR_RIGHT      1

/* ------------------------------------------------------------------------ */
/* Driver feel                                                              */
/* ------------------------------------------------------------------------ */

/** Max rate a command can INCREASE in magnitude (full-scale per second).
 *  Slowing down / stopping is always immediate. */
#define CFG_ACCEL_RAMP_PER_S       2.0f

/* ------------------------------------------------------------------------ */
/* FlySky FS-i6X over i-BUS (FS-iA6B receiver, servo port "i-BUS")          */
/* ------------------------------------------------------------------------ */

/** i-BUS channel numbers are 1-based, matching the transmitter display.
 *  Mode 2 defaults: CH2 = right stick vertical, CH3 = left stick vertical.
 *  CH5 must be assigned to switch SwA (Functions setup -> Aux. channels). */
#define CFG_RC_CH_LEFT             3
#define CFG_RC_CH_RIGHT            2
#define CFG_RC_CH_ARM              5

/** Set to 1 if pushing the stick forward makes that side go backward. */
#define CFG_RC_REVERSE_LEFT        0
#define CFG_RC_REVERSE_RIGHT       0

#define CFG_RC_CENTER_US           1500
#define CFG_RC_HALF_RANGE_US       500
/** Stick deadband around center, microseconds. Generous because the
 *  throttle stick is spring-modded and may not return exactly to 1500. */
#define CFG_RC_DEADBAND_US         40
/** Arm switch reads above this = armed. */
#define CFG_RC_ARM_THRESHOLD_US    1700
/** No valid i-BUS frame for this long = failsafe (stop + disable). */
#define CFG_RC_TIMEOUT_MS          100u

/* ------------------------------------------------------------------------ */
/* Loop timing                                                              */
/* ------------------------------------------------------------------------ */

#define CFG_CONTROL_PERIOD_MS      20u   /* 50 Hz setpoints + heartbeat */
/** Motor feedback older than this is ignored by the governor. */
#define CFG_FEEDBACK_STALE_MS      200u

#endif /* DRIVE_CONFIG_H */
