import * as THREE from "three";
import { WIRE } from "../config.js";
import { BasicLineMaterial, PhongLineMaterial, lineGeometry } from "./lines.js";

/**
 * Replaces every mesh material under root (disposing the loader's defaults) and enables shadows.
 *
 * @param {THREE.Object3D} root
 * @param {THREE.Material} material
 */
export function applyMaterial(root, material) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.userData.isWire) return;
    const previous = Array.isArray(object.material) ? object.material : [object.material];
    for (const old of previous) if (old !== material) old.dispose();
    object.material = material;
    object.castShadow = true;
    object.receiveShadow = true;
  });
}

/** One EdgesGeometry per source geometry: clones share geometries, so they share outlines. */
const edgesCache = new WeakMap();

/** @param {THREE.BufferGeometry} geometry */
function edgesOf(geometry) {
  let edges = edgesCache.get(geometry);
  if (!edges) {
    edges = new THREE.EdgesGeometry(geometry, WIRE.edgeAngle);
    edgesCache.set(geometry, edges);
  }
  return edges;
}

/**
 * Adds a line twin as a child of every mesh under root: outlines (LineSegments over the
 * mesh's creases) for line materials, shader-drawn triangle lines for the materials of
 * scene/lines.js (they need the `wireEdge` attribute), the plain geometry otherwise. The twin
 * inherits the transform and animation of its parent, so nothing has to be kept in sync.
 *
 * @param {THREE.Object3D} root
 * @param {THREE.Material} material
 */
export function addWireframe(root, material) {
  /** @type {THREE.Mesh[]} */
  const meshes = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh && !object.userData.isWire) meshes.push(object);
  });

  for (const mesh of meshes) {
    const lines = material instanceof BasicLineMaterial || material instanceof PhongLineMaterial;
    const wire =
      material instanceof THREE.LineBasicMaterial
        ? new THREE.LineSegments(edgesOf(mesh.geometry), material)
        : new THREE.Mesh(lines ? lineGeometry(mesh.geometry) : mesh.geometry, material);
    wire.userData.isWire = true;
    wire.castShadow = false; // thin lines add no visible shadow, only shadow-pass draw calls
    wire.receiveShadow = true;
    mesh.add(wire);
  }
}

/**
 * Solid look + wireframe twin in one call.
 *
 * @param {THREE.Object3D} root
 * @param {THREE.Material} solid
 * @param {THREE.Material} wire
 */
export function dress(root, solid, wire) {
  applyMaterial(root, solid);
  addWireframe(root, wire);
  return root;
}
