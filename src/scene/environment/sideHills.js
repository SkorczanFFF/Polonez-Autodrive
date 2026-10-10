import * as THREE from "three";
import { MOUNTAINS, WORLD } from "../../config.js";
import { createHeightField, fillHeightField } from "../heightField.js";
import { createMountainHeight, smoothstep } from "../mountains.js";
import { dress } from "../wire.js";

/**
 * @typedef {object} Chunk
 * @property {THREE.Mesh} mesh
 * @property {number} index landscape stretch it shows (NaN: needs a reshape)
 * @property {Float32Array} heights full-grown height of every vertex
 * @property {number} growth applied growth: 0 flat, 1 full, NaN partial or not applied yet
 */

/**
 * Endless mountains on both sides of the road, rolling towards the camera with the world speed.
 *
 * A conveyor of rigid chunks (height fields, `MOUNTAINS.chunkRows` cells long) covers the road
 * from -WORLD.length to past +WORLD.length, so both ends are in full fog. Chunks only move along
 * z; one that leaves behind the camera comes back at the far end with the next stretch of the
 * landscape, reshaped in place. Rows sit on ground grid lines (z = distance mod cell, like the
 * scrolling terrain grid) and columns on its x lines, so the mountains grow out of the grid.
 * Chunk k covers the landscape from s = k * length to (k + 1) * length; neighbours compute the
 * same boundary row, so the seams match.
 *
 * Far away the chunks lie flat; over `MOUNTAINS.grow` they rise to full height as they come
 * closer, so the mountains rise out of the horizon range instead of cutting through it. Only the
 * y of the chunks inside that zone is rewritten each frame; their line edges and bounds stay
 * those of the full-grown shape (lines stay on the edges, and the flat shading comes from
 * screen-space derivatives).
 *
 * Uses the "side" layer materials, so the GUI colors, lines and glow work as for any model.
 *
 * @param {import("../world.js").WorldContext} context
 */
export function createSideHills({ scene, materials, mountains }) {
  const { cell, chunkRows: rows, lift } = MOUNTAINS;
  const length = rows * cell;
  const cols = (MOUNTAINS.outer - MOUNTAINS.minStart) / cell;
  const far = -WORLD.length;
  const count = Math.ceil((2 * WORLD.length) / length) + 1; // one spare: the ends stay in fog
  const growFrom = MOUNTAINS.grow.from;
  const growTo = growFrom + MOUNTAINS.grow.length;

  /** @type {Chunk[]} */
  const chunks = [];
  for (let j = 0; j < count; j++) {
    for (const x of [-MOUNTAINS.outer, MOUNTAINS.minStart]) {
      const geometry = createHeightField({ cols, rows, cell });
      const mesh = new THREE.Mesh(geometry);
      dress(mesh, materials.solid.side, materials.wire.side);
      mesh.traverse((object) => {
        object.castShadow = false; // far outside the shadow box anyway
        object.receiveShadow = false;
      });
      mesh.position.x = x;
      scene.add(mesh);
      const heights = new Float32Array(geometry.getAttribute("position").count);
      chunks.push({ mesh, index: NaN, heights, growth: NaN });
    }
  }

  let heightAt = createMountainHeight(mountains);
  let distance = 0;

  /** @param {Chunk} chunk */
  function reshape(chunk) {
    const { mesh, heights } = chunk;
    const end = (chunk.index + 1) * length; // landscape at the chunk's far edge (local z = 0)
    fillHeightField(mesh.geometry, (x, z) => heightAt(mesh.position.x + x, end - z), {
      hideDiagonals: MOUNTAINS.lines === "squares",
    });
    const array = mesh.geometry.getAttribute("position").array;
    for (let v = 0; v < heights.length; v++) heights[v] = array[v * 3 + 1];
    chunk.growth = NaN;
  }

  /**
   * Scales the chunk's heights by how far it has come through the growth zone.
   *
   * @param {Chunk} chunk
   */
  function grow(chunk) {
    const { mesh, heights } = chunk;
    const z = mesh.position.z; // far edge
    const growth = z + length <= growFrom ? 0 : z >= growTo ? 1 : NaN;
    if (growth === chunk.growth) return; // flat or full-grown, already applied
    chunk.growth = growth;
    const position = mesh.geometry.getAttribute("position");
    const array = position.array;
    for (let v = 0; v < heights.length; v++) {
      const g = Number.isNaN(growth) ? smoothstep(growFrom, growTo, z + array[v * 3 + 2]) : growth;
      array[v * 3 + 1] = lift + (heights[v] - lift) * g;
    }
    position.needsUpdate = true;
  }

  /** Places every chunk for the current distance; reshapes the ones that got a new stretch. */
  function place() {
    const newest = Math.ceil(distance / length) - 1;
    chunks.forEach((chunk, i) => {
      const slot = Math.floor(i / 2);
      const index = newest - ((((newest - slot) % count) + count) % count);
      if (chunk.index !== index) {
        chunk.index = index;
        reshape(chunk);
      }
      chunk.mesh.position.z = distance - (index + 1) * length + far;
      grow(chunk);
    });
  }
  place();

  return {
    /** For tests and debugging: the chunk meshes, left and right per slot. */
    meshes: chunks.map((chunk) => chunk.mesh),

    /** Rebuilds every chunk from the current `mountains` settings (GUI). */
    regenerate() {
      heightAt = createMountainHeight(mountains);
      for (const chunk of chunks) chunk.index = NaN;
      place();
    },

    /**
     * @param {number} dt
     * @param {number} speedMultiplier
     */
    update(dt, speedMultiplier) {
      distance += WORLD.speed * speedMultiplier * dt;
      place();
    },
  };
}
