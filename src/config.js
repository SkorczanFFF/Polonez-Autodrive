/**
 * Single source of truth: palette, layer defaults, scene, gameplay, assets, keys and UI text.
 * Values are ported 1:1 from v1-legacy unless a comment says otherwise.
 * Per-frame constants are expressed in "units per 60 Hz frame" and scaled with core/time.js.
 */

export const PALETTE = {
  // UI colors (CSS) and the original 2024 scene palette, kept for the planned "Original" preset
  pink: "#c348dd",
  skyPink: "#eb94c1",
  violet: "#4f33d9",
  aqua: "#40d5db",
  blue: "#4790ff",
  yellow: "#ffebac",
  red: "#fc3b96",
  white: "#ededed",
  tweety: "#ffdf7c",
  laguna: "#3b8ceb",
  palm: "#56a0ff",
  rock: "#9047c3",
  rockLine: "#66b6cf",
  box: "#ffff00",
  uiDeep: "#004671",
  uiLoaderBg: "#215a7e",
  crtLine: "#eba2a2",
  // "Retrowave Dusk" scene palette (default): dark fills, neon lines
  night: "#1b0b3b", // sky
  void: "#0d0221", // ground, palm silhouettes
  dusk: "#261447", // road
  deepTeal: "#13304a", // rocks
  polonezBody: "#420d59", // the star: stands apart from the road; neon pink lines are its own
  grape: "#2a0a4a", // horizon hills
  plum: "#1e0f4f", // side hills
  horizon: "#920075", // fog: distant things sink into a magenta glow
  neonPink: "#ff2a6d",
  neonMagenta: "#f706cf",
  neonCyan: "#2de2e6",
  neonViolet: "#b967ff",
  neonOrange: "#ff8c1a",
  sunYellow: "#f9c80e",
  headlight: "#fff3c4",
  sunset: "#c2410c", // traffic bodies: burnt orange of the setting sun, pops against the magenta fog
};

/**
 * Scene layers: each one is a solid material plus a wireframe (or textured overlay) material.
 * The same definition drives material creation, the GUI and "Randomize all".
 *
 * @typedef {object} Layer
 * @property {string} label GUI folder name
 * @property {string} solid default solid color
 * @property {string} wire default wireframe / overlay color
 * @property {boolean} [toggleSolid] GUI exposes a "show model" toggle
 * @property {"phong" | "basic"} [wireType] wireframe material type (default phong)
 * @property {"roadline"} [wireMap] textured overlay instead of a wireframe
 * @property {boolean} [wireGrid] procedural line grid overlay instead of a wireframe
 * @property {number} [lineFade] WIRE.fade for this layer (lower: lines stay visible further)
 * @property {number} [lineMin] visibility (0..1) lines fade down to on tiny triangles (default 0)
 * @property {number} [glow] bloom on this layer's lines, 0..1 (default 1)
 * @property {"palms" | "rocks"} [density] GUI exposes a density slider for this spawner
 */

/** @type {Record<string, Layer>} */
export const LAYERS = {
  polonez: {
    label: "Polonez",
    solid: PALETTE.polonezBody,
    wire: PALETTE.neonPink,
    toggleSolid: true,
    lineFade: 1.5,
    lineMin: 0.2, // the far end of the car keeps a hint of its lines
    glow: 0.3, // its dense lines would blow out to white at full bloom
  },
  hills: { label: "Hills", solid: PALETTE.grape, wire: PALETTE.neonMagenta, toggleSolid: true },
  side: { label: "Side hills", solid: PALETTE.plum, wire: PALETTE.neonViolet, toggleSolid: true },
  road: { label: "Road", solid: PALETTE.dusk, wire: PALETTE.sunYellow, wireMap: "roadline" },
  terrain: { label: "Terrain", solid: PALETTE.void, wire: PALETTE.neonCyan, wireGrid: true },
  palm: {
    label: "Palms",
    solid: PALETTE.void,
    wire: PALETTE.neonOrange,
    toggleSolid: true,
    wireType: "basic",
    lineFade: 0.6, // dense leaves: lines faint where palms spawn, full from mid-distance
    glow: 0.5,
    density: "palms",
  },
  rock: {
    label: "Rocks",
    solid: PALETTE.deepTeal,
    wire: PALETTE.neonCyan,
    toggleSolid: true,
    wireType: "basic",
    density: "rocks",
  },
  traffic: {
    label: "Traffic",
    solid: PALETTE.sunset,
    wire: PALETTE.sunYellow, // sun colors: yellow lines on burnt orange
    toggleSolid: true,
    lineFade: 1.5, // far cars show their body; dense glowing lines would turn them into yellow blobs
  },
};

