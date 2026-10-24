import { ColorController } from "lil-gui";
import { PICKER, TEXT } from "../config.js";
import { hexToHsv, hsvToHex, parseHex } from "./color.js";

/** @typedef {{ h: number, s: number, v: number }} Hsv */

const clamp = (/** @type {number} */ x, min = 0, max = 1) => Math.min(Math.max(x, min), max);

/** Arrow keys: [x, y], y up. */
/** @type {Record<string, [number, number]>} */
const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };

/**
 * The scene panel's color picker, in place of the browser's own: `<input type="color">` opens a
 * different system dialog on every OS, none of them in the app's look. One picker serves every
 * color control: a saturation / brightness square, a hue strip, the hex code, the palette, and
 * the color it had when opened next to the new one. Every change shows on the scene at once.
 * - mouse and keyboard: a popover beside the panel, at the row's height; a click elsewhere keeps
 *   the color, ESC brings the old one back, ENTER keeps it, arrows move the focused slider;
 * - touch or small screens (core/device.js): a bottom sheet with larger targets; a tap outside
 *   keeps the color, CANCEL brings the old one back.
 * Relies on lil-gui 0.21 internals (`$input`, `$display`, `_callOnFinishChange`), as ui/gui.js.
 *
 * @param {object} options
 * @param {boolean} options.touch
 * @param {MediaQueryList} options.small
 * @param {HTMLElement} options.beside the panel: the popover opens on its left
 */
