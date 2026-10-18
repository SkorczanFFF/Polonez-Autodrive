import { ACTIONS } from "../config.js";

/**
 * "Label (KEY)": a label with the key that triggers the action, as the HUD and the scene panel
 * show it.
 *
 * @param {string} label
 * @param {import("../config.js").Action} action
 */
export const withKey = (label, action) => `${label} (${ACTIONS[action].label})`;