/**
 * World dimensions and motion. Ground size, texture tiling, scenery travel and speeds derive
 * from these values, so changing them rescales the scene consistently.
 */
export const WORLD = {
  length: 200, // scenery travels from -length/2 to +length/2; default fog end
  width: 200, // rock bands fit inside this width
  /**
   * Terrain and road are drawn this big (square), past the farthest fog the GUI allows, so the
   * ground reaches the horizon in full fog color and meets the sky gradient without a seam.
   */
  get groundSize() {
    return 2 * GUI.fogFar[1];
  },
  cellSize: 4, // units per ground texture tile (terrain grid and road lines)
  speed: 14.4, // units/s at speedMultiplier 1 (v1 ground: 0.06 tiles/frame; scenery was 200/14 = 14.3)
};

/** Procedural terrain grid (one cell per WORLD.cellSize). */
export const GRID = {
  halfWidth: 3 / 512, // line half-width in cells, as in the v1 gridline texture (6 px of 512)
};

export const ROAD = {
  width: 15.95,
  thickness: 0.02,
  lineInset: 0.15, // road-line overlay is this much narrower than the road
  lineY: 0.06, // overlay height above the road
  lineTilesAcross: 2, // road-line texture tiles across the road width
};

export const SUN = {
  top: PALETTE.sunYellow, // color at the top of the disc
  bottom: PALETTE.neonPink, // color at the horizon and of the halo
  disc: { radius: 200, position: [1, -20, -350] }, // centre on the horizon line
  /** Horizontal cuts in the lower part (fractions of the radius), wider towards the horizon. */
  stripes: { count: 6, top: 0.55, gap: [0.08, 0.55] },
  glow: 0.08, // halo falloff as a fraction of the radius
};

export const SCENE = {
  renderScale: 0.5, // intentionally blurry 80s look
  maxDelta: 0.1, // seconds; clamps frame delta after stalls
  background: PALETTE.night, // sky above the horizon glow
  skyGlow: 0.3, // horizon glow height (fog color -> sky color), as the sine of the view angle
  fog: {
    color: PALETTE.horizon,
    near: 32.5,
    get far() {
      return WORLD.length;
    },
  },
  camera: {
    fov: 90,
    near: 0.1,
    far: 1000,
    position: [0, 3, 7],
    target: [0, 1.8, 0],
    gamePosition: [0, 4, 7], // OrbitControls clamps it to maxDistance -> (0, 3.9, 6.68), as in v1
    transition: 1, // seconds for camera moves between menu and minigame
  },
  controls: {
    minDistance: 4.5,
    maxDistance: 7,
    minPolarAngle: 0.15 * Math.PI,
    maxPolarAngle: 0.55 * Math.PI,
  },
  lights: {
    color: PALETTE.white,
    /** Slightly above v1 (0.95): the low sunset light reaches flat ground less. */
    ambient: 1.05,
    /**
     * The sun as a wide light source: `samples` shadow-casting directional lights spread over
     * `spread` of the sun disc's apparent size, aimed from the middle of the visible sun. Their
     * overlapping shadows give the soft, wide-source shadow of v1 (five lights in a small arc)
     * and long sunset shadows towards the camera. Follows SUN, so resizing the sun reshapes it.
     */
    sun: {
      samples: 5,
      spread: 0.4, // fraction of the sun disc's apparent size covered by the samples
      intensity: 1.6, // total of all samples (v1: 1.3 from higher up)
      distance: 53, // light distance from the scene origin (shadow camera placement)
    },
    shadow: { mapSize: 1024, near: 1, far: 500, extent: 50, bias: 0, radius: 3 },
    /** three >= r155 dropped the implicit PI factor of "legacy" lights; restores the v1 brightness. */
    legacyScale: Math.PI,
  },
  /**
   * Pushes solid surfaces back so their wireframe children never z-fight (crisp, complete lines).
   * enabled: false reproduces the v1 look, where lines were thinner, dashed and shimmering.
   */
  polygonOffset: { enabled: true, factor: 1, units: 1 },
};

