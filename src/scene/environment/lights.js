import * as THREE from "three";
import { SCENE } from "../../config.js";

/** Ambient light plus the row of shadow-casting directional lights. @type {import("../world.js").WorldPartFactory} */
export function createLights({ scene }) {
  const { color, ambient, directional, shadow, legacyScale } = SCENE.lights;

  scene.add(new THREE.AmbientLight(color, ambient * legacyScale));

  for (const [x, y, z, intensity] of directional) {
    const light = new THREE.DirectionalLight(color, intensity * legacyScale);
    light.position.set(x, y, z);
    light.castShadow = true;
    light.shadow.bias = shadow.bias;
    light.shadow.mapSize.set(shadow.mapSize, shadow.mapSize);

    const camera = light.shadow.camera;
    camera.near = shadow.near;
    camera.far = shadow.far;
    camera.left = camera.bottom = -shadow.extent;
    camera.right = camera.top = shadow.extent;
    camera.updateProjectionMatrix();

    scene.add(light);
  }

  return {};
}
