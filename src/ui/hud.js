import { TEXT } from "../config.js";

/**
 * Called every frame by the game, so it only touches the DOM when something changed.
 *
 * @param {HTMLElement} element
 * @param {string | null} text null hides the element
 */
function show(element, text) {
  const hidden = text === null;
  if (element.hidden !== hidden) element.hidden = hidden;
  if (text !== null && element.textContent !== text) element.textContent = text;
}

/**
 * In-game overlay. Which elements are visible per state is decided by CSS through
 * `body[data-state]`; this module only fills in text and toggles sub-elements.
 * Buttons carry a `data-action` and feed the same actions as the keyboard.
 *
 * @param {(action: import("../core/input.js").Action) => void} dispatch
 * @param {HTMLElement} [root]
 */
export function createHud(dispatch, root = document.getElementById("hud")) {
  const $ = (/** @type {string} */ selector) =>
    /** @type {HTMLElement} */ (root.querySelector(selector));
  const countdown = $(".hud__countdown");
  const score = $(".hud__score");
  const gameOverScore = $(".hud__gameover-score");

  $('[data-action="start"]').innerHTML = TEXT.promptStart;
  $('[data-action="free"]').innerHTML = TEXT.promptFree;
  $(".hud__exit").innerHTML = TEXT.promptExit;
  $(".hud__gameover-title").textContent = TEXT.gameOver;

  for (const button of root.querySelectorAll("button[data-action]")) {
    button.addEventListener("click", () => {
      /** @type {HTMLButtonElement} */ (button).blur(); // Enter must not "click" it again
      dispatch(
        /** @type {import("../core/input.js").Action} */ (button.getAttribute("data-action")),
      );
    });
  }

  return {
    /** @param {import("../game/state.js").GameState} state */
    setState(state) {
      document.body.dataset.state = state;
    },

    /** @param {string | null} text null hides the countdown */
    setCountdown(text) {
      show(countdown, text);
    },

    /** @param {number | null} value null hides the score */
    setScore(value) {
      show(score, value === null ? null : `${TEXT.score}: ${value}`);
    },

    /** @param {number} value */
    showGameOver(value) {
      gameOverScore.textContent = `${TEXT.score}: ${value}`;
    },
  };
}
