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
 * Developer overlay ("SYS.MONITOR"), toggled with the "stats" action (F10). The markup is in
 * index.html (`data-text` from TEXT.statsPanel, `data-stat` per ROWS reader); every
 * DEVSTATS.refresh seconds only the values change. Reads renderer.info of the previous frame.
 *
 * @param {import("three").WebGLRenderer} renderer
 * @param {Pick<ReturnType<typeof import("../core/input.js").createInput>, "onPress">} input
 * @param {HTMLElement} [root]
 */
export function createDevStats(
  renderer,
  input,
  root = /** @type {HTMLElement} */ (document.getElementById("devstats")),
) {
  const L = TEXT.statsPanel;
  const $$ = (/** @type {string} */ selector) =>
    /** @type {HTMLElement[]} */ ([...root.querySelectorAll(selector)]);
  for (const element of $$("[data-text]")) {
    element.textContent = L[/** @type {keyof typeof L} */ (element.dataset.text)];
  }
  const fpsValue = /** @type {HTMLElement} */ (root.querySelector("[data-fps]"));
  const values = $$("[data-stat]").map((element) => ({
    read: ROWS[/** @type {keyof typeof ROWS} */ (element.dataset.stat)],
    element,
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

  function toggle() {
    visible = !visible;
    root.hidden = !visible;
    frames = 0;
    elapsed = 0;
    if (visible) renderCounters(); // FPS needs a full refresh period to be measured
  }
  input.onPress((action) => action === "stats" && toggle());

  return {
    toggle,

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
