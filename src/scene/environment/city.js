import * as THREE from "three";
import { BLOOM, CITY } from "../../config.js";
import { mulberry32 } from "../../core/noise.js";
import { createRandom } from "../../core/random.js";
import { writeWireEdges } from "../lines.js";
import { dress } from "../wire.js";

/**
 * @typedef {object} Building
 * @property {number} x centre of the footprint
 * @property {number} z
 * @property {number} w along x
 * @property {number} d along z
 * @property {number} h tall
 * @property {number} lit share of its windows lit, 0..1
 * @property {"windows" | "floors" | "columns"} style single windows, lit floors or lit columns
 * @property {number} seed for its windows
 */

/** Window styles, single windows twice as likely. */
const STYLES = /** @type {const} */ (["windows", "windows", "floors", "columns"]);

/** @param {number} value @param {number} step */
const snap = (value, step) => Math.max(step, Math.round(value / step) * step);

/**
 * Where the towers stand: a seeded skyline behind the car, past the end of the side mountains,
 * clear of the road into the city, never overlapping. Its front bends away like a banana, the
 * middle nearest and densest (downtown, tallest), the outskirts further back and lower. Every
 * tower gets its own share of lit windows and its own window style.
 *
 * @param {{ buildings: number, height: number, lit: number }} params live settings (GUI)
 * @param {number} seed
 * @returns {Building[]}
 */
export function layoutCity({ buildings, height, lit }, seed) {
  const { random, between, pick } = createRandom(mulberry32(seed));
  const { near, depth, bend, halfWidth, roadGap, cell } = CITY;
  const [narrow, wide] = CITY.width;
  /** @type {Building[]} */
  const placed = [];

  for (let tries = 0; placed.length < buildings && tries < buildings * 30; tries++) {
    const w = snap(between(narrow, wide), cell);
    const d = snap(between(narrow, wide), cell);
    // more towers towards the middle (downtown), thinning out to the sides
    const side = random() < 0.5 ? -1 : 1;
    const x = side * (roadGap + w / 2 + (halfWidth - roadGap - w) * random() ** 1.6);
    const across = Math.abs(x) / halfWidth; // 0 by the road, 1 at the far ends
    // the front bends away like a banana, its middle nearest; each tower a random way back, so
    // the city has no straight front row
    const z = near + bend * across ** 2 + d / 2 + random() ** 1.5 * (depth - d);
    const clear = placed.every(
      (other) =>
        Math.abs(other.x - x) > (other.w + w) / 2 + 2 ||
        Math.abs(other.z - z) > (other.d + d) / 2 + 2,
    );
    if (!clear) continue;
    // downtown tallest, the outskirts lower; mostly mid-rise and tall, so the towers on the sides
    // still rise over the side mountains; a ragged skyline, every tower its own height
    const downtown = 1 - 0.5 * across;
    const h = snap(height * downtown * (0.3 + 0.7 * random() ** 1.5), cell);
    placed.push({
      x,
      z,
      w,
      d,
      h,
      lit: Math.min(lit * between(0.2, 1.8), 1),
      style: pick(STYLES),
      seed: Math.floor(random() * 2 ** 31),
    });
  }
  return placed;
}

/**
 * The buildings in CITY.bands bands across the city (by x), each drawn by its own meshes, so
 * frustum culling can drop what is out of view: the whole city while the camera looks ahead, the
 * far bands while it looks back. One mesh for all of it has a bounding sphere so wide it reaches
 * past the camera and is never culled.
 *
 * @param {Building[]} buildings
 * @param {number} [bands]
 * @returns {Building[][]}
 */
export function bandCity(buildings, bands = CITY.bands) {
  const width = (2 * CITY.halfWidth) / bands;
  const result = Array.from({ length: bands }, () => /** @type {Building[]} */ ([]));
  for (const building of buildings) {
    const i = Math.floor((building.x + CITY.halfWidth) / width);
    result[Math.min(bands - 1, Math.max(0, i))].push(building);
  }
  return result;
}

/**
 * The faces of a building, walls first then the roof: an origin, two edges in outward-facing
 * order (their cross product points out, as quads() needs) and the outward normal.
 *
 * @param {Building} building
 */
