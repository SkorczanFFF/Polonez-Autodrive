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
 * Geometric centre of a model in its own space: the box around its meshes' bounding boxes, each
 * brought into the model's space (the model itself is left as it is).
 *
 * @param {THREE.Object3D} model
 */
function localCenter(model) {
  model.updateWorldMatrix(true, true);
  const toLocal = model.matrixWorld.clone().invert();
  const bounds = new THREE.Box3();
  const box = new THREE.Box3();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = /** @type {THREE.BufferGeometry} */ (object.geometry);
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    box.copy(/** @type {THREE.Box3} */ (geometry.boundingBox));
    bounds.union(box.applyMatrix4(object.matrixWorld).applyMatrix4(toLocal));
  });
  return bounds.getCenter(new THREE.Vector3());
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