/**
 * Line overlay on models. "triangles": every triangle edge, as in v1; the dense lines also hide
 * small model flaws. "edges": ink-like outlines, only creases sharper than `edgeAngle`
 * (coloring-book look) — clean, but it exposes the off-centre wheel rims of wheel.fbx, so it
 * waits for a model fix.
 * width: triangle lines in world units, so they thin out with distance, never below a pixel
 * (scene/lines.js). fade: lines of triangles whose inradius on screen is below `fade` render
 * pixels fade out (gone at a quarter of it), so dense meshes far away show their fill; 0 = off.
 */
export const WIRE = {
  mode: /** @type {"edges" | "triangles"} */ ("triangles"),
  edgeAngle: 20, // degrees
  width: 0.02,
  fade: 2,
};

/**
 * Glow on the wireframes only (core/bloom.js): the wire twins sit on `layer`, everything else is
 * black in the glow pass. strength / radius as in UnrealBloomPass.
 */
export const BLOOM = {
  enabled: true,
  layer: 1,
  strength: 0.5,
  radius: 0.3,
};

/**
 * Solid surfaces. "toon": flat bands of color like crayon fills; "phong": smooth v1 shading.
 * toonSteps: light multipliers from surfaces facing away from the sun to facing it. The middle
 * band (0.2) keeps flat ground as bright as with Phong under the low sunset light.
 * flat: one shade per triangle. Some models ship smooth normals (all of hills.fbx), which
 * would bend the shading across faces so it no longer matches the wireframe lines.
 */
export const SHADING = {
  mode: /** @type {"toon" | "phong"} */ ("toon"),
  toonSteps: [0, 0.2, 1],
  flat: true,
};

export const CAR = {
  bodyX: -0.013,
  rollCenterY: 0.56, // the body rolls around the axle line, so the wheels stay on the road
  lift: 0.04, // raises body and wheels: v1 tires sat a few mm into the road and looked sunk
  /**
   * Wheel model origins (v1 placement): back-left, front-left, back-right, front-right.
   * The car faces -z, so wheels with z < 0 steer; right wheels (x > 0) are mirrored.
   */
  wheels: [
    [-1.227, 0.56, 1.975],
    [-1.227, 0.56, -2.55],
    [1.227, 0.56, 1.975],
    [1.227, 0.56, -2.55],
  ],
  steer: {
    baseSpeed: 0.08, // units per frame
    maxSpeed: 0.4, // units per frame
    holdAccel: 0.04, // extra target speed per second of holding a key
    speedEasing: 0.1, // per frame
    decel: 0.04, // units per frame, after release
    releaseDamp: 0.45, // speed multiplier on key release
    roadMargin: 1.975, // the car's travel limit stays this far from the road edge
    /** Max distance from the start position (6 with the default road). */
    get maxOffset() {
      return ROAD.width / 2 - this.roadMargin;
    },
  },
  handling: {
    /** Body roll (wheels stay upright). outward: true = realistic, false = lean into the turn (v1). */
    roll: { max: 0.08, easing: 0.15, outward: true },
    /** Nose turns towards the lane change: radians per unit/frame of lateral velocity. */
    yaw: { perSpeed: 0.75, max: 0.12, easing: 0.15 },
    /** Front wheel steering angle in radians. */
    wheelSteer: { max: (5 * Math.PI) / 180, easing: 0.2 },
  },
  resetDuration: 1, // seconds
};

export const SPEED = {
  wheelSpin: -0.22, // radians per frame
  traffic: 200 / 6, // units per second (v1: boxes crossed the 200-unit world in 6 s)
  tierEvery: 20, // points
  tierStep: 0.15, // speed multiplier added per tier
};

export const SPAWN = {
  startZ: -WORLD.length / 2,
  endZ: WORLD.length / 2,
  fadeIn: 0.5, // seconds spawned objects take to fade in (no popping up in front of the car)
  palms: {
    model: "palm",
    interval: 1.5,
    minInterval: 0.5,
    roadGap: 3.025, // distance from the road edge
    /** Both sides of the road (±11 with the default road). */
    get x() {
      const x = ROAD.width / 2 + this.roadGap;
      return [-x, x];
    },
  },
  /** v1 ran two 1.5 s intervals offset by half -> one 0.75 s interval. */
  rocks: {
    models: ["rockmd", "rocksm"],
    interval: 0.75,
    minInterval: 0.25,
    roadGap: 8.025, // closest distance to the road edge
    edgeMargin: 20, // closest distance to the terrain edge
    /** Bands left and right of the road ([-80, -16] and [16, 80] with the defaults). */
    get xRanges() {
      const inner = ROAD.width / 2 + this.roadGap;
      const outer = WORLD.width / 2 - this.edgeMargin;
      return [
        [-outer, -inner],
        [inner, outer],
      ];
    },
    scale: [1, 4],
  },
};

