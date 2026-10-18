/**
 * The minigame's oncoming cars (scene/traffic.js builds them): real dimensions in metres, one
 * entry per model. Model data, not configuration, so it lives next to the code that reads it.
 */

/**
 * @typedef {object} TrafficModel
 * @property {string} label
 * @property {number} width body width
 * @property {{ radius: number, axles: number[] }} wheel axles: x of each axle
 * @property {[number, number][]} profile lower body side outline, x from the rear bumper to the
 *   front, y up from the ground; wheel arches are cut into its bottom edge automatically
 * @property {[number, number][]} cabin greenhouse outline, bottom edge a little below the belt
 *   line (no gap to the body); it narrows to TRAFFIC.roofWidth at the roof
 * @property {{ shape: "round" | "rect", y: number, inset: number, size: number }} lights
 *   headlights on the front: height, inset from the body side, size
 */

/** @type {Record<string, TrafficModel>} */
export const TRAFFIC_MODELS = {
  fiat126p: {
    label: "Fiat 126p",
    width: 1.38,
    wheel: { radius: 0.27, axles: [0.6, 2.44] },
    profile: [
      [0.04, 0.2],
      [3.0, 0.2],
      [3.05, 0.34],
      [3.02, 0.66],
      [2.3, 0.86],
      [0.22, 0.86],
      [0.04, 0.76],
      [0, 0.38],
    ],
    cabin: [
      [0.3, 0.83],
      [2.28, 0.83],
      [1.85, 1.33],
      [0.78, 1.33],
    ],
    lights: { shape: "round", y: 0.58, inset: 0.24, size: 0.08 },
  },
  skoda120: {
    label: "Škoda 120",
    width: 1.62,
    wheel: { radius: 0.29, axles: [0.93, 3.33] },
    profile: [
      [0.05, 0.22],
      [4.1, 0.22],
      [4.16, 0.4],
      [4.14, 0.72],
      [4.0, 0.8],
      [3.0, 0.86],
      [0.7, 0.86],
      [0.05, 0.84],
      [0, 0.45],
    ],
    cabin: [
      [0.85, 0.83],
      [2.95, 0.83],
      [2.45, 1.4],
      [1.2, 1.4],
    ],
    lights: { shape: "rect", y: 0.6, inset: 0.3, size: 0.09 },
  },
};
