import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createHeightField, fillHeightField } from "../src/scene/heightField.js";

describe("height field", () => {
  it("builds two up-facing triangles per cell over the grid", () => {
    const geometry = createHeightField({ cols: 3, rows: 2, cell: 4 });
    const position = geometry.getAttribute("position");
    expect(position.count).toBe(3 * 2 * 6);
    expect(geometry.index).toBeNull();

    fillHeightField(geometry, () => 0);
    const normal = geometry.getAttribute("normal");
    for (let v = 0; v < normal.count; v++) expect(normal.getY(v)).toBeCloseTo(1);

    const box = /** @type {THREE.Box3} */ (geometry.boundingBox);
    expect(box.min.toArray()).toEqual([0, 0, 0]);
    expect(box.max.toArray()).toEqual([12, 0, 8]);
  });

  it("puts the height of each grid node on all its vertices", () => {
    const geometry = createHeightField({ cols: 2, rows: 2, cell: 4 });
    fillHeightField(geometry, (x, z) => x + 10 * z);
    const position = geometry.getAttribute("position");
    for (let v = 0; v < position.count; v++) {
      expect(position.getY(v)).toBeCloseTo(position.getX(v) + 10 * position.getZ(v));
    }
  });

  it("splits each cell along the diagonal whose corners are closer in height", () => {
    const geometry = createHeightField({ cols: 1, rows: 1, cell: 4 });
    const position = geometry.getAttribute("position");
    /** corners at the ends of the shared edge of the two triangles (in both, vertices 0 and 2) */
    const diagonal = () =>
      [0, 2]
        .map((v) => `${position.getX(v)},${position.getZ(v)}`)
        .sort()
        .join(" ");

    fillHeightField(geometry, (x, z) => (x === z ? 5 : 0)); // ridge from (0,0) to (4,4)
    expect(diagonal()).toBe("0,0 4,4");
    fillHeightField(geometry, (x, z) => (x !== z ? 5 : 0)); // ridge from (4,0) to (0,4)
    expect(diagonal()).toBe("0,4 4,0");
  });

  it("keeps every triangle facing up, whichever the diagonal", () => {
    const geometry = createHeightField({ cols: 6, rows: 6, cell: 4 });
    fillHeightField(geometry, (x, z) => 3 * Math.sin(x * 0.7) * Math.cos(z * 0.5));
    const normal = geometry.getAttribute("normal");
    for (let v = 0; v < normal.count; v++) expect(normal.getY(v)).toBeGreaterThan(0);
  });

  it("draws triangles by default and a square grid on request", () => {
    const geometry = createHeightField({ cols: 1, rows: 1, cell: 4 });
    fillHeightField(geometry, () => 0);
    expect(geometry.getAttribute("wireEdge").getY(1)).toBeLessThan(1000); // diagonal drawn
    fillHeightField(geometry, () => 0, { hideDiagonals: true });
    const edge = geometry.getAttribute("wireEdge");
    for (let v = 0; v < edge.count; v++) {
      expect(edge.getY(v)).toBeGreaterThan(1000); // the diagonal
      // the cell sides: 4 units away from the vertex opposite them, 0 through it
      expect([0, 4]).toContainEqual(Math.round(edge.getX(v)));
      expect([0, 4]).toContainEqual(Math.round(edge.getZ(v)));
    }
  });

  it("reshapes in place: same buffers on every fill", () => {
    const geometry = createHeightField({ cols: 2, rows: 2, cell: 4 });
    fillHeightField(geometry, () => 1);
    const position = /** @type {THREE.BufferAttribute} */ (geometry.getAttribute("position"));
    const edge = geometry.getAttribute("wireEdge");
    fillHeightField(geometry, (x) => x);
    expect(geometry.getAttribute("position")).toBe(position);
    expect(geometry.getAttribute("wireEdge")).toBe(edge);
    expect(position.version).toBeGreaterThan(1);
  });
});
