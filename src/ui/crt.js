import { CRT } from "../config.js";

/**
 * CSS scanline overlay. Settings start from config.CRT; `state` is what the GUI edits, and
 * `apply()` pushes it to CSS custom properties.
 *
 * @param {HTMLElement} [root]
 */
export function createCrt(root = document.getElementById("crt")) {
  const state = { ...CRT };

  function apply() {
    root.hidden = !state.enabled;
    root.dataset.flicker = state.flicker ? "on" : "off";
    root.style.setProperty(
      "--crt-line-color",
      `color-mix(in srgb, ${state.lineColor} ${state.lineOpacity * 100}%, transparent)`,
    );
    root.style.setProperty("--crt-flicker-speed", `${state.flickerSpeed}s`);
    root.style.setProperty("--crt-flicker-intensity", String(state.flickerIntensity));
  }

  apply();
  return { state, apply };
}
