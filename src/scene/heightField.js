import * as THREE from "three";
import { writeWireEdges } from "./lines.js";

/**
 * A grid of square cells in the xz plane (from its corner at the origin to cols * cell along x
 * and rows * cell along z), shaped by fillHeightField. Non-indexed, so the line twin from
 * wire.js shares its position buffer. Each cell is two up-facing triangles; the diagonal lies
 * opposite their second vertex, where writeWireEdges can hide it for a square grid.
 *
 * @param {{ cols: number, rows: number, cell: number }} options
 */
export function createHeightField({ cols, rows, cell }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(cols * rows * 6 * 3), 3),
  );
  geometry.userData.heightField = {
    cols,
    rows,
    cell,
    heights: new Float32Array((cols + 1) * (rows + 1)),
  };
  writeCells(geometry); // flat until the first fill
  return geometry;
}

/**
 * Writes the triangles of every cell from the node heights. Each cell is split along the
 * diagonal whose corners are closer in height (the shorter one in 3D), so the creases follow
 * ridges and valleys instead of one fixed direction: a more natural, less patterned surface.
 * On a tie it joins the higher corners, so crests stay sharp.
 *
 * @param {THREE.BufferGeometry} geometry
 */
function writeCells(geometry) {
  const { cols, rows, cell, heights } = geometry.userData.heightField;
  const stride = cols + 1;
  const position = /** @type {THREE.BufferAttribute} */ (geometry.getAttribute("position"));
  const array = /** @type {Float32Array} */ (position.array);
  let i = 0;

  /** @param {number} c @param {number} r */
  const put = (c, r) => {
    array[i++] = c * cell;
    array[i++] = heights[r * stride + c];
    array[i++] = r * cell;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // corners a (c, r), b (c+1, r), c' (c+1, r+1), d (c, r+1)
      const a = heights[r * stride + c];
      const b = heights[r * stride + c + 1];
      const c2 = heights[(r + 1) * stride + c + 1];
      const d = heights[(r + 1) * stride + c];
      const along = Math.abs(a - c2) - Math.abs(b - d);
      if (along < 0 || (along === 0 && a + c2 >= b + d)) {
        // diagonal a-c'
        put(c + 1, r + 1);
        put(c + 1, r);
        put(c, r);
        put(c, r);
        put(c, r + 1);
        put(c + 1, r + 1);
      } else {
        // diagonal b-d
        put(c, r + 1);
        put(c + 1, r + 1);
        put(c + 1, r);
        put(c + 1, r);
        put(c, r);
        put(c, r + 1);
      }
    }
  }
  position.needsUpdate = true;
}

/**
 * Sets the height of every grid node (computed once per node, not per vertex) and refreshes
 * what depends on it (triangles, normals, line edges, bounds), in place: same buffers, so a
 * chunk can be reshaped without allocations or new shader programs.
 *
 * @param {THREE.BufferGeometry} geometry from createHeightField
 * @param {(x: number, z: number) => number} heightAt in the geometry's local units
 * @param {{ hideDiagonals?: boolean }} [options] true: lines draw a square grid, not triangles
 */
export function fillHeightField(geometry, heightAt, { hideDiagonals = false } = {}) {
  const { cols, rows, cell, heights } = geometry.userData.heightField;
  const stride = cols + 1;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) heights[r * stride + c] = heightAt(c * cell, r * cell);
  }
  writeCells(geometry);
  writeWireEdges(geometry, { hideDiagonals });
  geometry.computeVertexNormals(); // non-indexed: one flat normal per triangle
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
}
