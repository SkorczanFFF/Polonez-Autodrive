import * as THREE from "three";
import { SCENE, SUN } from "../../config.js";

/** Golden angle: spreads disc samples evenly (Vogel disc). */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Unit directions towards the sun samples. The key direction points at the centroid of the
 * visible half disc; samples are spread over `spread` of its apparent width and height.
 *
 * @param {{ samples: number, spread: number }} [options]
 * @returns {THREE.Vector3[]}
 */
export function sunDirections({ samples, spread } = SCENE.lights.sun) {
  const [x, y, z] = SUN.disc.position;
  const distance = Math.hypot(x, z);
  const centroidY = y + (4 * SUN.disc.radius) / (3 * Math.PI); // half-disc centroid
  const keyAzimuth = Math.atan2(x, -z);
  const keyElevation = Math.atan2(centroidY, distance);
  const halfWidth = Math.atan(SUN.disc.radius / distance);
  const halfHeight = halfWidth / 2; // only the upper half of the disc is visible

  return Array.from({ length: samples }, (_, i) => {
    const r = samples === 1 ? 0 : Math.sqrt((i + 0.5) / samples);
    const angle = i * GOLDEN_ANGLE;
    const azimuth = keyAzimuth + r * Math.cos(angle) * halfWidth * spread;
    const elevation = keyElevation + r * Math.sin(angle) * halfHeight * spread;
    return new THREE.Vector3(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      -Math.cos(azimuth) * Math.cos(elevation),
    );
  });
}

/**
 * Ambient light plus the sun as a wide, soft shadow-casting source.
 *
 * @type {import("../world.js").WorldPartFactory}
 */
export function createLights({ scene }) {
  const { color, ambient, sun, shadow, legacyScale } = SCENE.lights;

  scene.add(new THREE.AmbientLight(color, ambient * legacyScale));

  const directions = sunDirections();
  for (const direction of directions) {
    const light = new THREE.DirectionalLight(
      color,
      (sun.intensity * legacyScale) / directions.length,
    );
    light.position.copy(direction).multiplyScalar(sun.distance);
    light.castShadow = true;
    light.shadow.bias = shadow.bias;
    light.shadow.radius = shadow.radius;
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
