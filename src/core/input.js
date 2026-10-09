import { KEYS } from "../config.js";

/** @typedef {keyof typeof KEYS} Action */
/** @typedef {(action: Action) => void} ActionListener */

/**
 * Keyboard -> actions (config.KEYS). Everything else (HUD buttons, later touch) feeds the same
 * actions through `dispatch`, so game logic never looks at raw keys.
 *
 * @param {EventTarget} [target]
 */
export function createInput(target = window) {
  /** @type {Map<string, Action>} */
  const actionByCode = new Map();
  for (const [action, codes] of Object.entries(KEYS)) {
    for (const code of codes) actionByCode.set(code, /** @type {Action} */ (action));
  }

  /** @type {Set<Action>} */
  const held = new Set();
  /** @type {Set<ActionListener>} */
  const pressListeners = new Set();
  /** @type {Set<ActionListener>} */
  const releaseListeners = new Set();

  /** @param {Action} action */
  function dispatch(action) {
    for (const listener of pressListeners) listener(action);
  }

  /** @param {Action} action */
  function release(action) {
    if (!held.delete(action)) return;
    for (const listener of releaseListeners) listener(action);
  }

  target.addEventListener("keydown", (/** @type {KeyboardEvent} */ event) => {
    const action = actionByCode.get(event.code);
    if (!action) return;
    event.preventDefault();
    if (event.repeat) return; // OS auto-repeat must not restart presses (v1 bug)
    held.add(action);
    dispatch(action);
  });

  target.addEventListener("keyup", (/** @type {KeyboardEvent} */ event) => {
    const action = actionByCode.get(event.code);
    if (action) release(action);
  });

  // Keys released while the window had no focus would otherwise stay "held".
  target.addEventListener("blur", () => {
    for (const action of [...held]) release(action);
  });

  return {
    dispatch,
    /** @param {Action} action */
    isHeld: (action) => held.has(action),
    /** @param {ActionListener} listener */
    onPress: (listener) => pressListeners.add(listener),
    /** @param {ActionListener} listener */
    onRelease: (listener) => releaseListeners.add(listener),
  };
}
