import { MathUtils } from "three";
import { MOUNTAINS } from "../config.js";
import { createRidged } from "../core/noise.js";

/**
 * Live mountain settings, shared by the side mountains and the horizon range; the GUI edits
 * them and asks both parts to regenerate.
 *
 * @typedef {{ seed: number, height: number, roughness: number, start: number }} MountainParams
 */

/** A fresh landscape: every visit drives through a new one. */
export const randomSeed = () => Math.floor(Math.random() * 1_000_000);

/**
 * @param {number} [seed]
 * @returns {MountainParams}
 */
export function createMountainParams(seed = randomSeed()) {
  const { height, roughness, start } = MOUNTAINS;
  return { seed, height, roughness, start };
}

/**
 * Mountain height over the ground at a point of the landscape: flat (MOUNTAINS.lift) up to
 * `start` across the road, then ridged noise under an envelope that rises over `ramp` and keeps
 * growing towards the outer ridge.
 *
 * @param {MountainParams} params
 * @returns {(x: number, s: number) => number} x across the road, s along the landscape
 *   (track coordinate: it slides towards the camera as the world moves)
 */
export function createMountainHeight(params) {
  const ridged = createRidged(params.seed);
  const { lift, ramp, outer, scale, octaves } = MOUNTAINS;
  return (x, s) => {
    const across = Math.abs(x);
    const rise = MathUtils.smoothstep(across, params.start, params.start + ramp);
    if (rise <= 0) return lift;
    const outward = Math.min((across - params.start) / (outer - params.start), 1);
    const envelope = rise * (0.4 + 0.6 * outward);
    return (
      lift + params.height * envelope * ridged(x / scale, s / scale, octaves, params.roughness)
    );
  };
}

/**
 * Height of the static horizon range (MOUNTAINS.horizon) over its own ground, parted like a sea
 * for the road: flat in the pass, steep walls either side, full height out to the side
 * mountains (which grow in front of it), tapering off at its far ends; ridged noise from another
 * stretch of the landscape on top. Along the road it rises from the ground to its far ridge,
 * layer behind layer; there is no back slope, as nobody sees it. Its front is a ragged foot, not
 * an even ramp: where the rock begins varies across it (MOUNTAINS.horizon.foot), it rises in
 * steep faces, and loose crags stand in front of it.
 *
 * @param {MountainParams} params
 * @returns {(x: number, z: number) => number} x across (0 = valley centre), z from its far edge
 */
export function createHorizonHeight(params) {
  const ridged = createRidged(params.seed + 1);
  const { lift, scale, octaves } = MOUNTAINS;
  const { halfWidth, depth, height, pass, wall, foot } = MOUNTAINS.horizon;
  return (x, z) => {
    const across = Math.abs(x);
    const rise = MathUtils.smoothstep(across, pass, pass + wall);
    if (rise <= 0) return lift;
    const profile = rise * (1 - MathUtils.smoothstep(across, halfWidth - 64, halfWidth));
    const back = 1 - z / depth; // 0 at the front edge, 1 at the far ridge
    // where the rock begins: further back in some places than in others
    const start = foot * ridged(x / (scale * 0.5), 77, octaves, params.roughness);
    const ridge = MathUtils.smoothstep(back, start, start + 0.1) * (0.55 + 0.45 * back);
    const shape = 0.35 + 0.65 * ridged(x / scale, z / scale + 1000, octaves, params.roughness);
    // loose crags in front, rising off the ground at the front edge and gone further back
    const crags = ridged(x / (scale * 0.6), z / (scale * 0.6) + 500, octaves, params.roughness);
    const scree =
      0.9 *
      crags ** 2 *
      MathUtils.smoothstep(back, 0, 0.06) *
      (1 - MathUtils.smoothstep(back, 0.2, 0.6));
    return lift + params.height * height * profile * Math.max(ridge * shape, scree);
  };
}
