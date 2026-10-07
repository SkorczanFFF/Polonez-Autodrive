import * as THREE from "three";
import { ROAD, WORLD } from "../../config.js";

/** Texture offsets wrap at 2: one full period for both Repeat and MirroredRepeat wrapping. */
const OFFSET_PERIOD = 2;

/**
 * Terrain and road, sized from WORLD/ROAD. Motion is faked by scrolling the overlay textures
 * at WORLD.speed, so the ground itself never moves.
 *
 * @type {import("../world.js").WorldPartFactory}
 */
export function createGround({ scene, materials }) {
  const { solid, wire } = materials;
  const flat = (/** @type {THREE.BufferGeometry} */ geometry) => geometry.rotateX(-Math.PI / 2);

  const terrain = flat(new THREE.PlaneGeometry(WORLD.width, WORLD.length));
  const road = flat(new THREE.BoxGeometry(ROAD.width, WORLD.length, ROAD.thickness));
  const roadLines = flat(new THREE.PlaneGeometry(ROAD.width - ROAD.lineInset, WORLD.length));

  const meshes = [
    new THREE.Mesh(terrain, solid.terrain),
    new THREE.Mesh(terrain, wire.terrain),
    new THREE.Mesh(road, solid.road),
    new THREE.Mesh(roadLines, wire.road),
  ];
  meshes[3].position.y = ROAD.lineY;
  for (const mesh of meshes) mesh.receiveShadow = true;
  scene.add(...meshes);

  const scrolling = [wire.terrain.map, wire.road.map].filter(Boolean);
  const tilesPerSecond = WORLD.speed / WORLD.cellSize;

  return {
    update(dt, speedMultiplier) {
      const step = tilesPerSecond * speedMultiplier * dt;
      for (const texture of scrolling) {
        texture.offset.y = (texture.offset.y + step) % OFFSET_PERIOD;
      }
    },
  };
}
