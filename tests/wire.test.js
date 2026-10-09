import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { BLOOM } from "../src/config.js";
import { addWireframe, applyMaterial, dress } from "../src/scene/wire.js";

function model() {
  const root = new THREE.Group();
  const a = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  const b = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  a.add(b);
  root.add(a);
  return { root, a, b };
}

describe("wire", () => {
  it("adds one wireframe child per mesh, sharing the geometry", () => {
    const { root, a, b } = model();
    const wire = new THREE.MeshBasicMaterial({ wireframe: true });
    addWireframe(root, wire);

    const wireOf = (/** @type {THREE.Mesh} */ mesh) =>
      /** @type {THREE.Mesh} */ (mesh.children.find((c) => c.userData.isWire));
    expect(wireOf(a).geometry).toBe(a.geometry);
    expect(wireOf(b).geometry).toBe(b.geometry);
    expect(wireOf(a).material).toBe(wire);
  });

  it("puts the wireframes, and only them, on the bloom layer", () => {
    const { root, a } = model();
    addWireframe(root, new THREE.MeshBasicMaterial());
    const twin = /** @type {THREE.Mesh} */ (a.children.find((c) => c.userData.isWire));
    expect(twin.layers.isEnabled(BLOOM.layer)).toBe(true);
    expect(twin.layers.isEnabled(0)).toBe(true); // still drawn by the camera
    expect(a.layers.isEnabled(BLOOM.layer)).toBe(false);
  });

  it("does not wire the wireframes again", () => {
    const { root } = model();
    const wire = new THREE.MeshBasicMaterial();
    addWireframe(root, wire);
    addWireframe(root, wire);
    let wires = 0;
    root.traverse((o) => (wires += o.userData.isWire ? 1 : 0));
    expect(wires).toBe(4);
  });

  it("applyMaterial replaces solid materials but leaves wireframes alone", () => {
    const { root, a } = model();
    const solid = new THREE.MeshBasicMaterial();
    const wire = new THREE.MeshBasicMaterial();
    dress(root, solid, wire);
    applyMaterial(root, solid);
    expect(a.material).toBe(solid);
    const twin = /** @type {THREE.Mesh} */ (a.children.find((c) => c.userData.isWire));
    expect(twin.material).toBe(wire);
  });

  it("clones keep the wireframe children", () => {
    const { root } = model();
    dress(root, new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial());
    let wires = 0;
    root.clone().traverse((o) => (wires += o.userData.isWire ? 1 : 0));
    expect(wires).toBe(2);
  });
});

describe("outlines", () => {
  it("line materials get LineSegments over the creases, shared between clones", () => {
    const { root, a } = model();
    const lines = new THREE.LineBasicMaterial();
    addWireframe(root, lines);
    const twin = /** @type {THREE.LineSegments} */ (a.children.find((c) => c.userData.isWire));
    expect(twin).toBeInstanceOf(THREE.LineSegments);
    expect(twin.geometry).toBeInstanceOf(THREE.EdgesGeometry);
    expect(twin.material).toBe(lines);

    // a cube has 12 crease edges (no triangle diagonals) -> 24 vertices
    expect(twin.geometry.getAttribute("position").count).toBe(24);

    const other = new THREE.Mesh(a.geometry, new THREE.MeshBasicMaterial());
    addWireframe(other, lines);
    const otherTwin = /** @type {THREE.LineSegments} */ (other.children[0]);
    expect(otherTwin.geometry).toBe(twin.geometry);
  });
});