function facesOf({ x, z, w, d, h }) {
  const [x0, z0] = [x - w / 2, z - d / 2];
  const up = new THREE.Vector3(0, h, 0);
  const across = new THREE.Vector3(w, 0, 0);
  const deep = new THREE.Vector3(0, 0, d);
  const face = (
    /** @type {THREE.Vector3} */ origin,
    /** @type {THREE.Vector3} */ first,
    /** @type {THREE.Vector3} */ second,
    /** @type {THREE.Vector3} */ normal,
  ) =>
    new THREE.Vector3().crossVectors(second, first).dot(normal) >= 0
      ? { origin, along: first, up: second, normal }
      : { origin, along: second, up: first, normal };
  return [
    face(new THREE.Vector3(x0, 0, z0 + d), across, up, new THREE.Vector3(0, 0, 1)),
    face(new THREE.Vector3(x0, 0, z0), across, up, new THREE.Vector3(0, 0, -1)),
    face(new THREE.Vector3(x0 + w, 0, z0), deep, up, new THREE.Vector3(1, 0, 0)),
    face(new THREE.Vector3(x0, 0, z0), deep, up, new THREE.Vector3(-1, 0, 0)),
    face(new THREE.Vector3(x0, h, z0), across, deep, new THREE.Vector3(0, 1, 0)),
  ];
}

/**
 * Non-indexed quads, each as triangles (c, b, a) and (a, e, c): their diagonal a-c lies opposite
 * the second vertex, where writeWireEdges hides it (scene/lines.js).
 *
 * @param {[THREE.Vector3, THREE.Vector3, THREE.Vector3][]} quads
 *   origin and two outward-facing edges
 */
