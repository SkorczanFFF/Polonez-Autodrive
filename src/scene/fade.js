import * as THREE from "three";

/** @typedef {THREE.MeshBasicMaterial | THREE.MeshPhongMaterial | THREE.LineBasicMaterial} ColoredMaterial */

/** @typedef {[THREE.Mesh | THREE.Line, ColoredMaterial, ColoredMaterial][]} Swaps object, shared, own copy */

/** Ease in and out: fades start and settle softly instead of at a constant rate. */
export const smoothstep = (/** @type {number} */ t) => t * t * (3 - 2 * t);

/**
 * Makes objects partly transparent (spawn fade-in, fade-out before removal). Materials are shared
 * between instances, so a fading instance gets its own copies while it is see-through; they
 * follow the shared material (color and visibility from the GUI) every frame and are swapped
 * back once the object is opaque again.
 *
 * Copies are pooled, never disposed: a transparent material is a separate shader variant, and
 * disposing the last copy deletes it, so the next spawn would compile it again (a 40-70 ms
 * hitch every spawn).
 */
export function createFader() {
  /** @type {Map<THREE.Object3D, Swaps>} */
  const active = new Map();
  /** @type {Map<ColoredMaterial, ColoredMaterial[]>} shared material -> idle copies */
  const pool = new Map();

  /** @param {ColoredMaterial} shared */
  function copyOf(shared) {
    const own = pool.get(shared)?.pop() ?? shared.clone();
    own.transparent = true;
    return own;
  }

  /** @param {THREE.Object3D} object */
  function swapIn(object) {
    /** @type {Swaps} */
    const swaps = [];
    object.traverse((child) => {
      const drawable = child instanceof THREE.Mesh || child instanceof THREE.Line; // outlines too
      if (!drawable || Array.isArray(child.material)) return;
      const shared = /** @type {ColoredMaterial} */ (child.material);
      const own = copyOf(shared);
      child.material = own;
      swaps.push([child, shared, own]);
    });
    active.set(object, swaps);
    return swaps;
  }

  /** @param {THREE.Object3D} object */
  function release(object) {
    const swaps = active.get(object);
    if (!swaps) return;
    for (const [mesh, shared, own] of swaps) {
      mesh.material = shared;
      const idle = pool.get(shared);
      if (idle) idle.push(own);
      else pool.set(shared, [own]);
    }
    active.delete(object);
  }

  return {
    /**
     * Sets how opaque an object is: 1 hands the shared materials back, below 1 fades it.
     *
     * @param {THREE.Object3D} object
     * @param {number} opacity 0..1
     */
    set(object, opacity) {
      if (opacity >= 1) {
        release(object);
        return;
      }
      for (const [, shared, own] of active.get(object) ?? swapIn(object)) {
        own.opacity = shared.opacity * opacity;
        own.color.copy(shared.color);
        own.visible = shared.visible;
      }
    },

    /** Restores the shared materials (object removed while fading). */
    release,

    clear() {
      for (const object of [...active.keys()]) release(object);
    },

    get size() {
      return active.size;
    },
  };
}
