import * as THREE from "three";

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

/**
 * Adds a wireframe twin as a child of every mesh under root. The twin shares the geometry and
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
    const wire = new THREE.Mesh(mesh.geometry, material);
    wire.userData.isWire = true;
    wire.castShadow = true;
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