/**
 * @typedef {object} TrafficModel
 * @property {string} label
 * @property {number} width body width
 * @property {{ radius: number, axles: number[] }} wheel axles: x of each axle
 * @property {[number, number][]} profile lower body side outline, x from the rear bumper to the
 *   front, y up from the ground; wheel arches are cut into its bottom edge automatically
 * @property {[number, number][]} cabin greenhouse outline, bottom edge a little below the belt
 *   line (no gap to the body); it narrows to TRAFFIC.roofWidth at the roof
 * @property {number} [bumper] bumper height (default 0.32)
 * @property {{ shape: "round" | "rect", y: number, inset: number, size: number }} lights
 *   headlights on the front: height, inset from the body side, size
 */

/**
 * Minigame obstacles: oncoming low-poly cars of the communist era, built in code
 * (scene/traffic.js) from real dimensions in metres.
 */
export const TRAFFIC = {
  scale: 1.8, // metres -> scene units (the Polonez model is about 1.8x life size)
  y: 0.04, // above the road, as CAR.lift
  roofWidth: 0.8, // cabin width at the roof, fraction of the body width
  tireWidth: 0.17,
  /** @type {Record<string, TrafficModel>} */
  models: {
    fiat126p: {
      label: "Fiat 126p",
      width: 1.38,
      wheel: { radius: 0.27, axles: [0.6, 2.44] },
      profile: [
        [0.04, 0.2],
        [3.0, 0.2],
        [3.05, 0.34],
        [3.02, 0.66],
        [2.3, 0.86],
        [0.22, 0.86],
        [0.04, 0.76],
        [0, 0.38],
      ],
      cabin: [
        [0.3, 0.83],
        [2.28, 0.83],
        [1.85, 1.33],
        [0.78, 1.33],
      ],
      lights: { shape: "round", y: 0.58, inset: 0.24, size: 0.08 },
    },
    skoda120: {
      label: "Škoda 120",
      width: 1.62,
      wheel: { radius: 0.29, axles: [0.93, 3.33] },
      profile: [
        [0.05, 0.22],
        [4.1, 0.22],
        [4.16, 0.4],
        [4.14, 0.72],
        [4.0, 0.8],
        [3.0, 0.86],
        [0.7, 0.86],
        [0.05, 0.84],
        [0, 0.45],
      ],
      cabin: [
        [0.85, 0.83],
        [2.95, 0.83],
        [2.45, 1.4],
        [1.2, 1.4],
      ],
      lights: { shape: "rect", y: 0.6, inset: 0.3, size: 0.09 },
    },
  },
};

export const MINIGAME = {
  countdown: 3, // seconds
  trafficStartsAt: 1, // seconds into the countdown
  startLabelDuration: 1, // seconds "START!" stays visible
  gameOverDuration: 3, // seconds
  interval: [0.6, 1.3], // seconds, divided by the speed multiplier
  batch: [1, 3], // boxes in one lane before switching
  innerGap: 0.9,
  outerMargin: 0.5,
  safeZone: 0.1,
};

export const CRT = {
  enabled: true,
  lineColor: PALETTE.crtLine,
  lineOpacity: 0.15,
  flicker: true,
  flickerSpeed: 0.15, // seconds per flicker cycle
  flickerIntensity: 0.4,
};

/** KeyboardEvent.code values per action. */
export const KEYS = {
  start: ["Enter", "NumpadEnter"],
  free: ["KeyF"],
  exit: ["Escape"],
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  stats: ["F10"], // developer overlay, not advertised in the UI
  menu: ["KeyH"],
  glow: ["KeyG"],
};

