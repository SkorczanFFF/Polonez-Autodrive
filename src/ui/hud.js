import { TEXT } from "../config.js";
import { ICONS, KEY_ICONS } from "./icons.js";

/** @typedef {import("../core/input.js").Action} Action */

/**
 * Called every frame by the game, so it only touches the DOM when something changed.
 *
 * @param {HTMLElement} element
 * @param {string | null} text null hides the element
 * @returns {boolean} whether the text changed
 */
function show(element, text) {
  const hidden = text === null;
  if (element.hidden !== hidden) element.hidden = hidden;
  if (text === null || element.textContent === text) return false;
  element.textContent = text;
  return true;
}

/**
 * Restarts a one-shot CSS animation (class "is-pop"/"is-flash").
 *
 * @param {HTMLElement} element
 * @param {string} className
 */
function replay(element, className) {
  element.classList.remove(className);
  void element.offsetWidth; // force reflow so the animation starts again
  element.classList.add(className);
}

/**
 * Menu, in-game HUD and game-over panel. Visibility per state lives in CSS (`body[data-state]`);
 * texts come from config.TEXT (`data-text`, `data-key` attributes). Buttons carry a
 * `data-action` and feed the same actions as the keyboard.
 *
 * @param {(action: Action) => void} dispatch
 * @param {HTMLElement} [root]
 */
export function createHud(dispatch, root = document.getElementById("hud")) {
  const $ = (/** @type {string} */ selector) =>
    /** @type {HTMLElement} */ (root.querySelector(selector));
  const $$ = (/** @type {string} */ selector) =>
    /** @type {HTMLElement[]} */ ([...root.querySelectorAll(selector)]);

  for (const element of $$("[data-text]")) element.textContent = TEXT[element.dataset.text];
  for (const element of $$("[data-key]")) {
    const key = /** @type {Action} */ (element.dataset.key);
    const icon = KEY_ICONS[key];
    if (icon) {
      element.innerHTML = ICONS[icon];
      element.setAttribute("aria-label", TEXT.keys[key]);
      element.title = TEXT.keys[key];
    } else {
      element.textContent = TEXT.keys[key];
    }
  }

  for (const button of $$("button[data-action]")) {
    button.addEventListener("click", () => {
      button.blur(); // Enter must not "click" it again
      dispatch(/** @type {Action} */ (button.dataset.action));
    });
  }

  const countdown = $(".hud__countdown");
  const scoreboard = $(".hud__scoreboard");
  const score = $("[data-score]");
  const level = $("[data-level]");
  const finalScore = $("[data-final-score]");
  const newBest = $(".hud__new-best");
  const finalBest = $(".hud__final-best");
  const menuBest = $(".hud__best");
  const bestValues = $$("[data-best]");
  const menuToggle = $(".hud__toggle");

  /** @param {boolean} visible */
  function setMenuVisible(visible) {
    document.body.dataset.menu = visible ? "visible" : "hidden";
    const label = `${visible ? TEXT.menuHide : TEXT.menuShow} (${TEXT.keys.menu})`;
    menuToggle.title = label;
    menuToggle.setAttribute("aria-label", label);
    menuToggle.setAttribute("aria-pressed", String(!visible));
  }
  setMenuVisible(true);

  return {
    /** Hides or shows the start menu; the scene and the scene GUI stay usable. */
    toggleMenu() {
      setMenuVisible(document.body.dataset.menu === "hidden");
    },

    /** @param {import("../game/state.js").GameState} state */
    setState(state) {
      document.body.dataset.state = state;
    },

    /** @param {string | null} text null hides the countdown */
    setCountdown(text) {
      if (show(countdown, text)) replay(countdown, "is-pop");
    },

    /** @param {number | null} value null hides the scoreboard */
    setScore(value) {
      scoreboard.hidden = value === null;
      if (value !== null && show(score, String(value))) replay(score, "is-pop");
    },

    /** @param {number} value */
    setLevel(value) {
      if (show(level, String(value)) && value > 1) replay(level, "is-flash");
    },

    /** @param {number} value 0 = no record yet */
    setBest(value) {
      menuBest.hidden = value <= 0;
      for (const element of bestValues) show(element, String(value));
    },

    /**
     * @param {number} value
     * @param {boolean} isNewBest
     */
    showGameOver(value, isNewBest) {
      show(finalScore, String(value));
      replay(finalScore, "is-pop");
      newBest.hidden = !isNewBest;
      finalBest.hidden = isNewBest; // the record is this score
    },
  };
}
