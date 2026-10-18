import { createRandom } from "../core/random.js";
import { contrast, hsl, hueDistance, hueOf, luminance } from "./color.js";

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
  const { between, pick } = createRandom(random);
  let roll = random();
  const [mood] = /** @type {[PaletteMood, number]} */ (
    MOODS.find(([, odds]) => (roll -= odds) < 0) ?? MOODS[0]
  );
  const day = mood === "day";
  const base = random();
  const hues = pick(SCHEMES).map((offset) => (base + offset) % 1);
  const anyHue = () => pick(hues);
  const jitter = (/** @type {number} */ hue, /** @type {number} */ amount) =>
    (hue + between(-amount, amount) + 1) % 1;

  const darkFill = () => hsl(jitter(anyHue(), 0.04), between(0.45, 0.85), between(0.05, 0.13));
  const lightFill = () => hsl(jitter(anyHue(), 0.04), between(0.45, 0.8), between(0.72, 0.88));

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
    fog: () => hsl(anyHue(), between(0.75, 1), day ? between(0.6, 0.72) : between(0.3, 0.42)),
    sunTop: () =>
      hsl(jitter(anyHue(), 0.05), between(0.9, 1), day ? between(0.55, 0.65) : between(0.6, 0.72)),
    sunBottom: () => hsl(anyHue(), between(0.9, 1), day ? between(0.42, 0.52) : between(0.5, 0.6)),
    // the night behind the car stays night in every mood, with pale stars and moon
    night: () => hsl(jitter(hues[0], 0.05), between(0.5, 0.8), between(0.03, 0.07)),
    stars: () => hsl(anyHue(), between(0.2, 0.5), between(0.86, 0.95)),
    moon: () => hsl(anyHue(), between(0.3, 0.6), between(0.8, 0.9)),
    // faint scan lines: light at night, dark by day
    crt: () => hsl(anyHue(), between(0.5, 0.8), day ? between(0.3, 0.4) : between(0.75, 0.85)),
  };
}

/** @typedef {Exclude<keyof ReturnType<typeof createRandomPalette>, "mood">} PaletteRole */
