import * as THREE from "three";

const vertexShader = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform vec3 uColor;
  uniform vec2 uCells;
  uniform vec2 uOffset;
  uniform float uHalfWidth;
  uniform float uGapHalfWidth;
  varying vec2 vUv;

  void main() {
    // No grid on the centre strip (the road sits there).
    if (abs(vUv.x - 0.5) * uCells.x < uGapHalfWidth) discard;

    vec2 coord = vUv * uCells + uOffset;
    vec2 pixel = fwidth(coord);
    vec2 distanceToLine = abs(fract(coord - 0.5) - 0.5);

    // Never thinner than a pixel (no shimmer); lines narrower than a pixel fade out by
    // coverage instead, like mipmapping, so the horizon does not turn into a solid band.
    vec2 halfWidth = max(vec2(uHalfWidth), pixel * 0.5);
    vec2 line = 1.0 - smoothstep(halfWidth - pixel * 0.5, halfWidth + pixel * 0.5, distanceToLine);
    line *= clamp(uHalfWidth / halfWidth, 0.0, 1.0);

    float alpha = max(line.x, line.y);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <fog_fragment>
  }
`;

/**
 * Procedural, anti-aliased line grid for the terrain overlay (replaces gridline2.png). Exposes
 * `color` like regular materials (the GUI sets it) and `offset` for scrolling, in cells.
 *
 * @param {{ color: THREE.ColorRepresentation, cells: [number, number], halfWidth: number, gapHalfWidth?: number }} options
 *   halfWidth: line half-width in cells; gapHalfWidth: grid-free centre strip, in cells
 */
export function createGridMaterial({ color, cells, halfWidth, gapHalfWidth = 0 }) {
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uColor: { value: new THREE.Color(color) },
        uCells: { value: new THREE.Vector2(...cells) },
        uOffset: { value: new THREE.Vector2() },
        uHalfWidth: { value: halfWidth },
        uGapHalfWidth: { value: gapHalfWidth },
      },
    ]),
    vertexShader,
    fragmentShader,
    transparent: true,
    fog: true,
  });

  return Object.assign(material, {
    /** Same object as the uniform, so `color.set()` updates the shader. */
    color: /** @type {THREE.Color} */ (material.uniforms.uColor.value),
    /** Scroll position in cells (y runs along the road). */
    offset: /** @type {THREE.Vector2} */ (material.uniforms.uOffset.value),
  });
}
