#!/usr/bin/env python3
"""
arducam_mega5mp_coverage.py
===========================
HERO 26-27 (Campbell University, NASA HERC 2027, RC division)
STATUS: CANDIDATE ANALYSIS - camera not yet an approved selection.

Question: What can the Arducam Mega 5MP SPI autofocus camera see/resolve when
mounted 12-24 in above the ground, for HERC targets up to 50 ft away?

Pinhole-camera model (no lens distortion), level ground, camera optical axis
pointing straight at the target in azimuth, pitched by TILT_DEG (up = +).

--------------------------------------------------------------------------------
INPUTS AND WHERE THEY COME FROM
--------------------------------------------------------------------------------
Camera (Arducam product page, fetched 2026-09-25):
  Sensor array  2592 x 1944 px, pixel 1.4 um x 1.4 um, optical format 1/4"
  EFL           3.3 mm, F2.0, focus 10 cm - inf (autofocus)
  FOV           68.75 deg diagonal, 50 deg horizontal, 37.5 deg vertical
  JPEG modes    2592x1944 max; lower modes listed (assumed to downscale full FOV)

  ** SOURCE CONFLICT (flagged, not resolved) **
  EFL 3.3 mm / 1.4 um  ->  f = 2357 px  ->  HFOV 57.6, VFOV 44.7, DFOV 69.0 deg
  The EFL agrees with the listed DIAGONAL FOV (68.75) but NOT the listed H/V
  FOV (50 / 37.5), which imply f ~ 2780-2860 px. The script runs both lens
  models. "EFL" is the default because it matches two of three specs and is
  conservative for pixels-on-target. Calibrate the real unit (checkerboard)
  before trusting any distance numbers - an 18 % focal-length error is an
  18 % distance error.

Targets (2027 HERC Handbook, Tasks p.41-42):
  4 ft x 4 ft white board; filled 12 in shape (red circle dia 12, blue square
  12, green equilateral triangle height 12); shapes >= 1 ft above ground;
  targets <= 50 ft from starting point; targets face the start point.
  WORKING ASSUMPTION: shape centred on board; board bottom height is a
  parameter (BOARD_BOTTOM_IN) because the handbook does not fix it.

Detection thresholds - Johnson criteria (1 cycle = 2 px across the target's
critical dimension). Rules of thumb for human observers, NOT guarantees for a
colour-threshold / contour algorithm:
  Detect 1 cycle = 2 px | Recognise 4 cycles = 8 px | Identify 6.4 cycles ~ 13 px
For reliable shape classification by OpenCV contour/approxPolyDP, ~20+ px
across is a common practical floor (WORKING ASSUMPTION - verify on bench).

Distance-by-size (handbook-allowed method):  D = f_px * H_real / h_px
  Quantisation/edge error sigma_px on h_px ->  dD = D * sigma_px / h_px
--------------------------------------------------------------------------------
Usage:  python3 arducam_mega5mp_coverage.py        (needs numpy, matplotlib)
Outputs: console report, arducam_coverage.csv, arducam_pixels_on_shape.png,
         arducam_distance_error.png  (written next to this script)
"""
import csv
import math
import os

import numpy as np

# ============================ USER PARAMETERS ================================
CAM_HEIGHTS_IN = [12, 18, 24]            # lens height above ground, in
DISTANCES_FT = [3, 5, 10, 15, 20, 25, 30, 40, 50]
TILT_DEG = 0.0                           # camera pitch, + = up
BOARD_BOTTOM_IN = [0, 12]                # board bottom edge height, in (unknown)
BOARD_SIZE_IN = 48.0
SHAPE_SIZE_IN = 12.0                     # critical dimension (min of the 3 shapes)
SIGMA_PX = 1.0                           # edge-measurement uncertainty per size estimate
COC_PX = 2.0                             # circle of confusion (px) for DOF calc

SENSOR_W_PX, SENSOR_H_PX = 2592, 1944
PIXEL_UM = 1.4
EFL_MM = 3.3
F_NUMBER = 2.0
DS_HFOV_DEG, DS_VFOV_DEG = 50.0, 37.5

