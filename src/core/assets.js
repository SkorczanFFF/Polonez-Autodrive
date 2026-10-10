import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

/**
 * @typedef {object} Manifest
 * @property {Record<string, string>} [models] key -> FBX url
 * @property {Record<string, string>} [textures] key -> image url
 */

/**
 * Loads every asset exactly once through a single LoadingManager.
 *
 * @param {Manifest} manifest
 * @param {THREE.LoadingManager} [manager] pass one in to observe progress
 * @returns {Promise<{ models: Record<string, THREE.Group>, textures: Record<string, THREE.Texture> }>}
 */
export async function loadAssets(manifest, manager = new THREE.LoadingManager()) {
  const [models, textures] = await Promise.all([
    loadAll(new FanFBXLoader(manager), manifest.models),
    loadAll(new THREE.TextureLoader(manager), manifest.textures),
  ]);
  return { models, textures };
}

/**
 * FBXLoader that splits n-gons into triangle fans (0, i - 1, i), like the loader the models were
 * made with (three r116). Since r15x FBXLoader flattens each n-gon and runs earcut on it, which
 * drops and flips triangles of non-planar quads (the v1 hills lost 37 of their 252), leaving
 * holes with back faces and wire edges showing through. GeometryParser is not exported, so the
 * triangulation is swapped for the duration of the (synchronous) parse.
 */
class FanFBXLoader extends FBXLoader {
  /** @type {FBXLoader["parse"]} */
  parse(buffer, path) {
    const earcut = THREE.ShapeUtils.triangulateShape;
    THREE.ShapeUtils.triangulateShape = fan;
    try {
      return super.parse(buffer, path);
    } finally {
      THREE.ShapeUtils.triangulateShape = earcut;
    }
  }
}

/** @param {THREE.Vector2[]} contour */
function fan(contour) {
  return Array.from({ length: contour.length - 2 }, (_, i) => [0, i + 1, i + 2]);
}

/**
 * @template T
 * @param {{ loadAsync(url: string): Promise<T> }} loader
 * @param {Record<string, string>} [entries]
 * @returns {Promise<Record<string, T>>}
 */
async function loadAll(loader, entries = {}) {
  const loaded = await Promise.all(
    Object.entries(entries).map(async ([key, url]) => [key, await loader.loadAsync(url)]),
  );
  return Object.fromEntries(loaded);
}
