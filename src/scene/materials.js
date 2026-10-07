import * as THREE from "three";
import { LAYERS, SCENE, SUN } from "../config.js";

const WRAP = { repeat: THREE.RepeatWrapping, mirrored: THREE.MirroredRepeatWrapping };

/**
 * @typedef {object} Materials
 * @property {Record<string, THREE.MeshPhongMaterial>} solid per layer
 * @property {Record<string, THREE.MeshPhongMaterial | THREE.MeshBasicMaterial>} wire per layer
 * @property {THREE.MeshPhongMaterial} sun
 * @property {THREE.MeshPhongMaterial} sunEffect
 */

/**
 * The only place that creates scene materials. Colors come from LAYERS and SUN.
 *
 * @param {Record<string, THREE.Texture>} textures
 * @param {number} anisotropy
 * @returns {Materials}
 */
export function createMaterials(textures, anisotropy) {
  setupTextures(textures, anisotropy);

  const { factor, units } = SCENE.polygonOffset;
  /** @type {Materials["solid"]} */
  const solid = {};
  /** @type {Materials["wire"]} */
  const wire = {};

  for (const [key, layer] of Object.entries(LAYERS)) {
    solid[key] = new THREE.MeshPhongMaterial({
      color: layer.solid,
      polygonOffset: true,
      polygonOffsetFactor: factor,
      polygonOffsetUnits: units,
    });

    if (layer.wireMap) {
      wire[key] = new THREE.MeshPhongMaterial({
        color: layer.wire,
        map: textures[layer.wireMap],
        transparent: true,
      });
    } else {
      const Material =
        layer.wireType === "basic" ? THREE.MeshBasicMaterial : THREE.MeshPhongMaterial;
      wire[key] = new Material({ color: layer.wire, wireframe: true });
    }
  }

  const sun = new THREE.MeshPhongMaterial({
    color: SUN.top,
    shininess: SUN.disc.shininess,
    fog: false,
  });
  const sunEffect = new THREE.MeshPhongMaterial({
    color: SUN.bottom,
    map: textures[SUN.effect.texture],
    transparent: true,
    fog: false,
  });

  return { solid, wire, sun, sunEffect };
}

/**
 * @param {Record<string, THREE.Texture>} textures
 * @param {number} anisotropy
 */
function setupTextures(textures, anisotropy) {
  for (const [key, options] of Object.entries(SCENE.textures)) {
    const texture = textures[key];
    if (!texture) continue;
    texture.wrapS = texture.wrapT = WRAP[options.wrap];
    texture.repeat.fromArray(options.repeat);
    texture.anisotropy = anisotropy;
  }
}
