import * as THREE from "three";
import { BLOOM, WIRE } from "../config.js";
import { isLineMaterial, lineGeometry, memoByGeometry } from "./lines.js";

/**
 * Replaces every mesh material under root (disposing the loader's defaults) and sets up shadows.
 *
 * @param {THREE.Object3D} root
 * @param {THREE.Material} material
 * @param {boolean} [shadows] cast and receive them (false: far outside the shadow box)
 */
export function applyMaterial(root, material, shadows = true) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object.userData.isWire) return;
    const previous = Array.isArray(object.material) ? object.material : [object.material];
    for (const old of previous) if (old !== material) old.dispose();
    object.material = material;
    object.castShadow = shadows;
    object.receiveShadow = shadows;
  });
}

/** One EdgesGeometry per source geometry: clones share geometries, so they share outlines. */
const edgesOf = memoByGeometry((geometry) => new THREE.EdgesGeometry(geometry, WIRE.edgeAngle));

/**
 * Adds a line twin as a child of every mesh under root: outlines (LineSegments over the
 * mesh's creases) for line materials, shader-drawn triangle lines for the materials of
 * scene/lines.js (they need the `wireEdge` attribute), the plain geometry otherwise. The twin
 * inherits the transform and animation of its parent, so nothing has to be kept in sync.
 *
 * @param {THREE.Object3D} root
 * @param {THREE.Material} material
 * @param {boolean} [shadows] receive them (false: far outside the shadow box)
 */
export function addWireframe(root, material, shadows = true) {
  /** @type {THREE.Mesh[]} */
  const meshes = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh && !object.userData.isWire) meshes.push(object);
  });

  for (const mesh of meshes) {
    const wire =
      material instanceof THREE.LineBasicMaterial
        ? new THREE.LineSegments(edgesOf(mesh.geometry), material)
        : new THREE.Mesh(
            isLineMaterial(material) ? lineGeometry(mesh.geometry) : mesh.geometry,
            material,
          );
    wire.userData.isWire = true;
    wire.layers.enable(BLOOM.layer); // glows (core/bloom.js)
    wire.castShadow = false; // thin lines add no visible shadow, only shadow-pass draw calls
    wire.receiveShadow = shadows;
    mesh.add(wire);
  }
}

/**
 * Solid look + wireframe twin in one call.
 *
 * @param {THREE.Object3D} root
 * @param {THREE.Material} solid
 * @param {THREE.Material} wire
 * @param {{ shadows?: boolean }} [options] shadows: false for things far outside the shadow box
 */
export function dress(root, solid, wire, { shadows = true } = {}) {
  applyMaterial(root, solid, shadows);
  addWireframe(root, wire, shadows);
  return root;
}
