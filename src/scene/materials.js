import * as THREE from "three";
import { GRID, LAYERS, MINIGAME, ROAD, SCENE, SHADING, SUN, WIRE, WORLD } from "../config.js";
import { createGridMaterial } from "./grid.js";
import { BasicLineMaterial, PhongLineMaterial } from "./lines.js";
import { createSunMaterial } from "./sunMaterial.js";

/**
 * @typedef {object} Materials
 * @property {Record<string, THREE.MeshToonMaterial | THREE.MeshPhongMaterial>} solid per layer (SHADING.mode)
 * @property {Record<string, THREE.MeshPhongMaterial | THREE.MeshBasicMaterial | THREE.LineBasicMaterial | ReturnType<typeof createGridMaterial>>} wire
 *   per layer: textured overlay (road), procedural grid (terrain), outline lines or a triangle
 *   wireframe (WIRE.mode)
 * @property {ReturnType<typeof createSunMaterial>} sun
 * @property {THREE.MeshToonMaterial | THREE.MeshPhongMaterial} box minigame obstacle
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
  const shade = createShading();
  /** @type {Materials["solid"]} */
  const solid = {};
  /** @type {Materials["wire"]} */
  const wire = {};

  for (const [key, layer] of Object.entries(LAYERS)) {
    solid[key] = shade({
      color: layer.solid,
      polygonOffset: enabled,
      polygonOffsetFactor: factor,
      polygonOffsetUnits: units,
    });

    if (layer.wireGrid) {
      wire[key] = createGridMaterial({
        color: layer.wire,
        cells: [WORLD.width / WORLD.cellSize, WORLD.length / WORLD.cellSize],
        halfWidth: GRID.halfWidth,
        gapHalfWidth: ROAD.width / 2 / WORLD.cellSize, // the road covers the centre
      });
    } else if (layer.wireMap) {
      wire[key] = new THREE.MeshPhongMaterial({
        color: layer.wire,
        map: textures[layer.wireMap],
        transparent: true,
      });
    } else if (WIRE.mode === "edges") {
      wire[key] = new THREE.LineBasicMaterial({ color: layer.wire });
    } else {
      const Material = layer.wireType === "basic" ? BasicLineMaterial : PhongLineMaterial;
      const lines = new Material({ color: layer.wire });
      lines.lineUniforms.fade.value = layer.lineFade ?? WIRE.fade;
      lines.lineUniforms.min.value = layer.lineMin ?? 0;
      wire[key] = lines;
    }
  }

  const sun = createSunMaterial({
    top: SUN.top,
    bottom: SUN.bottom,
    radius: SUN.disc.radius,
    stripes: SUN.stripes,
    glow: SUN.glow,
  });

  const box = shade({ color: MINIGAME.box.color });

  return { solid, wire, sun, box };
}

/**
 * Factory for lit solid materials: toon (banded, via a tiny gradient ramp) or Phong, flat
 * shaded per SHADING.flat.
 *
 * @returns {(parameters: THREE.MeshToonMaterialParameters) => THREE.MeshToonMaterial | THREE.MeshPhongMaterial}
 */
function createShading() {
  const { flat } = SHADING;
  if (SHADING.mode === "phong") {
    return (parameters) => new THREE.MeshPhongMaterial({ ...parameters, flatShading: flat });
  }

  const steps = SHADING.toonSteps;
  const ramp = new THREE.DataTexture(
    new Uint8Array(steps.map((step) => Math.round(step * 255))),
    steps.length,
    1,
    THREE.RedFormat,
  );
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter; // hard bands
  ramp.needsUpdate = true;

  return (parameters) =>
    Object.assign(new ToonMaterial({ ...parameters, gradientMap: ramp }), { flatShading: flat });
}

/**
 * MeshToonMaterial that keeps flatShading on clone(). The renderer honours flatShading on any
 * material (WebGLPrograms reads it), but three declares and copies it only for Phong, Standard
 * and Lambert. A clone without it (fade-in copies) would render smooth shaded while fading and
 * need a shader variant of its own.
 */
class ToonMaterial extends THREE.MeshToonMaterial {
  flatShading = false;

  /** @param {ToonMaterial} source */
  copy(source) {
    super.copy(source);
    this.flatShading = source.flatShading;
    return this;
  }
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
}
