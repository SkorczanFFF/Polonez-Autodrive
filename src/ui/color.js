import * as THREE from "three";

/**
 * Color math for the UI and the random palettes, in sRGB as seen on screen. It never reads a
 * THREE.Color's r/g/b as linear: the app turns three's ColorManagement off (main.js),
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

/**
 * Hue in oklch, degrees (0..360): a turn of this hue keeps the perceived lightness and chroma,
 * which is what CSS `oklch(from …)` does with it (ui/theme.js).
 *
 * @param {THREE.ColorRepresentation} color
 */
export function oklchHue(color) {
  const hex = new THREE.Color(color).getHex();
  const [r, g, b] = [16, 8, 0].map((shift) => toLinear(((hex >> shift) & 255) / 255));
  // linear sRGB -> LMS (cube roots) -> oklab a, b (Ottosson)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return (THREE.MathUtils.radToDeg(Math.atan2(bb, a)) + 360) % 360;
}

/** Distance between two hues around the color wheel, in turns (0 to 0.5). */
export const hueDistance = (/** @type {number} */ a, /** @type {number} */ b) => {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
};

/**
 * HSV to hex, sRGB: what the color picker's square (saturation, brightness) and hue strip show.
 *
 * @param {number} h hue, 0..1 (1 is red again)
 * @param {number} s saturation, 0..1
 * @param {number} v value (brightness), 0..1
 * @returns {string} hex
 */
export function hsvToHex(h, s, v) {
  /** @param {number} n */
  const channel = (n) => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const byte = (/** @type {number} */ c) =>
    Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${byte(channel(5))}${byte(channel(3))}${byte(channel(1))}`;
}

/**
 * Hex to HSV, sRGB; the inverse of hsvToHex. Grays and black have no hue: theirs is 0.
 *
 * @param {THREE.ColorRepresentation} color
 * @returns {{ h: number, s: number, v: number }} each 0..1
 */
export function hexToHsv(color) {
  const hex = new THREE.Color(color).getHex();
  const [r, g, b] = [16, 8, 0].map((shift) => ((hex >> shift) & 255) / 255);
  const max = Math.max(r, g, b);
  const range = max - Math.min(r, g, b);
  let h = 0;
  if (range) {
    if (max === r) h = ((g - b) / range + 6) % 6;
    else if (max === g) h = (b - r) / range + 2;
    else h = (r - g) / range + 4;
  }
  return { h: h / 6, s: max ? range / max : 0, v: max };
}

/**
 * A typed or pasted hex color, with or without the "#", 3 or 6 digits, as "#rrggbb"; null while
 * it is not one (yet).
 *
 * @param {string} text
 */
export function parseHex(text) {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? match[1].replace(/./g, "$&$&") : match[1];
  return `#${digits.toLowerCase()}`;
}