export function createColorPicker({ touch, small, beside }) {
  const L = TEXT.picker;
  const root = document.createElement("div");
  root.className = "picker";
  root.hidden = true;
  root.innerHTML = `
    <div class="picker__backdrop"></div>
    <div class="picker__dialog panel" role="dialog" aria-labelledby="picker-title">
      <div class="picker__title" id="picker-title"></div>
      <div class="picker__area" role="slider" tabindex="0" aria-label="${L.area}">
        <span class="picker__thumb"></span>
      </div>
      <div class="picker__hue" role="slider" tabindex="0" aria-label="${L.hue}"
        aria-valuemin="0" aria-valuemax="360">
        <span class="picker__thumb"></span>
      </div>
      <div class="picker__row">
        <div class="picker__compare">
          <button type="button" class="picker__previous" title="${L.previous}"
            aria-label="${L.previous}"></button>
          <span class="picker__current" title="${L.current}"></span>
        </div>
        <label class="picker__hex">
          <span aria-hidden="true">#</span>
          <input type="text" maxlength="7" spellcheck="false" autocomplete="off"
            autocapitalize="off" aria-label="${L.hex}" />
        </label>
      </div>
      <div class="picker__swatches" role="group" aria-label="${L.swatches}">
        ${PICKER.swatches
          .map(
            (color) =>
              `<button type="button" class="picker__swatch" data-color="${color}"
                style="background-color: ${color}" title="${color}" aria-label="${color}"></button>`,
          )
          .join("")}
      </div>
      <div class="picker__actions">
        <button type="button" class="button picker__button" data-picker="cancel">${L.cancel}</button>
        <button type="button" class="button button--primary picker__button" data-picker="done">
          ${L.done}
        </button>
      </div>
    </div>`;
  document.body.append(root);

  /** @param {string} selector */
  const $ = (selector) => /** @type {HTMLElement} */ (root.querySelector(selector));
  const dialog = $(".picker__dialog");
  const title = $(".picker__title");
  const area = $(".picker__area");
  const areaThumb = $(".picker__area .picker__thumb");
  const hue = $(".picker__hue");
  const hueThumb = $(".picker__hue .picker__thumb");
  const previous = $(".picker__previous");
  const hexInput = /** @type {HTMLInputElement} */ ($(".picker__hex input"));
  const swatches = /** @type {HTMLElement[]} */ ([...root.querySelectorAll(".picker__swatch")]);

  /** @type {ColorController | null} the control it is open for */
  let controller = null;
  let original = ""; // the color when opened, for CANCEL / ESC
  let hex = "";
  /** @type {Hsv} kept apart from hex, so the hue survives a trip through gray or black */
  let hsv = { h: 0, s: 0, v: 0 };
  let frame = 0;

  /** The control's color, "#rrggbb" (lil-gui keeps it in the hidden color input). */
  const valueOf = (/** @type {ColorController} */ c) => c.$input.value;

  /** @param {string} color */
  function hsvOf(color) {
    const next = hexToHsv(color);
    if (next.s === 0 || next.v === 0) next.h = hsv.h; // no hue of its own: keep the strip still
    if (next.v === 0) next.s = hsv.s;
    return next;
  }

  function render() {
    const { h, s, v } = hsv;
    root.style.setProperty("--picker-hue", hsvToHex(h, 1, 1));
    root.style.setProperty("--picker-color", hex);
    areaThumb.style.left = `${s * 100}%`;
    areaThumb.style.top = `${(1 - v) * 100}%`;
    hueThumb.style.left = `${h * 100}%`;
    area.setAttribute(
      "aria-valuetext",
      `${L.saturation} ${Math.round(s * 100)}%, ${L.brightness} ${Math.round(v * 100)}%`,
    );
    hue.setAttribute("aria-valuenow", String(Math.round(h * 360)));
    if (document.activeElement !== hexInput) hexInput.value = hex.slice(1);
    for (const swatch of swatches) {
      swatch.setAttribute("aria-pressed", String(swatch.dataset.color === hex));
    }
  }

  /** The scene follows at most once a frame: pointers report faster than that. */
  function flush() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (controller && valueOf(controller) !== hex) controller._setValueFromHexString(hex);
  }

  /** @param {Hsv} next */
  function pick(next) {
    hsv = next;
    hex = hsvToHex(next.h, next.s, next.v);
    render();
    if (!frame) frame = requestAnimationFrame(flush);
  }

  /** @param {string} color "#rrggbb" */
  const pickHex = (color) => pick(hsvOf(color));

  /** The color changed from outside (lil-gui's text field, "Randomize all"). */
  function sync() {
    if (!controller || frame) return;
    const value = valueOf(controller);
    if (value === hex) return;
    hsv = hsvOf(value);
    hex = value;
    render();
  }

  const sheet = () => touch || small.matches;

  /** The popover: left of the panel at the row's height; below or above the row if no room. */
  function place() {
    if (!controller) return;
    root.dataset.layout = sheet() ? "sheet" : "popover";
    if (sheet()) {
      dialog.style.removeProperty("left");
      dialog.style.removeProperty("top");
      return;
    }
    const { gap } = PICKER;
    const row = controller.$display.getBoundingClientRect();
    const panel = beside.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = dialog;
    let left = panel.left - width - gap;
    let top = row.top + row.height / 2 - height / 3;
    if (left < gap) {
      left = row.right - width;
      top = row.bottom + gap;
      if (top + height > innerHeight - gap) top = row.top - height - gap;
    }
    dialog.style.left = `${clamp(left, gap, innerWidth - width - gap)}px`;
    dialog.style.top = `${clamp(top, gap, innerHeight - height - gap)}px`;
  }

  /** @param {ColorController} c */
  function open(c) {
    if (controller) close();
    controller = c;
    original = hex = valueOf(c);
    hsv = hexToHsv(hex);
    title.textContent = c._name;
    previous.style.backgroundColor = original;
    c.$display.setAttribute("aria-expanded", "true");
    root.hidden = false;
    render();
    place();
    area.focus({ preventScroll: true });
  }

  /** @param {boolean} [keep] false brings back the color it had when opened */
  function close(keep = true) {
    const c = controller;
    if (!c) return;
    flush();
    if (!keep) c._setValueFromHexString(original);
    controller = null;
    root.hidden = true;
    c.$display.setAttribute("aria-expanded", "false");
    // focus goes back to the page, as after any panel edit (ui/gui.js), so game keys work at once
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && root.contains(focused)) focused.blur();
    /** @type {any} */ (c)._callOnFinishChange();
  }

  /**
   * Pointer drags on a slider: a press jumps there, a drag follows, also outside the slider.
   *
   * @param {HTMLElement} element
   * @param {(x: number, y: number) => void} move both 0..1 across the element
   */
  function drag(element, move) {
    /** @param {PointerEvent} event */
    const at = (event) => {
      const rect = element.getBoundingClientRect();
      move(
        clamp((event.clientX - rect.left) / rect.width),
        clamp((event.clientY - rect.top) / rect.height),
      );
    };
    element.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault(); // no text selection; focus by hand instead
      element.focus({ preventScroll: true });
      element.setPointerCapture(event.pointerId);
      at(event);
    });
    element.addEventListener("pointermove", (event) => {
      if (element.hasPointerCapture(event.pointerId)) at(event);
    });
  }

  /**
   * Arrow keys on a slider, by PICKER.step (Shift: bigStep).
   *
   * @param {HTMLElement} element
   * @param {(dx: number, dy: number) => void} move
   */
  function arrows(element, move) {
    element.addEventListener("keydown", (event) => {
      const arrow = ARROWS[event.key];
      if (!arrow) return;
      event.preventDefault();
      const step = event.shiftKey ? PICKER.bigStep : PICKER.step;
      move(arrow[0] * step, arrow[1] * step);
    });
  }

  drag(area, (x, y) => pick({ h: hsv.h, s: x, v: 1 - y }));
  arrows(area, (dx, dy) => pick({ h: hsv.h, s: clamp(hsv.s + dx), v: clamp(hsv.v + dy) }));
  drag(hue, (x) => pick({ ...hsv, h: x }));
  arrows(hue, (dx, dy) => pick({ ...hsv, h: clamp(hsv.h + dx + dy) }));

  hexInput.addEventListener("focus", () => hexInput.select());
  hexInput.addEventListener("input", () => {
    const color = parseHex(hexInput.value);
    if (color) pickHex(color);
  });
  hexInput.addEventListener("blur", () => (hexInput.value = hex.slice(1)));

  for (const swatch of swatches) {
    swatch.addEventListener("click", () => pickHex(/** @type {string} */ (swatch.dataset.color)));
  }
  previous.addEventListener("click", () => pickHex(original));
  $('[data-picker="cancel"]').addEventListener("click", () => close(false));
  $('[data-picker="done"]').addEventListener("click", () => close());

  // keys stay in the picker (as lil-gui does for its panel): ESC must not leave free ride
  root.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Escape") close(false);
    else if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) close();
  });
  root.addEventListener("keyup", (event) => event.stopPropagation());

  // The sheet closes on the backdrop's click, not on the press: closed on the press, the click
  // would land on whatever lies under the finger. The popover closes on any press elsewhere, so
  // a press on another swatch opens that one right away (its own swatch toggles it, see attach).
  root.querySelector(".picker__backdrop")?.addEventListener("click", () => close());
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!controller || root.dataset.layout !== "popover") return;
      const target = /** @type {Node} */ (event.target);
      if (!dialog.contains(target) && !controller.$display.contains(target)) close();
    },
    true,
  );
  // TAB out of the picker keeps the color, as a click elsewhere (its own swatch toggles it)
  dialog.addEventListener("focusout", (event) => {
    const next = event.relatedTarget;
    if (!controller || !(next instanceof Node)) return;
    if (!dialog.contains(next) && !controller.$display.contains(next)) close();
  });

  addEventListener("resize", place);
  document.addEventListener("scroll", place, true); // the panel scrolls on low screens

  // The on-screen keyboard (the hex field) covers the bottom of the screen: the sheet rises above
  // it. visualViewport shrinks with the keyboard, the layout viewport does not.
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", () => {
    const covered = innerHeight - viewport.height - viewport.offsetTop;
    root.style.setProperty("--picker-keyboard", `${Math.max(0, covered)}px`);
  });

  return {
    /**
     * Opens this picker from a lil-gui color control's swatch instead of the browser's.
     *
     * @param {import("lil-gui").Controller} c
     */
    attach(c) {
      if (!(c instanceof ColorController)) return;
      const display = c.$display;
      c.$input.hidden = true; // still lil-gui's value holder, never clicked
      display.tabIndex = 0;
      display.setAttribute("role", "button");
      display.setAttribute("aria-haspopup", "dialog");
      display.setAttribute("aria-expanded", "false");
      display.setAttribute("aria-labelledby", c.$name.id);
      display.addEventListener("click", () => (controller === c ? close() : open(c)));
      display.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        if (controller === c) close();
        else open(c);
      });
      const updateDisplay = c.updateDisplay.bind(c);
      c.updateDisplay = () => {
        updateDisplay();
        if (controller === c) sync();
        return c;
      };
    },
    close,
  };
}