export const GUI = {
  fogNear: [1, 200],
  lineWidth: [0.005, 0.1, 0.005],
  lineFade: [0, 4, 0.05],
  lineMin: [0, 1, 0.05],
  bloomStrength: [0, 3, 0.05],
  bloomRadius: [0, 1, 0.05],
  glow: [0, 1, 0.05],
  /** Upper bound follows the world, so the default fog end (WORLD.length) always fits. */
  get fogFar() {
    return [50, Math.max(400, 2 * WORLD.length)];
  },
  density: [0.1, 2, 0.1],
  crtOpacity: [0, 1, 0.05],
  crtSpeed: [0.05, 0.5, 0.01],
  crtIntensity: [0, 2, 0.1],
  randomizeDuration: 1, // seconds
};

export const STORAGE = {
  bestScore: "polonez-autodrive:best", // localStorage key
};

/** F10 developer overlay. */
export const DEVSTATS = {
  refresh: 1, // seconds between updates
  fpsGood: 55, // FPS at or above: aqua
  fpsWarn: 30, // FPS at or above: yellow, below: red
};

export const LOADER = {
  barLength: 20, // characters in the progress bar
  typeDelay: [0.03, 0.06], // seconds per typed character (random in range)
  messagePause: 0.5, // seconds between messages
  fadeDelay: 0.3, // seconds "SYSTEM READY!" stays before fading
  fadeDuration: 1, // seconds of the fade-out
};

export const ASSETS = {
  models: {
    polonez: "models/polonez.fbx",
    wheel: "models/wheel.fbx",
    hills: "models/hills.fbx",
    side: "models/side.fbx",
    palm: "models/palm.fbx",
    rockmd: "models/rockmd.fbx",
    rocksm: "models/rocksm.fbx",
  },
  textures: {
    roadline: "textures/roadline.png",
  },
};

export const TEXT = {
  loaderHeader: "AUTODRIVE.SYS",
  loaderIntro: "INITIALIZING POLONEZ AUTODRIVE SYSTEM...",
  loaderMessages: [
    "BOOTING SYSTEM...",
    "INITIALIZING GRAPHICS...",
    "LOADING VECTOR DATA...",
    "CHECKING SYSTEM...",
    "LOADING ASSETS...",
  ],
  loaderReady: "SYSTEM READY!",
  loaderError: "ERROR",
  loaderFailed: "SYSTEM FAILURE: REFRESH TO RETRY",
  loading: "LOADING",
  logoScript: "Polonez",
  logoCaps: "AUTODRIVE",
  menuStart: "MINI GAME", // same length as "FREE RIDE", so both buttons match
  menuFree: "FREE RIDE",
  again: "AGAIN",
  menu: "MENU",
  steer: "steer",
  exit: "exit",
  freeRide: "FREE RIDE",
  countdownGo: "START!",
  score: "SCORE",
  best: "BEST",
  level: "LVL",
  newBest: "NEW BEST!",
  gameOver: "Game Over",
  /** Keycap labels per action (see KEYS); keys with an icon (ui/icons.js) use them as names. */
  keys: {
    start: "Enter",
    free: "F",
    exit: "ESC",
    left: "Left arrow",
    right: "Right arrow",
    menu: "H",
    glow: "G",
  },
  menuHide: "Hide menu",
  menuShow: "Show menu",
  hide: "HIDE",
  gui: {
    title: "Controls",
    color: "Color",
    showModel: "Show model",
    wireColor: "Wireframe color",
    showWire: "Show wireframe",
    density: "Density",
    sun: "Sun",
    sunTop: "Sun color top",
    sunBottom: "Sun color bottom",
    sunEffect: "Show effect",
    crt: "CRT Effect",
    crtEnabled: "Show CRT effect",
    crtLineColor: "Scan line color",
    crtLineOpacity: "Scan line opacity",
    crtFlicker: "Enable flicker",
    crtFlickerSpeed: "Flicker speed",
    crtFlickerIntensity: "Flicker intensity",
    sky: "Sky color",
    fogColor: "Fog color",
    fogNear: "Fog near",
    fogFar: "Fog far",
    lineWidth: "Line width",
    lineFade: "Line fade",
    lineMin: "Line min",
    bloom: "Bloom",
    bloomEnabled: "Glow",
    bloomStrength: "Strength",
    bloomRadius: "Radius",
    glow: "Glow",
    randomize: "🎨 Randomize all",
  },
  statsPanel: {
    title: "SYS.MONITOR",
    fps: "FPS",
    calls: "DRAW CALLS",
    triangles: "TRIANGLES",
    geometries: "GEOMETRIES",
    textures: "TEXTURES",
    programs: "PROGRAMS",
  },
};
