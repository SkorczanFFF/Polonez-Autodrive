import { LAYERS, PALETTE, SUN } from "../config.js";
import { oklchHue } from "./color.js";

/** @param {string} name camelCase */
const toCssName = (name) => `--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/**
 * The scene colors' defaults, by the name setSceneColor gets: `<layer>Solid`, `<layer>Wire`
 * (config.LAYERS), `sunTop`, `sunBottom` (config.SUN).
 *
 * @type {Record<string, string>}
 */
const SCENE_DEFAULTS = Object.fromEntries([
  ...Object.entries(LAYERS).flatMap(([key, layer]) => [
    [`${key}Solid`, layer.solid],
    [`${key}Wire`, layer.wire],
  ]),
  ["sunTop", SUN.top],
  ["sunBottom", SUN.bottom],
]);

/**
 * Exposes a scene color to CSS (`polonezWire` -> `--scene-polonez-wire`), with how far its hue
 * has turned from its default (`--scene-polonez-wire-turn`, oklch degrees), so the UI can wear
 * the scene's current colors: the logo, and the UI tints that take a scene color's hue while
 * keeping their own lightness and chroma (`oklch(from …)` in style.css). The scene GUI calls it
 * on every color change.
 *
 * @param {string} name camelCase, see SCENE_DEFAULTS
 * @param {string} value CSS color
 * @param {HTMLElement} [root]
 */
export function setSceneColor(name, value, root = document.documentElement) {
  root.style.setProperty(toCssName(`scene-${name}`), value);
  const base = SCENE_DEFAULTS[name];
  if (!base) return;
  const turn = oklchHue(value) - oklchHue(base);
  root.style.setProperty(toCssName(`scene-${name}-turn`), turn.toFixed(1));
}

/**
 * Exposes PALETTE (`uiDeep` -> `--palette-ui-deep`) and the starting scene colors (see
 * setSceneColor) as CSS custom properties, so stylesheets never hardcode colors. UI stays hidden
 * until this ran (see the inline style in index.html).
 *
 * @param {HTMLElement} [root]
 */
export function applyTheme(root = document.documentElement) {
  for (const [name, value] of Object.entries(PALETTE)) {
    root.style.setProperty(toCssName(`palette-${name}`), value);
  }
  for (const [name, value] of Object.entries(SCENE_DEFAULTS)) setSceneColor(name, value, root);

  const meta = /** @type {HTMLMetaElement | null} */ (
    document.querySelector('meta[name="theme-color"]')
  );
  if (meta) meta.content = PALETTE.pink;

  root.dataset.theme = "ready";
}
