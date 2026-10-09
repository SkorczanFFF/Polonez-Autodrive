import * as THREE from "three";
import { LOADER, TEXT } from "../config.js";

/**
 * Text progress bar, e.g. `LOADING: [=====               ] 25%`.
 *
 * @param {number} loaded
 * @param {number} total
 * @param {number} [barLength]
 */
export function formatProgress(loaded, total, barLength = LOADER.barLength) {
  const ratio = total > 0 ? Math.min(loaded / total, 1) : 0;
  const filled = Math.floor(ratio * barLength);
  const bar = "=".repeat(filled) + " ".repeat(barLength - filled);
  return `${TEXT.loading}: [${bar}] ${Math.floor(ratio * 100)}%`;
}

/** @param {string} url */
const fileName = (url) => url.split("/").pop().toUpperCase();

/** @param {number[]} range [min, max] */
const randomIn = ([min, max]) => min + Math.random() * (max - min);

/**
 * 80s terminal loading screen driven by a THREE.LoadingManager. Typing and removal run on the
 * main loop (`update`), so there are no timers and no reliance on CSS events.
 *
 * @param {HTMLElement} [root]
 */
export function createLoader(root = document.getElementById("loader")) {
  const $ = (/** @type {string} */ selector) => root.querySelector(selector);
  const text = $(".loader__text");
  const progress = $(".loader__progress");
  const status = $(".loader__status");

  $(".loader__header").textContent = TEXT.loaderHeader;
  text.textContent = TEXT.loaderIntro;
  progress.textContent = formatProgress(0, 0);
  root.style.setProperty("--loader-fade-delay", `${LOADER.fadeDelay}s`);
  root.style.setProperty("--loader-fade-duration", `${LOADER.fadeDuration}s`);

  const manager = new THREE.LoadingManager();
  manager.onProgress = (url, loaded, total) => {
    progress.textContent = formatProgress(loaded, total);
    status.textContent = `${TEXT.loading}: ${fileName(url)}`;
  };
  manager.onError = (url) => {
    status.textContent = `${TEXT.loaderError}: ${fileName(url)}`;
  };

  /** @type {"loading" | "fading" | "removed" | "failed"} */
  let state = "loading";
  let messageIndex = 0;
  let charIndex = 0;
  let wait = 0;
  let fadeLeft = 0;

  function typeNext() {
    const message = TEXT.loaderMessages[messageIndex];
    if (charIndex < message.length) {
      charIndex++;
      text.textContent = message.slice(0, charIndex);
      wait += randomIn(LOADER.typeDelay);
    } else {
      messageIndex = (messageIndex + 1) % TEXT.loaderMessages.length;
      charIndex = 0;
      wait += LOADER.messagePause;
    }
  }

  return {
    manager,

    /** @param {number} dt */
    update(dt) {
      if (state === "loading") {
        wait -= dt;
        while (wait <= 0) typeNext();
      } else if (state === "fading") {
        fadeLeft -= dt;
        if (fadeLeft <= 0) {
          root.remove();
          state = "removed";
        }
      }
    },

    /** Shows "ready", fades out (CSS transition) and removes itself once the fade is over. */
    finish() {
      state = "fading";
      fadeLeft = LOADER.fadeDelay + LOADER.fadeDuration;
      status.textContent = TEXT.loaderReady;
      progress.textContent = formatProgress(1, 1);
      root.classList.add("is-done");
    },

    /** @param {string} message */
    fail(message) {
      state = "failed";
      status.textContent = message;
    },
  };
}
