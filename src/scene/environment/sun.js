import * as THREE from "three";
import { SUN } from "../../config.js";

/** Room around the disc for the halo, as a fraction of the radius. */
const HALO_MARGIN = 0.25;

/**
 * The synthwave sun: one plane with the sun shader (scene/sunMaterial.js), covering the upper
 * half disc and its halo. The disc centre sits on the horizon line at SUN.disc.position.
 *
 * @type {import("../world.js").WorldPartFactory}
 */
export function createSun({ scene, materials }) {
  const { radius, position } = SUN.disc;
  const size = radius * (1 + HALO_MARGIN);
  const geometry = new THREE.PlaneGeometry(2 * size, size).translate(0, size / 2, 0);

  const sun = new THREE.Mesh(geometry, materials.sun);
  sun.position.fromArray(position);
  sun.renderOrder = -1; // behind everything transparent in front of it
  scene.add(sun);
  return {};
}
