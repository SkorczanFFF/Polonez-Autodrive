import * as THREE from "three";

/**
 * Color math for the UI and the random palettes, in sRGB as seen on screen. It never reads a
 * THREE.Color's r/g/b as linear: the app turns three's ColorManagement off (core/renderer.js),
 * and then those hold sRGB values. Hex in, hex out, the same with ColorManagement on or off.
 */

/** @param {number} channel sRGB, 0..1 */
const toLinear = (channel) =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/**
 * Relative luminance (WCAG), 0 (black) to 1 (white).
 *
 * @param {THREE.ColorRepresentation} color
 */
export function luminance(color) {
  const hex = new THREE.Color(color).getHex();
  const [r, g, b] = [16, 8, 0].map((shift) => toLinear(((hex >> shift) & 255) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio, 1 (same) to 21 (black on white).
 *
 * @param {THREE.ColorRepresentation} a
 * @param {THREE.ColorRepresentation} b
 */
export function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** @param {THREE.ColorRepresentation} color */
export const hslOf = (color) =>
  new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);

/** @param {THREE.ColorRepresentation} color */
export const hueOf = (color) => hslOf(color).h;

/**
 * @param {number} h 0..1
 * @param {number} s 0..1
 * @param {number} l 0..1
 * @returns {string} hex
 */
export const hsl = (h, s, l) =>
  `#${new THREE.Color().setHSL(h, s, l, THREE.SRGBColorSpace).getHexString()}`;

/** Distance between two hues around the color wheel, in turns (0 to 0.5). */
export const hueDistance = (/** @type {number} */ a, /** @type {number} */ b) => {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
};
