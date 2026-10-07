import { TEXT } from "../config.js";

/** Seconds between refreshes of the overlay. */
const REFRESH = 1;

/**
 * F10 performance overlay. Reads renderer.info of the previous frame and refreshes once per
 * second instead of rebuilding the DOM every frame (v1).
 *
 * @param {import("three").WebGLRenderer} renderer
 * @param {HTMLElement} [root]
 */
export function createDevStats(renderer, root = document.getElementById("devstats")) {
  let visible = false;
  let frames = 0;
  let elapsed = 0;

  /** @param {number} fps */
  function render(fps) {
    const { render: r, memory, programs } = renderer.info;
    const rows = [
      [TEXT.stats.fps, fps],
      [TEXT.stats.calls, r.calls],
      [TEXT.stats.triangles, r.triangles],
      [TEXT.stats.geometries, memory.geometries],
      [TEXT.stats.textures, memory.textures],
      [TEXT.stats.programs, programs?.length ?? 0],
    ];
    root.innerHTML =
      `<div class="devstats__title">${TEXT.stats.title}</div><table>` +
      rows
        .map(([label, value]) => `<tr><td>${label}</td><td>${value.toLocaleString()}</td></tr>`)
        .join("") +
      "</table>";
  }

  return {
    toggle() {
      visible = !visible;
      root.hidden = !visible;
      frames = 0;
      elapsed = 0;
      if (visible) render(0);
    },

    /** @param {number} dt */
    update(dt) {
      if (!visible) return;
      frames++;
      elapsed += dt;
      if (elapsed < REFRESH) return;
      render(Math.round(frames / elapsed));
      frames = 0;
      elapsed = 0;
    },
  };
}
