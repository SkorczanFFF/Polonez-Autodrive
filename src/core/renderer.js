import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SCENE } from "../config.js";

// Match the v1 (r116) look: colors are used as-is and the output stays linear.
THREE.ColorManagement.enabled = false;

/**
 * Renderer, scene, camera and orbit controls. The canvas is rendered at SCENE.renderScale
 * of its CSS size and stretched back up by the browser.
 *
 * @param {HTMLElement} [container]
 */
export function createView(container = document.body) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const canvas = renderer.domElement;
  container.appendChild(canvas);

  const scene = new THREE.Scene();

  const { camera: cam, controls: limits } = SCENE;
  const camera = new THREE.PerspectiveCamera(cam.fov, 1, cam.near, cam.far);
  camera.position.fromArray(cam.position);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.minDistance = limits.minDistance;
  controls.maxDistance = limits.maxDistance;
  controls.minPolarAngle = limits.minPolarAngle;
  controls.maxPolarAngle = limits.maxPolarAngle;
  controls.target.fromArray(cam.target);
  controls.update();

  function resize() {
    const width = Math.floor(canvas.clientWidth * SCENE.renderScale);
    const height = Math.floor(canvas.clientHeight * SCENE.renderScale);
    if (canvas.width === width && canvas.height === height) return;

    renderer.setSize(width, height, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
  }

  function render() {
    resize();
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, controls, render };
}
