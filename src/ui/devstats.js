import { DEVSTATS, TEXT } from "../config.js";

/** @typedef {import("three").WebGLRenderer["info"]} RenderInfo */

/** renderer.info readers, in display order. */
const ROWS = {
  calls: (/** @type {RenderInfo} */ info) => info.render.calls,
  triangles: (/** @type {RenderInfo} */ info) => info.render.triangles,
  geometries: (/** @type {RenderInfo} */ info) => info.memory.geometries,
  textures: (/** @type {RenderInfo} */ info) => info.memory.textures,
  programs: (/** @type {RenderInfo} */ info) => info.programs?.length ?? 0,
};

/** @param {number} fps */
const fpsLevel = (fps) =>
  fps >= DEVSTATS.fpsGood ? "good" : fps >= DEVSTATS.fpsWarn ? "warn" : "bad";

/**
 * F10 developer overlay ("SYS.MONITOR"). The markup is built once; every DEVSTATS.refresh
 * seconds only the values change. Reads renderer.info of the previous frame.
 *
 * @param {import("three").WebGLRenderer} renderer
 * @param {HTMLElement} [root]
 */
export function createDevStats(renderer, root = document.getElementById("devstats")) {
  const L = TEXT.statsPanel;
  const keys = /** @type {(keyof typeof ROWS)[]} */ (Object.keys(ROWS));

  root.innerHTML = `
    <div class="devstats__header">${L.title}</div>
    <div class="devstats__fps"><span class="devstats__fps-value" data-fps>--</span>${L.fps}</div>
    <dl class="devstats__rows">
      ${keys.map((key) => `<dt>${L[key]}</dt><dd data-stat="${key}">--</dd>`).join("")}
    </dl>`;

  const fpsValue = /** @type {HTMLElement} */ (root.querySelector("[data-fps]"));
  const values = keys.map((key) => ({
    read: ROWS[key],
    element: /** @type {HTMLElement} */ (root.querySelector(`[data-stat="${key}"]`)),
  }));

  let visible = false;
  let frames = 0;
  let elapsed = 0;

  function renderCounters() {
    for (const { read, element } of values) {
      element.textContent = read(renderer.info).toLocaleString();
    }
  }

  /** @param {number} fps */
  function render(fps) {
    fpsValue.textContent = String(fps);
    fpsValue.dataset.level = fpsLevel(fps);
    renderCounters();
  }

  return {
    toggle() {
      visible = !visible;
      root.hidden = !visible;
      frames = 0;
      elapsed = 0;
      if (visible) renderCounters(); // FPS needs a full refresh period to be measured
    },

    /** @param {number} dt */
    update(dt) {
      if (!visible) return;
      frames++;
      elapsed += dt;
      if (elapsed < DEVSTATS.refresh) return;
      render(Math.round(frames / elapsed));
      frames = 0;
      elapsed = 0;
    },
  };
}
