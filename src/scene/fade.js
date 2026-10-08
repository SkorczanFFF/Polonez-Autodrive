import * as THREE from "three";

/** @typedef {THREE.MeshBasicMaterial | THREE.MeshPhongMaterial} ColoredMaterial */

/**
 * Fades freshly spawned objects in from transparent. Materials are shared between instances, so
 * a fading instance gets its own copies for the duration; they follow the shared material
 * (color and visibility from the GUI) every frame and are swapped back at the end.
 *
 * Copies are pooled, never disposed: a transparent material is a separate shader variant, and
 * disposing the last copy deletes it, so the next spawn would compile it again (a 40-70 ms
 * hitch every spawn).
 *
 * @param {number} duration seconds; 0 disables fading
 */
export function createFadeIn(duration) {
  /**
   * @typedef {object} Fade
   * @property {number} age seconds since the object appeared
   * @property {[THREE.Mesh, ColoredMaterial, ColoredMaterial][]} swaps mesh, shared, own copy
   */

  /** @type {Map<THREE.Object3D, Fade>} */
  const active = new Map();
  /** @type {Map<ColoredMaterial, ColoredMaterial[]>} shared material -> idle copies */
  const pool = new Map();

  /** @param {ColoredMaterial} shared */
  function copyOf(shared) {
    const own = pool.get(shared)?.pop() ?? shared.clone();
    own.transparent = true;
    return own;
  }

  /**
   * @param {Fade} fade
   * @returns {boolean} whether the fade is complete
   */
  function apply(fade) {
    const t = Math.min(fade.age / duration, 1);
    for (const [, shared, own] of fade.swaps) {
      own.opacity = shared.opacity * t;
      own.color.copy(shared.color);
      own.visible = shared.visible;
    }
    return t >= 1;
  }

  /**
   * @param {THREE.Object3D} object
   * @param {Fade} fade
   */
  function finish(object, fade) {
    for (const [mesh, shared, own] of fade.swaps) {
      mesh.material = shared;
      const idle = pool.get(shared);
      if (idle) idle.push(own);
      else pool.set(shared, [own]);
    }
    active.delete(object);
  }

  return {
    /**
     * @param {THREE.Object3D} object
     * @param {number} [age] seconds the object is already "late" (spawned within a long frame)
     */
    start(object, age = 0) {
      if (duration <= 0) return;
      /** @type {Fade["swaps"]} */
      const swaps = [];
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) return;
        const shared = /** @type {ColoredMaterial} */ (child.material);
        const own = copyOf(shared);
        child.material = own;
        swaps.push([child, shared, own]);
      });
      const fade = { age, swaps };
      active.set(object, fade);
      if (apply(fade)) finish(object, fade);
    },

    /** @param {number} dt */
    update(dt) {
      for (const [object, fade] of active) {
        fade.age += dt;
        if (apply(fade)) finish(object, fade);
      }
    },

    /**
     * Ends a fade early (object removed before it finished).
     *
     * @param {THREE.Object3D} object
     */
    stop(object) {
      const fade = active.get(object);
      if (fade) finish(object, fade);
    },

    clear() {
      for (const [object, fade] of active) finish(object, fade);
    },

    get size() {
      return active.size;
    },
  };
}
