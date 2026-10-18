/**
 * Inline SVG icons drawn with currentColor (see `.icon` in style.css), named by config.ACTIONS.
 * Used instead of Unicode symbols because VT323 has no glyphs for arrows or the return key, so
 * those fell back to a system font.
 */

/** @param {string} paths */
const svg = (paths) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
  /** The menu toggle: an eye; its slash (`.icon__slash`) shows while the menu is hidden (CSS). */
  eye: svg(
    '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />' +
      '<path class="icon__slash" d="M3 3l18 18" />',
  ),
  enter: svg('<path d="M20 4v7a4 4 0 0 1-4 4H5" /><path d="M9 10l-5 5 5 5" />'),
  arrowLeft: svg('<path d="M20 12H4" /><path d="M10 6l-6 6 6 6" />'),
  arrowRight: svg('<path d="M4 12h16" /><path d="M14 6l6 6-6 6" />'),
};
