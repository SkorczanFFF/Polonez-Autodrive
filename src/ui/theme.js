import { PALETTE } from "../config.js";

/** @param {string} name camelCase */
const toCssName = (name) => `--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/**
 * Exposes PALETTE as CSS custom properties (`uiDeep` -> `--ui-deep`), so stylesheets never
 * hardcode colors. UI stays hidden until this ran (see `:root[data-theme]` in style.css).
 *
 * @param {HTMLElement} [root]
 */
export function applyTheme(root = document.documentElement) {
  for (const [name, value] of Object.entries(PALETTE)) {
    root.style.setProperty(toCssName(name), value);
  }

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
