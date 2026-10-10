import { MOUNTAINS } from "../config.js";
import { createRidged } from "../core/noise.js";

/**
 * Live mountain settings, shared by the side mountains and the horizon range; the GUI edits
 * them and asks both parts to regenerate.
 *
 * @typedef {{ seed: number, height: number, roughness: number, start: number }} MountainParams
 */

/**
 * @param {number} [seed] random by default, so every visit drives through a new landscape
 * @returns {MountainParams}
 */
export function createMountainParams(seed = Math.floor(Math.random() * 1_000_000)) {
  const { height, roughness, start } = MOUNTAINS;
  return { seed, height, roughness, start };
}

/** @param {number} edge0 @param {number} edge1 @param {number} x */
export const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};

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
    const rise = smoothstep(params.start, params.start + ramp, across);
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
 * stretch of the landscape on top. Along the road it rises from the ground at its front edge to
 * its far ridge, layer behind layer; there is no back slope, as nobody sees it.
 *
 * @param {MountainParams} params
 * @returns {(x: number, z: number) => number} x across (0 = valley centre), z from its far edge
 */
export function createHorizonHeight(params) {
  const ridged = createRidged(params.seed + 1);
  const { lift, scale, octaves } = MOUNTAINS;
  const { halfWidth, depth, height, pass, wall } = MOUNTAINS.horizon;
  return (x, z) => {
    const across = Math.abs(x);
    const rise = smoothstep(pass, pass + wall, across);
    if (rise <= 0) return lift;
    const profile = rise * smoothstep(halfWidth, halfWidth - 64, across);
    const back = 1 - z / depth; // 0 at the front edge, 1 at the far ridge
    const ridge = smoothstep(0, 0.25, back) * (0.3 + 0.7 * back);
    const shape = 0.35 + 0.65 * ridged(x / scale, z / scale + 1000, octaves, params.roughness);
    return lift + params.height * height * profile * ridge * shape;
  };
}
