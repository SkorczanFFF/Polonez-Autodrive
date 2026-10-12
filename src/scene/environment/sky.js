import * as THREE from "three";
import { NIGHT, SCENE, SUN } from "../../config.js";

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
  uniform vec3 uNight;
  uniform float uNightReach;
  uniform float uNightBlend;
  uniform float uStars;
  uniform vec3 uStarColor;
  uniform float uMoon;
  uniform vec3 uMoonColor;
  uniform float uMoonSize;
  uniform vec3 uMoonDirection;
  uniform float uStripeCount;
  uniform float uStripeTop;
  uniform vec2 uGap;
  varying vec3 vWorld;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  }

  void main() {
    vec3 direction = normalize(vWorld - cameraPosition);
    float height = direction.y; // sine of the view angle
    float t = smoothstep(0.0, uGlow, height);

    // Night falls behind the car (+z, away from the sun), reaching further round with uNightReach
    // (0 none, 0.5 the back half, 1 the whole sky), over a uNightBlend-wide dusk on either side.
    float edge = (1.0 + uNightBlend) * (1.0 - 2.0 * uNightReach);
    float night = smoothstep(edge - uNightBlend, edge + uNightBlend, direction.z);
    // Only a dark sky turns into night: under a light (day) sky, stars and a moon make no sense.
    night *= 1.0 - smoothstep(0.25, 0.5, dot(uTop, vec3(0.2126, 0.7152, 0.0722)));
    vec3 color = mix(uHorizon, mix(uTop, uNight, night), t);

    // Stars: a point in some cells of a grid round the camera, only in the night above the glow.
    vec3 p = direction * 120.0;
    vec3 cell = floor(p);
    vec3 jitter = vec3(hash(cell + 1.7), hash(cell + 3.1), hash(cell + 5.3)) - 0.5;
    vec3 centre = cell + 0.5 + jitter * 0.5;
    float star = step(1.0 - uStars * 0.3, hash(cell)) * smoothstep(0.4, 0.1, length(p - centre));
    color += uStarColor * star * night * t; // the moon is painted over them

    // The moon, in the style of the sun: a flat crescent (the disc minus a shifted one) with a
    // gradient from the moon color down to the horizon glow, horizontal cuts in its lower part,
    // wider downwards (SUN.stripes), and a soft halo. m: the sky round it, disc radius 1.
    vec3 moonUp = normalize(vec3(0.0, 1.0, 0.0) - uMoonDirection * uMoonDirection.y);
    vec3 moonRight = cross(moonUp, uMoonDirection);
    vec2 m = vec2(dot(direction, moonRight), dot(direction, moonUp)) / uMoonSize;
    float facing = step(0.0, dot(direction, uMoonDirection)); // not its mirror image behind us
    float r = length(m);
    float rim = fwidth(r);
    float full = facing * (1.0 - smoothstep(1.0 - rim, 1.0 + rim, r));
    float shadowR = length(m - vec2(0.62, 0.18));
    float lit = full * smoothstep(1.0 - rim, 1.0 + rim, shadowR);

    float h = clamp((m.y + 1.0) * 0.5, 0.0, 1.0); // 0 at its bottom, 1 at its top
    vec3 moon = mix(mix(uMoonColor, uHorizon, 0.65), uMoonColor, smoothstep(0.0, 1.0, h));
    float cut = 0.0;
    if (h < uStripeTop) {
      float s = h / uStripeTop;
      float y = s * uStripeCount;
      float halfGap = mix(uGap.y, uGap.x, s) * 0.5;
      float nearest = y - halfGap + 0.5;
      float fromMiddle = abs(fract(nearest) - 0.5);
      float pixel = fwidth(y);
      float drawn = max(halfGap, pixel * 0.5);
      cut = 1.0 - smoothstep(drawn - pixel * 0.5, drawn + pixel * 0.5, fromMiddle);
      cut *= clamp(halfGap / drawn, 0.0, 1.0);
      cut *= step(nearest, uStripeCount);
    }
    // the halo hugs the lit crescent, not the whole disc (that would read as an eclipse)
    float halo = facing * 0.45 * exp(-max(r - 1.0, 0.0) / 0.35) * (1.0 - full);
    halo *= smoothstep(0.85, 1.4, shadowR);
    float shown = uMoon * night;
    color = mix(color, moon, lit * (1.0 - cut) * shown);
    color += mix(uMoonColor, uHorizon, 0.5) * halo * shown * t;

    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Sky dome and distance fog. The dome fades from the fog color at the horizon (and below it,
 * where the fogged ground ends) up to the sky color, so the ground melts into a glowing horizon.
 * Behind the car the sunset sky turns into night, with stars and a moon (NIGHT). Its uniforms
 * are scene.background and scene.fog.color themselves, so the GUI's sky and fog colors drive it;
 * `night` exposes the night uniforms to the GUI.
 *
 * @param {import("../world.js").WorldContext} context
 */
export function createSky({ scene }) {
  const top = new THREE.Color(SCENE.background);
  const fog = new THREE.Fog(SCENE.fog.color, SCENE.fog.near, SCENE.fog.far);
  scene.background = top;
  scene.fog = fog;

  const night = {
    color: { value: new THREE.Color(NIGHT.color) },
    reach: { value: NIGHT.reach },
    blend: { value: NIGHT.blend },
    stars: { value: NIGHT.stars },
    starColor: { value: new THREE.Color(NIGHT.starColor) },
    moon: { value: NIGHT.moon.show ? 1 : 0 },
    moonColor: { value: new THREE.Color(NIGHT.moon.color) },
    moonSize: { value: NIGHT.moon.size },
  };

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(DOME_RADIUS, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: top },
        uHorizon: { value: fog.color },
        uGlow: { value: SCENE.skyGlow },
        uNight: night.color,
        uNightReach: night.reach,
        uNightBlend: night.blend,
        uStars: night.stars,
        uStarColor: night.starColor,
        uMoon: night.moon,
        uMoonColor: night.moonColor,
        uMoonSize: night.moonSize,
        uMoonDirection: { value: new THREE.Vector3(...NIGHT.moon.direction).normalize() },
        // the moon's cuts are the sun's
        uStripeCount: { value: SUN.stripes.count },
        uStripeTop: { value: SUN.stripes.top },
        uGap: { value: new THREE.Vector2(...SUN.stripes.gap) },
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
  return { night };
}
