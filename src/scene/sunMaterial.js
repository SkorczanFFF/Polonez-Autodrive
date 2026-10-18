import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec2 vLocal;

  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * GLSL for the horizontal cuts in the lower part of a disc (the sun, the moon in sky.js), wider
 * towards the horizon: `stripeCut(h)` is how much is cut away (0..1) at height `h`, 0 at the
 * bottom of the disc, 1 at its top. Measured from the middle of each cut, so both edges are
 * anti-aliased (they slant when the camera turns); cuts thinner than a pixel fade out instead of
 * shimmering. Needs the uniforms of stripeUniforms().
 */
export const STRIPE_CUT = /* glsl */ `
  uniform float uStripeCount;
  uniform float uStripeTop;
  uniform vec2 uGap;

  float stripeCut(float h) {
    if (h >= uStripeTop) return 0.0;
    float s = h / uStripeTop;
    float y = s * uStripeCount;
    float halfGap = mix(uGap.y, uGap.x, s) * 0.5;
    float nearest = y - halfGap + 0.5; // integer part: index of the nearest cut
    float fromMiddle = abs(fract(nearest) - 0.5); // in bands
    float pixel = fwidth(y);
    float drawn = max(halfGap, pixel * 0.5);
    float cut = 1.0 - smoothstep(drawn - pixel * 0.5, drawn + pixel * 0.5, fromMiddle);
    cut *= clamp(halfGap / drawn, 0.0, 1.0);
    return cut * step(nearest, uStripeCount); // no half cut above the last band
  }
`;

/**
 * The uniforms of STRIPE_CUT.
 *
 * @param {{ count: number, top: number, gap: number[] }} stripes SUN.stripes: how many cuts, the
 *   height they reach (fraction of the radius) and their width at the top and at the horizon
 */
export const stripeUniforms = ({ count, top, gap }) => ({
  uStripeCount: { value: count },
  uStripeTop: { value: top },
  uGap: { value: new THREE.Vector2(gap[0], gap[1]) },
});

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform float uRadius;
  uniform float uEffect;
  uniform float uGlow;
  varying vec2 vLocal;
  ${STRIPE_CUT}

  void main() {
    vec2 p = vLocal / uRadius; // disc of radius 1, centre on the horizon line
    if (p.y < 0.0) discard;    // only the upper half, as in v1

    float r = length(p);
    float edge = fwidth(r);
    float disc = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, r);
    float halo = uEffect * exp(-max(r - 1.0, 0.0) / max(uGlow, 1e-4)) * (1.0 - disc) * 0.6;

    // Gradient from the bottom color at the horizon to the top color.
    float t = clamp(p.y, 0.0, 1.0);
    vec3 color = mix(uTop, mix(uBottom, uTop, smoothstep(0.0, 1.0, t)), uEffect);

    // Horizontal cuts in the lower part, wider towards the horizon.
    float cut = uEffect > 0.5 ? stripeCut(t) : 0.0;

    float alpha = disc * (1.0 - cut) + halo;
    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(mix(uBottom, color, disc), alpha);
  }
`;

/**
 * Synthwave sun: gradient from `bottom` (horizon) to `top`, horizontal cuts in the lower part
 * and a soft halo. Replaces the v1 half disc + striped texture overlay (suneffectalt.png).
 * `topColor` / `bottomColor` are the uniforms themselves (the GUI sets them); `effect` toggles
 * gradient, cuts and halo (off = plain disc in the top color, like v1 without the overlay).
 *
 * @param {{
 *   top: THREE.ColorRepresentation,
 *   bottom: THREE.ColorRepresentation,
 *   radius: number,
 *   stripes: { count: number, top: number, gap: number[] },
 *   glow: number,
 * }} options
 */
export function createSunMaterial({ top, bottom, radius, stripes, glow }) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTop: { value: new THREE.Color(top) },
      uBottom: { value: new THREE.Color(bottom) },
      uRadius: { value: radius },
      uEffect: { value: 1 },
      ...stripeUniforms(stripes),
      uGlow: { value: glow },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    fog: false,
  });

  const sun =
    /** @type {typeof material & { topColor: THREE.Color, bottomColor: THREE.Color, effect: boolean }} */ (
      Object.assign(material, {
        topColor: /** @type {THREE.Color} */ (material.uniforms.uTop.value),
        bottomColor: /** @type {THREE.Color} */ (material.uniforms.uBottom.value),
      })
    );
  // An accessor over the uniform. Not via Object.assign: that copies what a getter returns and
  // drops the setter, leaving a plain property that changes nothing.
  Object.defineProperty(sun, "effect", {
    get: () => material.uniforms.uEffect.value > 0.5,
    set: (/** @type {boolean} */ on) => (material.uniforms.uEffect.value = on ? 1 : 0),
    enumerable: true,
  });
  return sun;
}
