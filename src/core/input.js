import { KEYS } from "../config.js";

/** @typedef {keyof typeof KEYS} Action */
/** @typedef {(action: Action) => void} ActionListener */
/** @typedef {string | number} Holder a key code or a pointer id */

/**
 * Keyboard -> actions (config.KEYS). Everything else (HUD buttons, touch controls) feeds the
 * same actions through `dispatch` and `hold`, so game logic never looks at raw keys.
 *
 * @param {EventTarget} [target]
 */
export function createInput(target = window) {
  /** @type {Map<string, Action>} */
  const actionByCode = new Map();
  for (const [action, codes] of Object.entries(KEYS)) {
    for (const code of codes) actionByCode.set(code, /** @type {Action} */ (action));
  }

  /**
   * Who holds each action: key codes and pointer ids. An action is held while its set is not
   * empty, so two keys for one action, two fingers on one button, or a finger and a key release
   * it only when the last one lets go.
   *
   * @type {Map<Action, Set<Holder>>}
   */
  const holders = new Map();
  /** @type {Set<ActionListener>} */
  const pressListeners = new Set();
  /** @type {Set<ActionListener>} */
  const releaseListeners = new Set();

  /** @param {Action} action */
  function dispatch(action) {
    for (const listener of pressListeners) listener(action);
  }

  /** @param {Action} action */
  function dispatchRelease(action) {
    for (const listener of releaseListeners) listener(action);
  }

  /**
   * @param {Action} action
   * @param {Holder} holder
   */
  function press(action, holder) {
    let set = holders.get(action);
    if (!set) holders.set(action, (set = new Set()));
    const first = set.size === 0;
    set.add(holder);
    if (first) dispatch(action);
  }

  /**
   * @param {Action} action
   * @param {Holder} holder
   */
  function release(action, holder) {
    const set = holders.get(action);
    if (!set?.delete(holder) || set.size > 0) return;
    dispatchRelease(action);
  }

  target.addEventListener("keydown", (/** @type {KeyboardEvent} */ event) => {
    const action = actionByCode.get(event.code);
    if (!action) return;
    event.preventDefault();
    if (event.repeat) return; // OS auto-repeat must not restart presses (v1 bug)
    press(action, event.code);
  });

  target.addEventListener("keyup", (/** @type {KeyboardEvent} */ event) => {
    const action = actionByCode.get(event.code);
    if (action) release(action, event.code);
  });

  // Keys released while the window had no focus would otherwise stay "held".
  target.addEventListener("blur", () => {
    for (const [action, set] of holders) {
      if (set.size === 0) continue;
      set.clear();
      dispatchRelease(action);
    }
  });

  return {
    dispatch,
    /**
     * An on-screen button held like a key (touch steering).
     *
     * @param {Action} action
     * @param {boolean} down
     * @param {Holder} [holder] the pointer id; tells fingers on the same button apart
     */
    hold(action, down, holder = "pointer") {
      if (down) press(action, holder);
      else release(action, holder);
    },
    /** @param {Action} action */
    isHeld: (action) => (holders.get(action)?.size ?? 0) > 0,
    /** @param {ActionListener} listener */
    onPress: (listener) => pressListeners.add(listener),
    /** @param {ActionListener} listener */
    onRelease: (listener) => releaseListeners.add(listener),
  };
}
