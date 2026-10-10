import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BasicLineMaterial, lineGeometry, writeWireEdges } from "../src/scene/lines.js";
import { addWireframe } from "../src/scene/wire.js";

/** Right triangle with legs 3 and 4 (hypotenuse 5). */
function triangle() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 3, 0, 0, 0, 4, 0], 3),
  );
  return geometry;
}

describe("line geometry", () => {
  it("stores each vertex's distance to the opposite edge and the inradius", () => {
    const edge = lineGeometry(triangle()).getAttribute("wireEdge");
    // vertex 0 (right angle) to the hypotenuse: 3 * 4 / 5
    expect(edge.getX(0)).toBeCloseTo(2.4);
    expect(edge.getY(1)).toBeCloseTo(3); // vertex 1 (3, 0) to the leg along y
    expect(edge.getZ(2)).toBeCloseTo(4); // vertex 2 (0, 4) to the leg along x
    expect(edge.getY(0)).toBe(0); // edges through a vertex are at distance 0
    expect(edge.getW(0)).toBeCloseTo(1); // inradius = 2 * 6 / 12
    expect(edge.getW(2)).toBeCloseTo(1);
  });

  it("un-indexes indexed geometry and prepares each source geometry once", () => {
    const box = new THREE.BoxGeometry();
    const prepared = lineGeometry(box);
    expect(prepared).not.toBe(box);
    expect(prepared.index).toBeNull();
    expect(lineGeometry(box)).toBe(prepared);
  });

  it("hides the edge opposite the second vertex for quad grids", () => {
    const geometry = triangle();
    writeWireEdges(geometry, { hideDiagonals: true });
    const edge = geometry.getAttribute("wireEdge");
    for (let v = 0; v < 3; v++) expect(edge.getY(v)).toBeGreaterThan(1000); // never near a line
    expect(edge.getY(1) - edge.getY(0)).toBeCloseTo(3); // still linear: the shader needs dFdx
    expect(edge.getX(0)).toBeCloseTo(2.4); // the other edges as without hiding
    expect(edge.getZ(2)).toBeCloseTo(4);
    expect(edge.getW(0)).toBeCloseTo(1);
  });

  it("keeps the wireEdge of a generator and rewrites it in place", () => {
    const geometry = triangle();
    writeWireEdges(geometry, { hideDiagonals: true });
    const attribute = geometry.getAttribute("wireEdge");
    expect(lineGeometry(geometry)).toBe(geometry);
    expect(attribute.getY(0)).toBeGreaterThan(1000);

    geometry.getAttribute("position").setY(2, 8); // the generator moved a vertex
    writeWireEdges(geometry);
    expect(geometry.getAttribute("wireEdge")).toBe(attribute); // same buffer, no reallocation
    expect(attribute.getZ(2)).toBeCloseTo(8);
    expect(attribute.getY(0)).toBe(0);
  });

  it("wires meshes with the prepared geometry for line materials", () => {
    const mesh = new THREE.Mesh(triangle(), new THREE.MeshBasicMaterial());
    addWireframe(mesh, new BasicLineMaterial());
    const wire = /** @type {THREE.Mesh} */ (mesh.children[0]);
    expect(wire.geometry.getAttribute("wireEdge")).toBeDefined();
  });

  it("line materials survive clone() (fade-in copies)", () => {
    const material = new BasicLineMaterial({ color: 0xff0000 });
    const copy = material.clone();
    expect(copy).toBeInstanceOf(BasicLineMaterial);
    expect(copy.transparent).toBe(true);
    expect(copy.side).toBe(THREE.DoubleSide);
    expect(copy.lineUniforms).toBe(material.lineUniforms); // GUI changes reach fading copies
    expect(copy.customProgramCacheKey()).toBe(material.customProgramCacheKey());
  });
});
