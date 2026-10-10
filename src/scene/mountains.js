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
