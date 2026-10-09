import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BLOOM } from "../config.js";

const mixShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D baseTexture;
    uniform sampler2D bloomTexture;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(baseTexture, vUv) + vec4(texture2D(bloomTexture, vUv).rgb, 0.0);
    }
  `,
};

/**
 * Selective bloom: only objects on BLOOM.layer (the wireframe twins) glow, each as strong as its
 * material's `userData.glow` (0..1, per layer; dimmer lines are drawn with dimmed copies). The glow pass renders
 * the scene with every other drawable swapped for black, so solids still hide the lines behind
 * them, with black fog and background (far lines glow less, the sky not at all); the result is
 * blurred and added to the normal render.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 */
export function createBloom(renderer, scene, camera) {
  const glowing = new THREE.Layers();
  glowing.set(BLOOM.layer);
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());

  const glowComposer = new EffectComposer(renderer);
  glowComposer.renderToScreen = false;
  glowComposer.addPass(new RenderPass(scene, camera));
  const glow = new UnrealBloomPass(size, BLOOM.strength, BLOOM.radius, 0);
  glowComposer.addPass(glow);

  // Multisampled like the canvas (the renderer is created with antialias).
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const mix = new ShaderPass(
    new THREE.ShaderMaterial({
      ...mixShader,
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: glowComposer.renderTarget2.texture },
      },
    }),
    "baseTexture",
  );
  composer.addPass(mix);

  /** Black stand-ins keyed by what decides depth and visibility. @type {Map<string, THREE.Material>} */
  const blacks = new Map();
  /** @type {Map<THREE.Mesh | THREE.Line, THREE.Material | THREE.Material[]>} */
  const swapped = new Map();
  const fogColor = new THREE.Color();
  /** @type {WeakMap<THREE.Material, THREE.Material & { color: THREE.Color }>} */
  const dimmed = new WeakMap();

  /**
   * @param {THREE.Material & { color: THREE.Color }} material
   * @param {number} factor
   */
  function dimmedFor(material, factor) {
    let dim = dimmed.get(material);
    if (!dim) {
      dim = /** @type {THREE.Material & { color: THREE.Color }} */ (material.clone());
      dimmed.set(material, dim);
    }
    dim.color.copy(material.color).multiplyScalar(factor); // follows GUI color changes
    dim.opacity = material.opacity;
    dim.visible = material.visible;
    return dim;
  }

  /** @param {THREE.Material} material */
  function blackFor(material) {
    const { polygonOffset, polygonOffsetFactor, polygonOffsetUnits, side, visible, depthWrite } =
      material;
    const key = [
      polygonOffset,
      polygonOffsetFactor,
      polygonOffsetUnits,
      side,
      visible,
      depthWrite,
    ].join();
    let black = blacks.get(key);
    if (!black) {
      black = new THREE.MeshBasicMaterial({
        color: 0x000000,
        fog: false,
        polygonOffset,
        polygonOffsetFactor,
        polygonOffsetUnits,
        side,
        visible,
        depthWrite,
      });
      blacks.set(key, black);
    }
    return black;
  }

  /** @param {THREE.Object3D} object */
  function darken(object) {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
    const { material } = object;
    if (object.layers.test(glowing)) {
      const factor = Array.isArray(material) ? 1 : (material.userData.glow ?? 1);
      if (factor >= 1 || !("color" in material)) return;
      swapped.set(object, material);
      object.material = dimmedFor(/** @type {any} */ (material), factor);
      return;
    }
    swapped.set(object, material);
    object.material = blackFor(Array.isArray(material) ? material[0] : material);
  }

  return {
    /** Switched from the GUI and with G. */
    enabled: BLOOM.enabled,

    get strength() {
      return glow.strength;
    },
    set strength(value) {
      glow.strength = value;
    },
    get radius() {
      return glow.radius;
    },
    set radius(value) {
      glow.radius = value;
    },

    /** @param {number} width @param {number} height drawing buffer size */
    setSize(width, height) {
      glowComposer.setSize(width, height);
      composer.setSize(width, height);
    },

    render() {
      const background = scene.background;
      const fog = /** @type {THREE.Fog | null} */ (scene.fog);
      scene.traverse(darken);
      scene.background = null;
      if (fog) (fogColor.copy(fog.color), fog.color.set(0x000000));

      glowComposer.render();

      for (const [object, material] of swapped) object.material = material;
      swapped.clear();
      scene.background = background;
      if (fog) fog.color.copy(fogColor);

      composer.render();
    },
  };
}
