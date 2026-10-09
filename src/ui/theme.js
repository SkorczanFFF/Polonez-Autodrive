import { LAYERS, PALETTE, SUN } from "../config.js";

/** @param {string} name camelCase */
const toCssName = (name) => `--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/**
 * Exposes a scene color to CSS (`polonezWire` -> `--scene-polonez-wire`), so the UI can wear the
 * scene's current colors (the logo); the scene GUI calls it on every color change.
 *
 * @param {string} name camelCase: `<layer>Solid`, `<layer>Wire`, `sunTop`, `sunBottom`
 * @param {string} value CSS color
 * @param {HTMLElement} [root]
 */
export function setSceneColor(name, value, root = document.documentElement) {
  root.style.setProperty(toCssName(`scene-${name}`), value);
}

/**
 * Exposes PALETTE (`uiDeep` -> `--ui-deep`) and the starting scene colors (see setSceneColor) as
 * CSS custom properties, so stylesheets never hardcode colors. UI stays hidden until this ran
 * (see `:root[data-theme]` in style.css).
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
