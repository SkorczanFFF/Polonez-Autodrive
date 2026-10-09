/** Frame rate the v1 per-frame constants were tuned for. */
const REFERENCE_FPS = 60;

/**
 * How many reference frames fit in dt. Multiply per-frame constants by it.
 *
 * @param {number} dt seconds
 */
export function frames(dt) {
  return dt * REFERENCE_FPS;
}

/**
 * Frame-rate independent factor for `value += (target - value) * k`, where k was tuned per
 * reference frame. Equals k at 60 Hz.
 *
 * @param {number} k easing factor per reference frame (0..1)
 * @param {number} dt seconds
 */
export function perFrame(k, dt) {
  return 1 - Math.pow(1 - k, frames(dt));
}
