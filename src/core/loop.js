import * as THREE from "three";
import { SCENE } from "../config.js";

/** @typedef {(dt: number) => void} Update */

/**
 * The only animation loop in the app. Every moving or timed thing registers an update(dt).
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {() => void} render
 */
export function createLoop(renderer, render) {
  const timer = new THREE.Timer();
  timer.connect(document); // resets the delta after the tab was hidden

  /** @type {Update[]} */
  const updates = [];

  /** @param {number} timestamp */
  function tick(timestamp) {
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), SCENE.maxDelta);
    for (const update of updates) update(dt);
    render();
  }

  return {
    /** @param {Update} update */
    add(update) {
      updates.push(update);
    },
    start() {
      renderer.setAnimationLoop(tick);
    },
  };
}