function quads(quads) {
  const positions = new Float32Array(quads.length * 18);
  let i = 0;
  const [b, c, e] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (const [a, along, up] of quads) {
    b.copy(a).add(along);
    c.copy(b).add(up);
    e.copy(a).add(up);
    for (const point of [c, b, a, a, e, c]) {
      positions.set([point.x, point.y, point.z], i);
      i += 3;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * The towers: one quad per face, so the lines outline every building and nothing more.
 *
 * @param {Building[]} buildings
 */
function towersGeometry(buildings) {
  const geometry = quads(
    buildings.flatMap((building) =>
      facesOf(building).map(({ origin, along, up }) => /** @type {const} */ ([origin, along, up])),
    ),
  );
  writeWireEdges(geometry, { hideDiagonals: true });
  return geometry;
}

/**
 * Lit windows: quads just off the walls, on a grid of `cell`-sized floors and bays, some lit (the
 * building's `lit` share) in its style: single windows, whole floors or whole columns.
 *
 * @param {Building[]} buildings
 */
function windowsGeometry(buildings) {
  const { cell, window: size } = CITY;
  const inset = (1 - size) / 2;
  /** @type {[THREE.Vector3, THREE.Vector3, THREE.Vector3][]} */
  const windows = [];
  for (const building of buildings) {
    const random = mulberry32(building.seed);
    const { style, lit } = building;
    for (const { origin, along, up, normal } of facesOf(building).slice(0, 4)) {
      const vertical = up.y > 0; // which edge runs up the wall
      const [wall, height] = vertical ? [along, up] : [up, along];
      const [bays, floors] = [Math.round(wall.length() / cell), Math.round(height.length() / cell)];
      const u = wall.clone().divideScalar(bays);
      const v = height.clone().divideScalar(floors);
      const litFloors = Array.from({ length: floors }, () => random() < lit);
      const litBays = Array.from({ length: bays }, () => random() < lit);
      for (let floor = 1; floor < floors; floor++) {
        for (let bay = 0; bay < bays; bay++) {
          const on =
            style === "floors"
              ? litFloors[floor]
              : style === "columns"
                ? litBays[bay]
                : random() < lit;
          if (!on) continue;
          const strip = style === "floors"; // a lit floor is one band along the wall
          const corner = origin
            .clone()
            .addScaledVector(u, bay + (strip ? 0 : inset))
            .addScaledVector(v, floor + inset)
            .addScaledVector(normal, 0.3); // just off the wall
          const wide = u.clone().multiplyScalar(strip ? 1 : size);
          const tall = v.clone().multiplyScalar(size);
          windows.push(vertical ? [corner, wide, tall] : [corner, tall, wide]);
        }
      }
    }
  }
  return quads(windows);
}

/**
 * The city's haze (addHaze): uniforms for the GUI, and its shader chunks.
 *
 * @typedef {object} Haze
 * @property {{ value: number }} amount at the ground, 0..1
 * @property {{ value: number }} height where it thins out to nothing
 * @property {{ value: THREE.Color }} color the scene's fog color
 */
const HAZE_VERTEX_PARS = /* glsl */ `#include <common>
  varying float vHazeY;`;
const HAZE_VERTEX = /* glsl */ `#include <begin_vertex>
  vHazeY = (modelMatrix * vec4(transformed, 1.0)).y;`;
const HAZE_FRAGMENT_PARS = /* glsl */ `#include <common>
  uniform float uHaze;
  uniform float uHazeHeight;
  uniform vec3 uHazeColor;
  varying float vHazeY;`;
const HAZE_FRAGMENT = /* glsl */ `
  float haze = uHaze * (1.0 - smoothstep(0.0, uHazeHeight, vHazeY));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeColor, haze);
  #include <dithering_fragment>`;
/** Lines and windows also fade out in the haze: a bright line mixed with it would still show. */
const HAZE_FADE = /* glsl */ `${HAZE_FRAGMENT}
  gl_FragColor.a *= 1.0 - haze;`;

/**
 * Gives a material the city's haze: the fog color laid over it, thickest at the ground and
 * thinning out up to `height` (the scene fog itself is off for the city, CITY).
 *
 * @param {THREE.Material} material
 * @param {Haze} haze
 * @param {boolean} [fade] also fade out (lines, windows; the material must be transparent)
 */
function addHaze(material, haze, fade = false) {
  const compile = material.onBeforeCompile.bind(material); // e.g. the line shader (scene/lines.js)
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    Object.assign(shader.uniforms, {
      uHaze: haze.amount,
      uHazeHeight: haze.height,
      uHazeColor: haze.color,
    });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", HAZE_VERTEX_PARS)
      .replace("#include <begin_vertex>", HAZE_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", HAZE_FRAGMENT_PARS)
      .replace("#include <dithering_fragment>", fade ? HAZE_FADE : HAZE_FRAGMENT);
  };
}

/**
 * The neon city we drive away from (CITY), behind the car past the end of the side mountains,
 * which pass in front of it. Static, like the horizon range: dark towers outlined in the "city"
 * layer's lines, and lit windows in the same color (they glow, and show and hide with the lines).
 * Built from the mountains' seed, so "New landscape" moves it too.
 *
 * @param {import("../world.js").WorldContext} context
 */
export function createCity({ scene, materials, mountains }) {
  const params = { buildings: CITY.buildings, height: CITY.height, lit: CITY.lit };
  const fog = /** @type {THREE.Fog} */ (scene.fog);
  const haze = {
    amount: { value: CITY.haze },
    height: { value: CITY.hazeHeight },
    color: { value: fog.color }, // the GUI's fog color
  };
  /** The geometry of every band: towers (with their lines) and windows. */
  const build = () =>
    bandCity(layoutCity(params, mountains.seed + 2)).map((buildings) => ({
      towers: towersGeometry(buildings),
      windows: windowsGeometry(buildings),
      empty: buildings.length === 0,
    }));

  // The windows follow the lines' material (the GUI edits it): the same Color object, and
  // visibility and glow copied every frame (update).
  const lines = materials.wire.city;
  const glass = new THREE.MeshBasicMaterial({ fog: false, transparent: true });
  glass.color = lines.color;
  addHaze(materials.solid.city, haze);
  for (const material of [lines, glass]) addHaze(material, haze, true);

  const city = new THREE.Group();
  city.position.y = -CITY.sink;
  /** One pair of meshes per band (bandCity). */
  const bands = build().map(({ towers: towerGeometry, windows: windowGeometry, empty }) => {
    const towers = new THREE.Mesh(towerGeometry);
    dress(towers, materials.solid.city, materials.wire.city, { shadows: false }); // far outside the shadow box
    const windows = new THREE.Mesh(windowGeometry, glass);
    windows.layers.enable(BLOOM.layer); // the windows glow like the lines
    towers.visible = windows.visible = !empty;
    city.add(towers, windows);
    return { towers, windows };
  });
  scene.add(city);

  return {
    params,
    haze,

    /** The windows show, hide and glow with the lines. */
    update() {
      glass.visible = lines.visible;
      glass.userData.glow = lines.userData.glow;
    },

    /** Rebuilds the city from `params` and the mountains' seed (GUI). */
    regenerate() {
      build().forEach(({ towers: towerGeometry, windows: windowGeometry, empty }, i) => {
        const { towers, windows } = bands[i];
        const old = [towers.geometry, windows.geometry];
        towers.geometry = towerGeometry;
        const wire = /** @type {THREE.Mesh} */ (towers.children[0]);
        wire.geometry = towerGeometry; // it has its own wireEdge: the line twin shares it
        windows.geometry = windowGeometry;
        towers.visible = windows.visible = !empty;
        for (const geometry of old) geometry.dispose();
      });
    },
  };
}
