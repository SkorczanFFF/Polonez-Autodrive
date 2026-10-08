import * as THREE from "three";

/**
 * Removes branches without any mesh, e.g. cameras and helpers exported from 3ds Max
 * (wheel.fbx ships "PhysCamera001" and its target). Keeps clones lean.
 *
 * @template {THREE.Object3D} T
 * @param {T} root
 * @returns {T}
 */
export function pruneEmpty(root) {
  for (const child of [...root.children]) {
    let hasMesh = false;
    child.traverse((object) => {
      if (object instanceof THREE.Mesh) hasMesh = true;
    });
    if (hasMesh) pruneEmpty(child);
    else root.remove(child);
  }
  return root;
}

/**
 * Geometric centre of a model in its own space (model origin at the world origin).
 *
 * @param {THREE.Object3D} model
 */
export function localCenter(model) {
  const { position, quaternion, scale } = model;
  const savedPosition = position.clone();
  const savedQuaternion = quaternion.clone();
  const savedScale = scale.clone();
  position.set(0, 0, 0);
  quaternion.identity();
  scale.set(1, 1, 1);
  const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
  position.copy(savedPosition);
  quaternion.copy(savedQuaternion);
  scale.copy(savedScale);
  return center;
}

/**
 * Centre of a wheel modelled around its axle (axle along x through the model origin, as in
 * wheel.fbx: tire, rim and hub are circles around y = z = 0). Only the width is centred with
 * the bounding box: a polygonal tire's box is off-axis in y/z (one side ends on a vertex, the
 * other on an edge), which would make the wheel wobble when spinning.
 *
 * @param {THREE.Object3D} model
 */
export function wheelCenter(model) {
  return new THREE.Vector3(localCenter(model).x, 0, 0);
}
