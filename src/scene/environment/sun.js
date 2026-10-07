import * as THREE from "three";
import { SUN } from "../../config.js";

/** Half-disc sun with the striped glow plane in front of it. @type {import("../world.js").WorldPartFactory} */
export function createSun({ scene, materials }) {
  const { disc, effect } = SUN;

  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(disc.radius, disc.segments, 0, disc.thetaLength),
    materials.sun,
  );
  sun.position.fromArray(disc.position);

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(effect.size, effect.size),
    materials.sunEffect,
  );
  glow.position.fromArray(effect.position);

  scene.add(sun, glow);
  return {};
}
