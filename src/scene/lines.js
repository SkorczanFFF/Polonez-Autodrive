import * as THREE from "three";
import { WIRE } from "../config.js";

/**
 * Triangle wireframe drawn by the fragment shader instead of GL lines. GL lines are always one
 * pixel wide, so a dense mesh far away (palms, the Polonez' nose) turns into a solid block of
 * line color. Here:
 * - lines have a width in world units, so they thin out with distance like the model (but stay
 *   at least a pixel wide, no shimmer);
 * - lines of triangles that are tiny on screen fade out (WIRE.fade, by the triangle's inradius
 *   in render pixels) down to a per-layer minimum, so dense meshes far away show their fill,
 *   while big triangles (hills) keep their lines at any distance.
 *
 * `wireEdge` xyz: each vertex's distance to the opposite edge of its triangle (zero for the two
 * edges through it); interpolated, the distance of a fragment to the three edges. w: the
 * triangle's inradius. All in object units.
 */

/** Shared by all line materials, so one GUI slider sets the width everywhere. */
export const lineWidth = { value: WIRE.width };

/** One prepared geometry per source geometry: clones share geometries, so they share it too. */
const geometries = new WeakMap();

/**
 * The geometry with the `wireEdge` attribute (non-indexed: each triangle needs its own vertices).
 *
 * @param {THREE.BufferGeometry} geometry
 * @returns {THREE.BufferGeometry}
 */
export function lineGeometry(geometry) {
  let prepared = geometries.get(geometry);
  if (!prepared) {
    prepared = geometry.index ? geometry.toNonIndexed() : geometry;
    prepared.setAttribute("wireEdge", edgeDistances(prepared.getAttribute("position")));
    geometries.set(geometry, prepared);
  }
  return prepared;
}

/** @param {THREE.BufferAttribute | THREE.InterleavedBufferAttribute} position */
function edgeDistances(position) {
  const distances = new Float32Array(position.count * 4);
  const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const cross = new THREE.Vector3();

  for (let i = 0; i + 2 < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    const doubleArea = cross.subVectors(b, a).cross(c.clone().sub(a)).length();
    // height over the opposite edge = 2 * area / edge length
    const height = (/** @type {number} */ edge) => (edge > 0 ? doubleArea / edge : 0);
    const [ab, bc, ca] = [a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)];
    distances[i * 4] = height(bc);
    distances[(i + 1) * 4 + 1] = height(ca);
    distances[(i + 2) * 4 + 2] = height(ab);
    const inradius = height(ab + bc + ca); // 2 * area / perimeter
    for (let v = 0; v < 3; v++) distances[(i + v) * 4 + 3] = inradius;
  }
  return new THREE.BufferAttribute(distances, 4);
}

/**
 * Per-layer line settings as uniform objects: fade threshold (render px) and the visibility
 * lines fade down to (0..1).
 *
 * @typedef {{ fade: { value: number }, min: { value: number } }} LineUniforms
 */

/**
 * @param {THREE.WebGLProgramParametersWithUniforms} shader
 * @param {LineUniforms} uniforms the material's own
 */
function injectLines(shader, uniforms) {
  shader.uniforms.uLineWidth = lineWidth;
  shader.uniforms.uLineFade = uniforms.fade;
  shader.uniforms.uLineMin = uniforms.min;

  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
      attribute vec4 wireEdge;
      varying vec4 vWireEdge;`,
    )
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      // object space -> world units (instances are scaled, e.g. rocks)
      vWireEdge = wireEdge * pow(abs(determinant(mat3(modelMatrix))), 1.0 / 3.0);`,
    );

  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      uniform float uLineWidth;
      uniform float uLineFade;
      uniform float uLineMin;
      varying vec4 vWireEdge;

      // Each triangle draws its half of the line; the neighbour draws the other half.
      float lineCoverage() {
        vec3 dx = dFdx(vWireEdge.xyz);
        vec3 dy = dFdy(vWireEdge.xyz);
        vec3 pixel = sqrt(dx * dx + dy * dy); // world units per pixel across each edge
        vec3 distance = vWireEdge.xyz / pixel; // to each edge, in pixels
        vec3 halfWidth = max(uLineWidth * 0.5 / pixel, vec3(0.5)); // at least a pixel wide
        vec3 line = clamp(halfWidth + 0.5 - distance, 0.0, 1.0); // pixel coverage
        float inradius = vWireEdge.w / max(pixel.x, max(pixel.y, pixel.z));
        float dense = uLineFade > 0.0 ? 1.0 - smoothstep(uLineFade * 0.25, uLineFade, inradius) : 0.0;
        float visible = 1.0 - dense * (1.0 - uLineMin);
        return max(line.x, max(line.y, line.z)) * visible;
      }`,
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      diffuseColor.a *= lineCoverage();
      if (diffuseColor.a <= 0.0) discard;`,
    );
}

/** Line overrides shared by both classes: see-through like GL lines, blended edges. */
const LINE_PARAMETERS = { transparent: true, depthWrite: false, side: THREE.DoubleSide };

/**
 * Unlit lines. `lineUniforms` (per layer) are shared with clones, so fade-in copies follow the
 * GUI; onBeforeCompile is a method, so it survives clone() too.
 */
export class BasicLineMaterial extends THREE.MeshBasicMaterial {
  /** @type {LineUniforms} */
  lineUniforms = { fade: { value: WIRE.fade }, min: { value: 0 } };

  /** @param {THREE.MeshBasicMaterialParameters} [parameters] */
  constructor(parameters) {
    super({ ...parameters, ...LINE_PARAMETERS });
  }

  /** @param {THREE.WebGLProgramParametersWithUniforms} shader */
  onBeforeCompile(shader) {
    injectLines(shader, this.lineUniforms);
  }

  /** @param {BasicLineMaterial} source */
  copy(source) {
    super.copy(source);
    this.lineUniforms = source.lineUniforms;
    return this;
  }
}

/** Lit lines (v1 wireframes were Phong). */
export class PhongLineMaterial extends THREE.MeshPhongMaterial {
  /** @type {LineUniforms} */
  lineUniforms = { fade: { value: WIRE.fade }, min: { value: 0 } };

  /** @param {THREE.MeshPhongMaterialParameters} [parameters] */
  constructor(parameters) {
    super({ ...parameters, ...LINE_PARAMETERS });
  }

  /** @param {THREE.WebGLProgramParametersWithUniforms} shader */
  onBeforeCompile(shader) {
    injectLines(shader, this.lineUniforms);
  }

  /** @param {PhongLineMaterial} source */
  copy(source) {
    super.copy(source);
    this.lineUniforms = source.lineUniforms;
    return this;
  }
}