# JPEG output modes: (name, width, height, native px per output px, crop?)
# 4:3 modes assumed to be full-FOV downscales. 1920x1080 assumed to be a
# 1:1 centre crop (typical OV5640 behaviour) - UNVERIFIED for this module.
MODES = [
    ("2592x1944", 2592, 1944),
    ("1600x1200", 1600, 1200),
    ("1024x768", 1024, 768),
    ("640x480", 640, 480),
    ("320x240", 320, 240),
]
JOHNSON = [("Detect", 2.0), ("Recognise", 8.0), ("Identify", 12.8), ("Practical CV", 20.0)]
# ============================================================================


def lens_models():
    """Return focal length in native-sensor pixels (fx, fy) for each lens model."""
    f_efl = EFL_MM * 1000.0 / PIXEL_UM
    fx_ds = (SENSOR_W_PX / 2) / math.tan(math.radians(DS_HFOV_DEG / 2))
    fy_ds = (SENSOR_H_PX / 2) / math.tan(math.radians(DS_VFOV_DEG / 2))
    return {"EFL (3.3 mm)": (f_efl, f_efl), "Datasheet H/V FOV": (fx_ds, fy_ds)}


def fov_deg(f_px, n_px):
    return 2 * math.degrees(math.atan((n_px / 2) / f_px))


def img_y(Y_in, hc_in, d_in, fy, tilt_rad):
    """Image row offset (native px, + = up from centre) of a point at height Y."""
    return fy * math.tan(math.atan2(Y_in - hc_in, d_in) - tilt_rad)


def analyse(fx, fy, hc_in, d_ft, bb_in, scale, out_h_px, out_w_px=SENSOR_W_PX):
    """Per-case geometry. scale = output px / native px."""
    d_in = d_ft * 12.0
    t = math.radians(TILT_DEG)
    half_v = out_h_px / 2  # frame half-height in OUTPUT px
    shape_c = bb_in + BOARD_SIZE_IN / 2
    ys = {k: img_y(Y, hc_in, d_in, fy, t) * scale for k, Y in {
        "board_bot": bb_in, "board_top": bb_in + BOARD_SIZE_IN,
        "shape_bot": shape_c - SHAPE_SIZE_IN / 2, "shape_top": shape_c + SHAPE_SIZE_IN / 2}.items()}
    shape_px_v = ys["shape_top"] - ys["shape_bot"]
    shape_px_h = fx * scale * SHAPE_SIZE_IN / d_in          # horizontal, on-axis
    board_px = ys["board_top"] - ys["board_bot"]
    in_frame = lambda lo, hi: (ys[lo] >= -half_v) and (ys[hi] <= half_v)
    vfov_half = math.atan(half_v / (fy * scale))
    return {
        "shape_px": min(shape_px_v, shape_px_h),
        "board_px": board_px,
        "in_per_px": d_in / (fx * scale),
        "board_in_frame": in_frame("board_bot", "board_top"),
        "shape_in_frame": in_frame("shape_bot", "shape_top"),
        "frame_w_ft": d_ft * out_w_px / (fx * scale),   # = 2 d tan(HFOV/2)
        "frame_lo_in": hc_in + d_in * math.tan(t - vfov_half),
        "frame_hi_in": hc_in + d_in * math.tan(t + vfov_half),
        "dD_board_ft": d_ft * SIGMA_PX / board_px,
        "dD_shape_ft": d_ft * SIGMA_PX / shape_px_v,
    }


def johnson_level(px):
    lvl = "below detect"
    for name, thr in JOHNSON:
        if px >= thr:
            lvl = name
    return lvl


def max_range_ft(f_px_scaled, thr_px):
    return f_px_scaled * SHAPE_SIZE_IN / thr_px / 12.0


def blind_zone_ft(hc_in, vfov_half_rad):
    """Nearest visible ground point (level ground). None if ground not visible."""
    a = vfov_half_rad - math.radians(TILT_DEG)   # angle below horizon of lower frame edge
    return None if a <= 0 else hc_in / math.tan(a) / 12.0


def min_standoff_ft(fy, hc_in, bb_in, scale, out_h_px):
    """Smallest distance (0.1 ft steps) at which the whole board fits vertically."""
    for d10 in range(10, 601):
        d = d10 / 10
        r = analyse(fy, fy, hc_in, d, bb_in, scale, out_h_px)
        if r["board_in_frame"]:
            return d
    return None


