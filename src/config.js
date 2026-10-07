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
  fog: { color: PALETTE.pink, near: 32.5, far: 200 },
  camera: {
    fov: 90,
    near: 0.1,
    far: 1000,
    position: [0, 1.975, 7],
    target: [0, 1.8, 0],
    gamePosition: [0, 4, 7], // OrbitControls clamps it to maxDistance -> (0, 3.9, 6.68), as in v1
  },
  controls: {
    minDistance: 4.5,
    maxDistance: 7,
    minPolarAngle: 0.15 * Math.PI,
    maxPolarAngle: 0.55 * Math.PI,
  },
  lights: {
    color: PALETTE.white,
    ambient: 0.95,
    /** [x, y, z, intensity]; every light casts shadows (as in v1). */
    directional: [
      [0, 15, -50, 0.5],
      [-5, 17, -50, 0.25],
      [5, 17, -50, 0.25],
      [-10, 20, -50, 0.15],
      [10, 20, -50, 0.15],
    ],
    shadow: { mapSize: 1024, near: 1, far: 500, extent: 50, bias: 0 },
    /** three >= r155 dropped the implicit PI factor of "legacy" lights; restores the v1 brightness. */
    legacyScale: Math.PI,
  },
  /** Pushes solid surfaces back so their wireframe children never z-fight. */
  polygonOffset: { factor: 1, units: 1 },
  terrain: { size: 200 },
  road: { width: 15.95, length: 200, thickness: 0.02, lineWidth: 15.8, lineY: 0.06 },
  textures: {
    roadline: { repeat: [2, 50], wrap: "mirrored" },
    grid: { repeat: [50, 50], wrap: "repeat" },
    sun: { repeat: [1, 1], wrap: "repeat" },
  },
};

export const CAR = {
  bodyX: -0.013,
  /** back-left, front-left, back-right, front-right; right wheels are mirrored. */
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
    maxAngle: 0.1, // radians of tilt
    angleEasing: 0.15, // per frame
    maxOffset: 6, // max distance from the start position
  },
  resetDuration: 1, // seconds
};

export const SPEED = {
  textureScroll: 0.06, // UV offset per frame
  wheelSpin: -0.22, // radians per frame
  scenery: 200 / 14, // units per second (v1: z -100 -> 100 in 14 s)
  box: 200 / 6, // units per second (v1: 6 s)
  tierEvery: 20, // points
  tierStep: 0.15, // speed multiplier added per tier
};

export const SPAWN = {
  startZ: -100,
  endZ: 100,
  palms: { model: "palm", interval: 1.5, minInterval: 0.5, x: [-11, 11] },
  /** v1 ran two 1.5 s intervals offset by half -> one 0.75 s interval. */
  rocks: {
    models: ["rockmd", "rocksm"],
    interval: 0.75,
    minInterval: 0.25,
    xRanges: [
      [-80, -16],
      [16, 80],
    ],
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
  stats: ["F10"],
};

export const GUI = {
  fogNear: [1, 200],
  fogFar: [50, 400],
  density: [0.1, 2, 0.1],
  crtOpacity: [0, 1, 0.05],
  crtSpeed: [0.05, 0.5, 0.01],
  crtIntensity: [0, 2, 0.1],
  randomizeDuration: 1, // seconds
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
  promptStart: "Press <b>ENTER</b> to start minigame",
  promptFree: "Press <b>F</b> for free ride",
  promptExit: "Press <b>ESC</b> to exit",
  countdownGo: "START!",
  score: "SCORE",
  gameOver: "GAME OVER",
};
