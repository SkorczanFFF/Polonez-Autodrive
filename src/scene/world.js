import * as THREE from "three";
import { SCENE, SPEED, SUN } from "../config.js";
import { frames } from "../core/time.js";

/** @typedef {import("./materials.js").Materials} Materials */

/** Texture offsets wrap at 2: one full period for both Repeat and MirroredRepeat wrapping. */
const OFFSET_PERIOD = 2;

/**
 * Static world: sky, fog, lights, terrain, road and sun. Scrolls the ground textures.
 *
 * @param {{ scene: THREE.Scene, materials: Materials, textures: Record<string, THREE.Texture> }} deps
 */
export function createWorld({ scene, materials, textures }) {
  scene.background = new THREE.Color(SCENE.background);
  scene.fog = new THREE.Fog(SCENE.fog.color, SCENE.fog.near, SCENE.fog.far);

  addLights(scene);
  addTerrain(scene, materials);
  addRoad(scene, materials);
  addSun(scene, materials);

  const scrolling = [textures.roadline, textures.grid];

  const world = {
    /** Shared by everything that moves with the world (textures, wheels, spawners). */
    speedMultiplier: 1,

    /** @param {number} dt */
    update(dt) {
      const step = SPEED.textureScroll * world.speedMultiplier * frames(dt);
      for (const texture of scrolling) {
        texture.offset.y = (texture.offset.y + step) % OFFSET_PERIOD;
      }
    },
  };

  return world;
}

/** @param {THREE.Scene} scene */
function addLights(scene) {
  const { color, ambient, directional, shadow, legacyScale } = SCENE.lights;

  scene.add(new THREE.AmbientLight(color, ambient * legacyScale));

  for (const [x, y, z, intensity] of directional) {
    const light = new THREE.DirectionalLight(color, intensity * legacyScale);
    light.position.set(x, y, z);
    light.castShadow = true;
    light.shadow.bias = shadow.bias;
    light.shadow.mapSize.set(shadow.mapSize, shadow.mapSize);

    const camera = light.shadow.camera;
    camera.near = shadow.near;
    camera.far = shadow.far;
    camera.left = camera.bottom = -shadow.extent;
    camera.right = camera.top = shadow.extent;
    camera.updateProjectionMatrix();

    scene.add(light);
  }
}

/**
 * @param {THREE.Scene} scene
 * @param {Materials} materials
 */
function addTerrain(scene, materials) {
  const { size } = SCENE.terrain;
  const geometry = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2);

  for (const material of [materials.solid.terrain, materials.wire.terrain]) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

/**
 * @param {THREE.Scene} scene
 * @param {Materials} materials
 */
function addRoad(scene, materials) {
  const { width, length, thickness, lineWidth, lineY } = SCENE.road;

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(width, length, thickness).rotateX(-Math.PI / 2),
    materials.solid.road,
  );
  road.receiveShadow = true;

  const lines = new THREE.Mesh(
    new THREE.PlaneGeometry(lineWidth, length).rotateX(-Math.PI / 2),
    materials.wire.road,
  );
  lines.position.y = lineY;
  lines.receiveShadow = true;

  scene.add(road, lines);
}

/**
 * @param {THREE.Scene} scene
 * @param {Materials} materials
 */
function addSun(scene, materials) {
  const { disc, effect } = SUN;

  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(disc.radius, disc.segments, 0, disc.thetaLength),
    materials.sun,
  );
  sun.position.fromArray(disc.position);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(effect.size, effect.size),
    materials.sunEffect,
  );
  glow.position.fromArray(effect.position);

  scene.add(sun, glow);
}