def dof_ft(f_px):
    """Hyperfocal distance and near limit when focused at hyperfocal."""
    f_mm = f_px * PIXEL_UM / 1000
    c_mm = COC_PX * PIXEL_UM / 1000
    H_mm = f_mm ** 2 / (F_NUMBER * c_mm) + f_mm
    return H_mm / 304.8, H_mm / 2 / 304.8



def main():
    here = os.path.dirname(os.path.abspath(__file__))
    rows = []
    print("=" * 78)
    print("ARDUCAM MEGA 5MP - HERC TARGET COVERAGE  (CANDIDATE ANALYSIS, pinhole model)")
    print(f"Tilt {TILT_DEG:+.1f} deg | shape {SHAPE_SIZE_IN:.0f} in | board "
          f"{BOARD_SIZE_IN:.0f} in | sigma_px {SIGMA_PX}")
    print("=" * 78)

    for lens, (fx, fy) in lens_models().items():
        print(f"\n### Lens model: {lens}   fx={fx:.0f} px  fy={fy:.0f} px (native)")
        print(f"    HFOV {fov_deg(fx, SENSOR_W_PX):.1f} deg | VFOV {fov_deg(fy, SENSOR_H_PX):.1f} deg")
        H, near = dof_ft(fx)
        print(f"    Hyperfocal (CoC {COC_PX:.0f} px): {H:.1f} ft -> focus there and "
              f"{near:.1f} ft to infinity is sharp; AF not needed beyond ~{near:.0f} ft")
        vhalf = math.atan((SENSOR_H_PX / 2) / fy)
        for hc in CAM_HEIGHTS_IN:
            bz = blind_zone_ft(hc, vhalf)
            print(f"    Cam {hc:>2} in: ground visible from {bz:.1f} ft outward"
                  if bz else f"    Cam {hc:>2} in: ground not in frame at this tilt")

        print("\n  Max range for 12 in shape (on-axis, px across critical dimension):")
        print("  " + f"{'mode':<11}" + "".join(f"{n:>14}" for n, _ in JOHNSON))
        for name, w, h in MODES:
            s = w / SENSOR_W_PX
            print("  " + f"{name:<11}" + "".join(
                f"{min(max_range_ft(fx * s, thr), 999):>11.0f} ft" for _, thr in JOHNSON))

        print("\n  Min standoff for whole 4x4 board in frame (full-res, tilt as set):")
        for bb in BOARD_BOTTOM_IN:
            txt = ", ".join(f"cam {hc} in -> {min_standoff_ft(fy, hc, bb, 1.0, SENSOR_H_PX)} ft"
                            for hc in CAM_HEIGHTS_IN)
            print(f"    board bottom {bb:>2} in: {txt}")

        for name, w, h in MODES:
            s = w / SENSOR_W_PX
            for hc in CAM_HEIGHTS_IN:
                for bb in BOARD_BOTTOM_IN:
                    for d in DISTANCES_FT:
                        r = analyse(fx, fy, hc, d, bb, s, h, w)
                        rows.append({"lens_model": lens, "mode": name, "cam_height_in": hc,
                                     "board_bottom_in": bb, "distance_ft": d,
                                     "shape_px": round(r["shape_px"], 1),
                                     "johnson": johnson_level(r["shape_px"]),
                                     "board_px": round(r["board_px"], 1),
                                     "in_per_px": round(r["in_per_px"], 3),
                                     "frame_width_ft": round(r["frame_w_ft"], 1),
                                     "frame_bottom_in": round(r["frame_lo_in"], 1),
                                     "frame_top_in": round(r["frame_hi_in"], 1),
                                     "shape_in_frame": r["shape_in_frame"],
                                     "board_in_frame": r["board_in_frame"],
                                     "dist_err_board_ft": round(r["dD_board_ft"], 3),
                                     "dist_err_shape_ft": round(r["dD_shape_ft"], 3)})

        # Compact table: full-res + 640x480, board on ground, 12 and 24 in
        for mode in ("2592x1944", "640x480"):
            for hc in (CAM_HEIGHTS_IN[0], CAM_HEIGHTS_IN[-1]):
                bb = BOARD_BOTTOM_IN[0]
                print(f"\n  {mode} | cam {hc} in | board bottom {bb} in")
                print(f"  {'D ft':>5} {'shape px':>9} {'level':>13} {'board px':>9} "
                      f"{'in/px':>6} {'frame W ft':>10} {'frame ht in':>15} {'board?':>7} "
                      f"{'+-D board':>10} {'+-D shape':>10}")
                for r in rows:
                    if (r["lens_model"], r["mode"], r["cam_height_in"], r["board_bottom_in"]) != (lens, mode, hc, bb):
                        continue
                    print(f"  {r['distance_ft']:>5} {r['shape_px']:>9.1f} {r['johnson']:>13} "
                          f"{r['board_px']:>9.1f} {r['in_per_px']:>6.2f} {r['frame_width_ft']:>10.1f} "
                          f"{r['frame_bottom_in']:>7.0f}-{r['frame_top_in']:<7.0f} "
                          f"{'yes' if r['board_in_frame'] else 'CUT':>7} "
                          f"{r['dist_err_board_ft']:>9.2f}' {r['dist_err_shape_ft']:>9.2f}'")

    csv_path = os.path.join(here, "arducam_coverage.csv")
    with open(csv_path, "w", newline="") as fh:
        wr = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        wr.writeheader()
        wr.writerows(rows)
    print(f"\nCSV written: {csv_path}")
    make_plots(here)


