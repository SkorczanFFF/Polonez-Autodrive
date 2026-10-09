/**
 * localStorage helpers that never throw: storage can be blocked, full or missing (private
 * windows, previews), and the app must work the same without it.
 */

/**
 * @param {string} key
 * @param {number} [fallback]
 */
export function loadNumber(key, fallback = 0) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {number} value
 */
export function saveNumber(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignored: the value simply won't survive a reload
  }
}
