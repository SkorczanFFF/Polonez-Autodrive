import * as THREE from "three";
import { SCENE } from "../../config.js";

/** Inside the camera's far plane; drawn first and without depth, so it never hides anything. */
const DOME_RADIUS = 0.75 * SCENE.camera.far;

const vertexShader = /* glsl */ `
  varying vec3 vWorld;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform float uGlow;
  varying vec3 vWorld;

  void main() {
    float height = normalize(vWorld - cameraPosition).y; // sine of the view angle
    float t = smoothstep(0.0, uGlow, height);
    gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0);
  }
`;

/**
 * Sky dome and distance fog. The dome fades from the fog color at the horizon (and below it,
 * where the fogged ground ends) up to the sky color, so the ground melts into a glowing horizon.
 * Its uniforms are scene.background and scene.fog.color themselves, so the GUI's sky and fog
 * colors drive it.
 *
 * @type {import("../world.js").WorldPartFactory}
 */
export function createSky({ scene }) {
  const top = new THREE.Color(SCENE.background);
  const fog = new THREE.Fog(SCENE.fog.color, SCENE.fog.near, SCENE.fog.far);
  scene.background = top;
  scene.fog = fog;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(DOME_RADIUS, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: top },
        uHorizon: { value: fog.color },
        uGlow: { value: SCENE.skyGlow },
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  dome.renderOrder = -2; // before everything, the sun (-1) included
  dome.frustumCulled = false;
  scene.add(dome);
  return {};
}
