import * as THREE from "three";
import { SCENE } from "../../config.js";

/** Background color and distance fog. @type {import("../world.js").WorldPartFactory} */
export function createSky({ scene }) {
  scene.background = new THREE.Color(SCENE.background);
  scene.fog = new THREE.Fog(SCENE.fog.color, SCENE.fog.near, SCENE.fog.far);
  return {};
}