def make_plots(here):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib not installed - skipping plots")
        return
    INK, INK2, GRID, SURF = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb"
    SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"]
    fx, fy = lens_models()["EFL (3.3 mm)"]
    d = np.linspace(3, 50, 300)
    plot_modes = MODES[:4]

    def style(ax, title, ylabel):
        ax.set_facecolor(SURF)
        ax.set_title(title, loc="left", color=INK, fontsize=12, fontweight="bold")
        ax.set_xlabel("Distance to target (ft)", color=INK2)
        ax.set_ylabel(ylabel, color=INK2)
        ax.grid(True, color=GRID, lw=0.8)
        for s in ("top", "right"):
            ax.spines[s].set_visible(False)
        for s in ("left", "bottom"):
            ax.spines[s].set_color(GRID)
        ax.tick_params(colors=INK2)

    # 1) Pixels across the 12 in shape
    fig, ax = plt.subplots(figsize=(9, 5.5), facecolor=SURF)
    for (name, w, _), c in zip(plot_modes, SERIES):
        px = fx * (w / SENSOR_W_PX) * SHAPE_SIZE_IN / (d * 12)
        ax.plot(d, px, color=c, lw=2, label=name)
    for lab, thr in JOHNSON:
        ax.axhline(thr, color=INK2, lw=1, ls="--")
        ax.text(50.3, thr, lab, va="center", fontsize=8, color=INK2)
    ax.set_yscale("log")
    ax.set_xlim(3, 50)
    style(ax, "Pixels across the 12 in shape vs distance (EFL lens model, on-axis)",
          "Pixels across shape (log scale)")
    ax.legend(title="JPEG mode", frameon=False, loc="upper right")
    fig.tight_layout()
    fig.savefig(os.path.join(here, "arducam_pixels_on_shape.png"), dpi=150)

    # 2) Distance-estimation uncertainty from +-SIGMA_PX (full resolution)
    fig, ax = plt.subplots(figsize=(9, 5.5), facecolor=SURF)
    for (lab, H), c in zip([("Using 48 in board height", BOARD_SIZE_IN),
                            ("Using 12 in shape height", SHAPE_SIZE_IN)], SERIES):
        err = d * SIGMA_PX / (fy * H / (d * 12))
        ax.plot(d, err, color=c, lw=2, label=lab)
        ax.annotate(f"{err[-1]:.2f} ft", (d[-1], err[-1]), xytext=(-4, 6),
                    textcoords="offset points", ha="right", fontsize=9, color=INK)
    style(ax, f"Distance-by-size error from +-{SIGMA_PX:g} px edge error (2592x1944, EFL model)",
          "Distance uncertainty (ft)")
    ax.set_xlim(3, 50)
    ax.set_ylim(bottom=0)
    ax.legend(frameon=False, loc="upper left")
    ax.text(3.3, ax.get_ylim()[1] * 0.72,
            "Excludes focal-length calibration error:\n"
            "EFL vs datasheet FOV disagree by ~18 %", fontsize=8, color=INK2)
    fig.tight_layout()
    fig.savefig(os.path.join(here, "arducam_distance_error.png"), dpi=150)
    print("Plots written: arducam_pixels_on_shape.png, arducam_distance_error.png")


if __name__ == "__main__":
    main()
