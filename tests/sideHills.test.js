import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { LAYERS, MOUNTAINS, WORLD } from "../src/config.js";
import { createSideHills } from "../src/scene/environment/sideHills.js";
import { createMaterials } from "../src/scene/materials.js";
import { createMountainParams } from "../src/scene/mountains.js";

const length = MOUNTAINS.chunkRows * MOUNTAINS.cell;

function setup() {
  const scene = new THREE.Scene();
  const materials = createMaterials({ [String(LAYERS.road.wireMap)]: new THREE.Texture() }, 1);
  const mountains = createMountainParams(1234);
  const hills = createSideHills({ scene, materials, mountains, models: {} });
  return { scene, mountains, hills };
}

/** @param {THREE.Mesh[]} meshes right-hand chunks, nearest last */
const rightSide = (meshes) =>
  meshes.filter((mesh) => mesh.position.x > 0).sort((a, b) => a.position.z - b.position.z);

/**
 * World-space heights of one row of a chunk (local z = 0: far edge, rows * cell: near edge).
 *
 * @param {THREE.Mesh} mesh
 * @param {number} z local
 */
function rowHeights(mesh, z) {
  const position = mesh.geometry.getAttribute("position");
  /** @type {Map<number, number>} */
  const heights = new Map();
  for (let v = 0; v < position.count; v++) {
    if (position.getZ(v) === z) heights.set(position.getX(v), position.getY(v));
  }
  return [...heights.entries()].sort(([a], [b]) => a - b);
}

describe("side mountains", () => {
  it("cover both ends of the road in fog, chunks touching without gaps", () => {
    const { hills } = setup();
    const chunks = rightSide(hills.meshes);
    expect(chunks[0].position.z).toBeLessThanOrEqual(-WORLD.length);
    expect(chunks.at(-1)?.position.z ?? 0).toBeGreaterThanOrEqual(WORLD.length - length);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].position.z - chunks[i - 1].position.z).toBeCloseTo(length);
    }
  });

  it("roll towards the camera with the world speed", () => {
    const { hills } = setup();
    const chunk = rightSide(hills.meshes)[3];
    const z = chunk.position.z;
    hills.update(0.5, 2);
    expect(chunk.position.z - z).toBeCloseTo(WORLD.speed * 2 * 0.5);
  });

  it("recycle a chunk that leaves behind to the far end, with the next landscape", () => {
    const { hills } = setup();
    const before = rightSide(hills.meshes);
    const nearest = /** @type {THREE.Mesh} */ (before.at(-1));
    const heights = rowHeights(nearest, length);
    hills.update(1 / WORLD.speed, 1); // one unit: the nearest chunk moves out
    const after = rightSide(hills.meshes);
    expect(after[0]).toBe(nearest); // now the farthest
    expect(after[0].position.z).toBeLessThan(-WORLD.length);
    expect(rowHeights(nearest, length)).not.toEqual(heights);
  });

  it("match at the seams: neighbours share their boundary row", () => {
    const { hills } = setup();
    hills.update(7.3, 1);
    const chunks = rightSide(hills.meshes);
    for (let i = 1; i < chunks.length; i++) {
      // the near edge of the farther chunk = the far edge of the nearer one
      expect(rowHeights(chunks[i - 1], length)).toEqual(rowHeights(chunks[i], 0));
    }
  });

  it("stay flat up to the start, with lines on the ground grid", () => {
    const { hills } = setup();
    for (const mesh of hills.meshes) {
      const position = mesh.geometry.getAttribute("position");
      for (let v = 0; v < position.count; v++) {
        const x = mesh.position.x + position.getX(v);
        expect(Math.abs(x % WORLD.cellSize)).toBe(0); // columns on the grid's x lines
        if (Math.abs(x) <= MOUNTAINS.start) expect(position.getY(v)).toBeCloseTo(MOUNTAINS.lift);
      }
    }
    for (const mesh of hills.meshes) expect(mesh.position.z % WORLD.cellSize).toBeCloseTo(0);
  });

  it("grow out of flat ground as they come closer", () => {
    const { hills } = setup();
    const { from, length: zone } = MOUNTAINS.grow;
    /** @param {THREE.Mesh} mesh */
    const tallest = (mesh) => {
      const position = mesh.geometry.getAttribute("position");
      let max = 0;
      for (let v = 0; v < position.count; v++) max = Math.max(max, position.getY(v));
      return max;
    };
    const chunks = rightSide(hills.meshes);
    for (const mesh of chunks) {
      const position = mesh.geometry.getAttribute("position");
      for (let v = 0; v < position.count; v++) {
        if (mesh.position.z + position.getZ(v) <= from) {
          expect(position.getY(v)).toBeCloseTo(MOUNTAINS.lift); // flat beyond the zone
        }
      }
    }
    const grown = chunks.filter((mesh) => mesh.position.z >= from + zone);
    expect(grown.length).toBeGreaterThan(0);
    for (const mesh of grown) expect(tallest(mesh)).toBeGreaterThan(10);

    // the farthest chunk rises once it has rolled through the zone
    const chunk = chunks[0];
    const before = tallest(chunk);
    hills.update((from + zone - chunk.position.z) / WORLD.speed, 1);
    expect(tallest(chunk)).toBeGreaterThan(Math.max(10, before));
  });

  it("regenerate with new settings", () => {
    const { hills, mountains } = setup();
    const chunk = rightSide(hills.meshes)[5];
    const heights = rowHeights(chunk, 0);
    mountains.seed += 1;
    hills.regenerate();
    expect(rowHeights(chunk, 0)).not.toEqual(heights);
  });
});
