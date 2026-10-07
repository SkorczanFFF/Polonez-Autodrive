import * as THREE from "three";
import { LAYERS, MINIGAME, ROAD, SCENE, SUN, WORLD } from "../config.js";

/**
 * @typedef {object} Materials
 * @property {Record<string, THREE.MeshPhongMaterial>} solid per layer
 * @property {Record<string, THREE.MeshPhongMaterial | THREE.MeshBasicMaterial>} wire per layer
 * @property {THREE.MeshPhongMaterial} sun
 * @property {THREE.MeshPhongMaterial} sunEffect
 * @property {THREE.MeshPhongMaterial} box minigame obstacle
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

  const { enabled, factor, units } = SCENE.polygonOffset;
  /** @type {Materials["solid"]} */
  const solid = {};
  /** @type {Materials["wire"]} */
  const wire = {};

  for (const [key, layer] of Object.entries(LAYERS)) {
    solid[key] = new THREE.MeshPhongMaterial({
      color: layer.solid,
      polygonOffset: enabled,
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

  const box = new THREE.MeshPhongMaterial({ color: MINIGAME.box.color });

  return { solid, wire, sun, sunEffect, box };
}

/**
 * Ground textures tile once per WORLD.cellSize, so they follow any change of world dimensions.
 *
 * @param {Record<string, THREE.Texture>} textures
 * @param {number} anisotropy
 */
function setupTextures(textures, anisotropy) {
  /** @param {number} units */
  const tiles = (units) => units / WORLD.cellSize;

  /**
   * @param {THREE.Texture} texture
   * @param {THREE.Wrapping} wrap
   * @param {number} repeatX
   * @param {number} repeatY
   */
  const configure = (texture, wrap, repeatX, repeatY) => {
    texture.wrapS = texture.wrapT = wrap;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = anisotropy;
  };

  configure(
    textures[LAYERS.road.wireMap],
    THREE.MirroredRepeatWrapping,
    ROAD.lineTilesAcross,
    tiles(WORLD.length),
  );
  configure(
    textures[LAYERS.terrain.wireMap],
    THREE.RepeatWrapping,
    tiles(WORLD.width),
    tiles(WORLD.length),
  );
  configure(textures[SUN.effect.texture], THREE.RepeatWrapping, 1, 1);
}
