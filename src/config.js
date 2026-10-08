/**
 * Single source of truth: palette, layer defaults, scene, gameplay, assets, keys and UI text.
 * Values are ported 1:1 from v1-legacy unless a comment says otherwise.
 * Per-frame constants are expressed in "units per 60 Hz frame" and scaled with core/time.js.
 */

export const PALETTE = {
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
 * @property {"roadline" | "grid"} [wireMap] textured overlay instead of a wireframe
 * @property {"palms" | "rocks"} [density] GUI exposes a density slider for this spawner
 */

/** @type {Record<string, Layer>} */
export const LAYERS = {
  polonez: { label: "Polonez", solid: PALETTE.laguna, wire: PALETTE.tweety, toggleSolid: true },
  hills: { label: "Hills", solid: PALETTE.violet, wire: PALETTE.pink, toggleSolid: true },
  side: { label: "Side hills", solid: PALETTE.blue, wire: PALETTE.violet, toggleSolid: true },
  road: { label: "Road", solid: PALETTE.pink, wire: PALETTE.aqua, wireMap: "roadline" },
  terrain: { label: "Terrain", solid: PALETTE.aqua, wire: PALETTE.pink, wireMap: "grid" },
  palm: {
    label: "Palms",
    solid: PALETTE.palm,
    wire: PALETTE.tweety,
    toggleSolid: true,
    wireType: "basic",
    density: "palms",
  },
  rock: {
    label: "Rocks",
    solid: PALETTE.rock,
    wire: PALETTE.rockLine,
    toggleSolid: true,
    wireType: "basic",
    density: "rocks",
  },
};

/**
 * World dimensions and motion. Ground size, texture tiling, scenery travel and speeds derive
 * from these values, so changing them rescales the scene consistently.
 */
export const WORLD = {
  length: 200, // ground length (z); scenery travels from -length/2 to +length/2
  width: 200, // ground width (x)
  cellSize: 4, // units per ground texture tile (terrain grid and road lines)
  speed: 14.4, // units/s at speedMultiplier 1 (v1 ground: 0.06 tiles/frame; scenery was 200/14 = 14.3)
};

export const ROAD = {
  width: 15.95,
  thickness: 0.02,
  lineInset: 0.15, // road-line overlay is this much narrower than the road
  lineY: 0.06, // overlay height above the road
  lineTilesAcross: 2, // road-line texture tiles across the road width
};

export const SUN = {
  top: PALETTE.yellow, // disc color
  bottom: PALETTE.red, // stripe overlay tint
  disc: { radius: 200, segments: 20, thetaLength: 3.1, position: [1, -20, -350], shininess: 20 },
  effect: { size: 460, position: [0, -35, -349.5], texture: "sun" },
};

export const SCENE = {
  renderScale: 0.5, // intentionally blurry 80s look
  maxDelta: 0.1, // seconds; clamps frame delta after stalls
  background: PALETTE.skyPink,
  fog: {
    color: PALETTE.pink,
    near: 32.5,
    get far() {
      return WORLD.length;
    },
  },
  camera: {
    fov: 90,
    near: 0.1,
    far: 1000,
    position: [0, 1.975, 7],
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
 */
export const WIRE = {
  mode: /** @type {"edges" | "triangles"} */ ("triangles"),
  edgeAngle: 20, // degrees
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
  box: 200 / 6, // units per second (v1: boxes crossed the 200-unit world in 6 s)
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

export const MINIGAME = {
  countdown: 3, // seconds
  boxesStartAt: 1, // seconds into the countdown
  startLabelDuration: 1, // seconds "START!" stays visible
  gameOverDuration: 3, // seconds
  box: { size: [4.25, 4, 6], color: PALETTE.box, y: 0 },
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
};

export const GUI = {
  fogNear: [1, 200],
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
    grid: "textures/gridline2.png",
    sun: "textures/suneffectalt.png",
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
