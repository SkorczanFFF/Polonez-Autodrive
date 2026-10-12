import * as THREE from "three";

/**
 * Hue schemes for "Randomize all", as offsets from a random base hue (in turns): complementary,
 * triad, split complementary, analogous with an accent. A few related hues read as one palette;
 * colors picked independently read as noise.
 */
const SCHEMES = [
  [0, 1 / 2],
  [0, 1 / 3, 2 / 3],
  [0, 5 / 12, 7 / 12],
  [0, 1 / 12, 1 / 2],
];

/**
 * Contrast (WCAG ratio) a line needs against its fill to stand out: the coloring-book look. 3:1
 * is the WCAG minimum for graphics; it leaves the lines saturated instead of pushing them
 * towards white (on dark fills) or black (on light ones).
 */
export const MIN_LINE_CONTRAST = 3;

/** Lines are brightened (or darkened) up to these lightnesses to reach it, staying colorful. */
const MAX_LINE_LIGHTNESS = 0.85;
const MIN_LINE_LIGHTNESS = 0.12;

/** @param {THREE.ColorRepresentation} color */
const luminance = (color) => {
  const { r, g, b } = new THREE.Color(color); // linear components
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

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

/** Distance between two hues around the color wheel, in turns (0 to 0.5). */
export const hueDistance = (/** @type {number} */ a, /** @type {number} */ b) => {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
};

/** @param {THREE.ColorRepresentation} color */
export const hueOf = (color) =>
  new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace).h;

/**
 * Palette moods, with their odds: "night" is the default look (dark fills, neon lines, dark sky);
 * "day" turns it inside out (light fills, dark lines, light sky); "mixed" flips a coin for every
 * layer.
 *
 * @typedef {"night" | "day" | "mixed"} PaletteMood
 * @type {[PaletteMood, number][]}
 */
const MOODS = [
  ["night", 0.4],
  ["day", 0.3],
  ["mixed", 0.3],
];

/** Fills at least this bright (relative luminance) get dark lines instead of neon ones. */
const LIGHT_FILL = 0.18;

/**
 * A random retrowave palette in one of the MOODS: a few related hues of a scheme, lines in
 * another hue than their fill and always readable against it (neon on dark fills, dark on light
 * ones). Every call of a role gives a new color of that role.
 *
 * @param {() => number} [random] numbers in [0, 1), e.g. seeded in tests
 */
export function createRandomPalette(random = Math.random) {
  const between = (/** @type {number} */ min, /** @type {number} */ max) =>
    min + random() * (max - min);
  let roll = random();
  const [mood] = /** @type {[PaletteMood, number]} */ (
    MOODS.find(([, odds]) => (roll -= odds) < 0) ?? MOODS[0]
  );
  const day = mood === "day";
  const base = random();
  const scheme = SCHEMES[Math.floor(random() * SCHEMES.length)];
  const hues = scheme.map((offset) => (base + offset) % 1);
  /** @param {number[]} list */
  const pick = (list = hues) => list[Math.floor(random() * list.length)];
  const jitter = (/** @type {number} */ hue, /** @type {number} */ amount) =>
    (hue + between(-amount, amount) + 1) % 1;
  const hsl = (/** @type {number} */ h, /** @type {number} */ s, /** @type {number} */ l) =>
    // HSL as seen on screen (sRGB); three.js would read it as linear by default
    `#${new THREE.Color().setHSL(h, s, l, THREE.SRGBColorSpace).getHexString()}`;

  const darkFill = () => hsl(jitter(pick(), 0.04), between(0.45, 0.85), between(0.05, 0.13));
  const lightFill = () => hsl(jitter(pick(), 0.04), between(0.45, 0.8), between(0.72, 0.88));

  return {
    mood,

    /** Model fill: dark at night, light by day, either when mixed. */
    solid: () => (day || (mood === "mixed" && random() < 0.5) ? lightFill() : darkFill()),

    /**
     * Line for a fill, in another hue of the scheme: neon brightened on a dark fill, deep and
     * darkened on a light one, until it stands out.
     *
     * @param {string} fill
     */
    wire(fill) {
      const fillHue = hueOf(fill);
      const others = hues.filter((hue) => hueDistance(hue, fillHue) > 0.12);
      const hue = jitter(pick(others.length > 0 ? others : hues), 0.03);
      const saturation = between(0.85, 1);
      const onLight = luminance(fill) >= LIGHT_FILL;
      const limit = onLight ? MIN_LINE_LIGHTNESS : MAX_LINE_LIGHTNESS;
      let lightness = onLight ? between(0.3, 0.4) : between(0.55, 0.65);
      let color = hsl(hue, saturation, lightness);
      while (contrast(color, fill) < MIN_LINE_CONTRAST && lightness !== limit) {
        // a step towards the limit, never past it
        lightness = onLight ? Math.max(lightness - 0.05, limit) : Math.min(lightness + 0.05, limit);
        color = hsl(hue, saturation, lightness);
      }
      return color;
    },

    sky: () =>
      hsl(
        jitter(hues[0], 0.05),
        between(0.5, 0.8),
        day ? between(0.72, 0.85) : between(0.06, 0.12),
      ),
    // the horizon glow: bright at night, a pastel haze by day
    fog: () => hsl(pick(), between(0.75, 1), day ? between(0.6, 0.72) : between(0.3, 0.42)),
    sunTop: () =>
      hsl(jitter(pick(), 0.05), between(0.9, 1), day ? between(0.55, 0.65) : between(0.6, 0.72)),
    sunBottom: () => hsl(pick(), between(0.9, 1), day ? between(0.42, 0.52) : between(0.5, 0.6)),
    // faint scan lines: light at night, dark by day
    crt: () => hsl(pick(), between(0.5, 0.8), day ? between(0.3, 0.4) : between(0.75, 0.85)),
  };
}

/** @typedef {Exclude<keyof ReturnType<typeof createRandomPalette>, "mood">} PaletteRole */
