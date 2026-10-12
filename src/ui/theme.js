import { LAYERS, PALETTE, SUN } from "../config.js";
import { hsl, hslOf, hueOf, luminance } from "./color.js";

/** @param {string} name camelCase */
const toCssName = (name) => `--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/**
 * UI color families that take their hue from a scene color while keeping their own saturation and
 * brightness (luminance): panels, buttons and the scene GUI wear the scene's palette ("Randomize
 * all" included) and stay just as readable. The turn is measured from the source's default, so the
 * default scene keeps the PALETTE colors.
 *
 * @type {{ source: string, base: string, tokens: (keyof typeof PALETTE)[] }[]}
 */
export const UI_TINTS = [
  // lines, text and panels follow the ground grid
  { source: "terrainWire", base: LAYERS.terrain.wire, tokens: ["aqua", "uiDeep", "uiLoaderBg"] },
  // the primary button, the score and the red of the titles follow the car's lines
  { source: "polonezWire", base: LAYERS.polonez.wire, tokens: ["red", "pink"] },
  // NEW BEST and the yellow of the titles follow the sun
  { source: "sunTop", base: SUN.top, tokens: ["yellow"] },
];

/**
 * `color` with its hue turned as far as from `from` to `to`. Saturation is kept, and the
 * lightness is matched to the original luminance: a yellow is much brighter than a blue of the
 * same HSL lightness, and text on a panel must keep the contrast of the default look.
 *
 * @param {string} color
 * @param {string} from
 * @param {string} to
 * @returns {string} hex
 */
export function turnHue(color, from, to) {
  const turn = hueOf(to) - hueOf(from);
  if (Math.abs(turn) < 1e-6) return color;
  const { h, s } = hslOf(color);
  const hue = (h + turn + 1) % 1;
  const target = luminance(color);
  let [low, high] = [0, 1]; // luminance grows with lightness: bisect for the matching one
  let result = color;
  for (let i = 0; i < 24; i++) {
    const lightness = (low + high) / 2;
    result = hsl(hue, s, lightness);
    if (luminance(result) < target) low = lightness;
    else high = lightness;
  }
  return result;
}

/**
 * Exposes a scene color to CSS (`polonezWire` -> `--scene-polonez-wire`), so the UI can wear the
 * scene's current colors (the logo, UI_TINTS); the scene GUI calls it on every color change.
 *
 * @param {string} name camelCase: `<layer>Solid`, `<layer>Wire`, `sunTop`, `sunBottom`
 * @param {string} value CSS color
 * @param {HTMLElement} [root]
 */
export function setSceneColor(name, value, root = document.documentElement) {
  root.style.setProperty(toCssName(`scene-${name}`), value);
  for (const { source, base, tokens } of UI_TINTS) {
    if (source !== name) continue;
    for (const token of tokens) {
      root.style.setProperty(toCssName(token), turnHue(PALETTE[token], base, value));
    }
  }
}

/**
 * Exposes PALETTE (`uiDeep` -> `--ui-deep`) and the starting scene colors (see setSceneColor) as
 * CSS custom properties, so stylesheets never hardcode colors. UI stays hidden until this ran
 * (see the inline style in index.html).
 *
 * @param {HTMLElement} [root]
 */
export function applyTheme(root = document.documentElement) {
  for (const [name, value] of Object.entries(PALETTE)) {
    root.style.setProperty(toCssName(name), value);
  }
  for (const [key, layer] of Object.entries(LAYERS)) {
    setSceneColor(`${key}Solid`, layer.solid, root);
    setSceneColor(`${key}Wire`, layer.wire, root);
  }
  setSceneColor("sunTop", SUN.top, root);
  setSceneColor("sunBottom", SUN.bottom, root);

  let meta = /** @type {HTMLMetaElement | null} */ (
    document.querySelector('meta[name="theme-color"]')
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
  }
  meta.content = PALETTE.pink;

  root.dataset.theme = "ready";
}
