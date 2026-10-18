import GUI, { ColorController } from "lil-gui";
import * as THREE from "three";
import { ACTIONS, GUI as RANGES, LAYERS, NIGHT, SCENE, SUN, TEXT } from "../config.js";
import { isLineMaterial, lineWidth } from "../scene/lines.js";
import { randomSeed } from "../scene/mountains.js";
import { createRandomPalette } from "./randomPalette.js";
import { setSceneColor } from "./theme.js";

/**
 * @typedef {object} SceneGuiDeps
 * @property {THREE.Scene} scene
 * @property {import("../scene/materials.js").Materials} materials
 * @property {ReturnType<typeof import("../scene/world.js").createWorld>} world
 * @property {ReturnType<typeof import("./crt.js").createCrt>} crt
 * @property {import("../core/tween.js").Tweens} tweens
 * @property {ReturnType<typeof import("../core/bloom.js").createBloom>} bloom
 * @property {ReturnType<typeof import("../core/device.js").detectDevice>} device
 */

/**
 * lil-gui shows a color as "f749ae" in its text field; show "#f749ae", so a typed or pasted
 * "#hex" fits the field (lil-gui parses it with or without the "#").
 *
 * @param {import("lil-gui").Controller} controller
 */
function showHash(controller) {
  if (!(controller instanceof ColorController)) return;
  const updateDisplay = controller.updateDisplay.bind(controller);
  controller.updateDisplay = () => {
    updateDisplay();
    if (!controller._textFocused) controller.$text.value = controller.$input.value;
    return controller;
  };
  controller.updateDisplay();
}

/**
 * Scene manipulation panel, built from config.LAYERS: every layer gets the same controls. The
 * controls edit the live objects (materials, uniforms, spawners), so the panel always shows what
 * is rendered; colors go through plain params, as each change also feeds the UI theme.
 *
 * @param {SceneGuiDeps} deps
 */
export function createSceneGui({ scene, materials, world, crt, tweens, bloom, device }) {
  const L = TEXT.gui;
  const { touch, small } = device; // touch screens: no keys to hint at
  // touchStyles: lil-gui would make every row taller and its font smaller on touch screens;
  // the compact terminal look reads better there too (its typings say number, it is a boolean)
  const gui = new GUI({ title: L.title, touchStyles: /** @type {any} */ (false) });

  /**
   * What "Randomize all" gives a color control (ui/randomPalette.js); a layer's line is picked
   * against its own fill.
   *
   * @typedef {{ role: import("./randomPalette.js").PaletteRole, layer?: string }} ColorRole
   */

  /** Color controllers, in creation order; "Randomize all" animates all of them. */
  /** @type {(ColorRole & { controller: import("lil-gui").Controller })[]} */
  const colors = [];

  /**
   * @param {GUI} folder
   * @param {Record<string, any>} params
   * @param {string} key
   * @param {string} label
   * @param {ColorRole} as
   * @param {(hex: string) => void} apply
   */
  function color(folder, params, key, label, as, apply) {
    const controller = folder.addColor(params, key).name(label).onChange(apply);
    showHash(controller);
    colors.push({ ...as, controller });
  }

  /**
   * A layer's folder (config.LAYERS): its fill and lines.
   *
   * @param {string} key
   */
  function layer(key) {
    const layer = LAYERS[key];
    const folder = gui.addFolder(layer.label);
    const params = { color: layer.solid, wire: layer.wire };
    const solid = materials.solid[key];
    const wire = materials.wire[key];

    color(folder, params, "color", L.color, { role: "solid", layer: key }, (v) => {
      solid.color.set(v);
      setSceneColor(`${key}Solid`, v); // the logo wears the scene colors
    });
    if (layer.toggleSolid) folder.add(solid, "visible").name(L.showModel);
    if (layer.density) {
      folder
        .add(world.settings.density[layer.density], "density", ...RANGES.density)
        .name(L.density);
    }
    color(folder, params, "wire", L.wireColor, { role: "wire", layer: key }, (v) => {
      wire.color.set(v);
      setSceneColor(`${key}Wire`, v);
    });
    folder.add(wire, "visible").name(L.showWire);
    if (key === "polonez") {
      folder.add(lineWidth, "value", ...RANGES.lineWidth).name(L.lineWidth); // a shared uniform
    }
    if (isLineMaterial(wire)) {
      const { fade, min } = wire.lineUniforms;
      folder.add(fade, "value", ...RANGES.lineFade).name(L.lineFade);
      folder.add(min, "value", ...RANGES.lineMin).name(L.lineMin);
      folder.add(wire.userData, "glow", ...RANGES.glow).name(L.glow);
    }
    folder.close();
    return folder;
  }

  /** Sun disc colors and stripes. */
  function addSun() {
    const sunParams = { top: SUN.top, bottom: SUN.bottom };
    const sun = gui.addFolder(L.sun);
    color(sun, sunParams, "top", L.sunTop, { role: "sunTop" }, (v) => {
      materials.sun.topColor.set(v);
      setSceneColor("sunTop", v);
    });
    color(sun, sunParams, "bottom", L.sunBottom, { role: "sunBottom" }, (v) => {
      materials.sun.bottomColor.set(v);
      setSceneColor("sunBottom", v);
    });
    sun.add(materials.sun, "effect").name(L.sunEffect);
    sun.close();
  }

  /** Glow strength and spread. */
  function addBloom() {
    const bloomFolder = gui.addFolder(L.bloom);
    bloomFolder.add(bloom, "strength", ...RANGES.bloomStrength).name(L.bloomStrength);
    bloomFolder.add(bloom, "radius", ...RANGES.bloomRadius).name(L.bloomRadius);
    bloomFolder.close();
  }

  /** The CRT overlay. */
  function addCrt() {
    const c = crt.state;
    const crtFolder = gui.addFolder(L.crt);
    crtFolder.add(c, "enabled").name(L.crtEnabled).onChange(crt.apply);
    color(crtFolder, c, "lineColor", L.crtLineColor, { role: "crt" }, crt.apply);
    crtFolder
      .add(c, "lineOpacity", ...RANGES.crtOpacity)
      .name(L.crtLineOpacity)
      .onChange(crt.apply);
    crtFolder.add(c, "flicker").name(L.crtFlicker).onChange(crt.apply);
    crtFolder
      .add(c, "flickerSpeed", ...RANGES.crtSpeed)
      .name(L.crtFlickerSpeed)
      .onChange(crt.apply);
    crtFolder
      .add(c, "flickerIntensity", ...RANGES.crtIntensity)
      .name(L.crtFlickerIntensity)
      .onChange(crt.apply);
    crtFolder.close();
  }

  /** Sky and fog colors, fog distance, and the landscape seed. */
  function addEnvironment() {
    const fog = /** @type {THREE.Fog} */ (scene.fog);
    const background = /** @type {THREE.Color} */ (scene.background);
    const sceneParams = { ...SCENE.fog, sky: SCENE.background };
    const environment = gui.addFolder(L.environment);
    color(environment, sceneParams, "sky", L.sky, { role: "sky" }, (v) => background.set(v));
    color(environment, sceneParams, "color", L.fogColor, { role: "fog" }, (v) => fog.color.set(v));
    environment
      .add(sceneParams, "near", ...RANGES.fogNear)
      .name(L.fogNear)
      .onChange((v) => (fog.near = v));
    environment
      .add(sceneParams, "far", ...RANGES.fogFar)
      .name(L.fogFar)
      .onChange((v) => (fog.far = v));

    // the landscape: mountains, horizon range and city all come from this seed
    const seed = environment.add(mountains, "seed").step(1).name(L.seed).onFinishChange(regenerate);
    const newLandscape = () => {
      mountains.seed = randomSeed();
      seed.updateDisplay();
      regenerate();
    };
    environment.add({ newLandscape }, "newLandscape").name(L.newLandscape);
    environment.close();
  }

  /** The city's folder: its layer, then its layout and haze. */
  function addCity() {
    const folder = layer("city");
    const { city } = world.settings;
    folder
      .add(city.params, "buildings", ...RANGES.cityBuildings)
      .name(L.cityBuildings)
      .onChange(city.regenerate);
    folder
      .add(city.params, "height", ...RANGES.cityHeight)
      .name(L.cityHeight)
      .onChange(city.regenerate);
    folder
      .add(city.params, "lit", ...RANGES.cityLit)
      .name(L.cityLit)
      .onChange(city.regenerate);
    folder.add(city.haze.amount, "value", ...RANGES.cityHaze).name(L.cityHaze);
    folder.add(city.haze.height, "value", ...RANGES.cityHazeHeight).name(L.cityHazeHeight);
  }

  /** The night sky behind the car. */
  function addNight() {
    const { night } = world.settings;
    const nightParams = {
      color: NIGHT.color,
      starColor: NIGHT.starColor,
      moon: NIGHT.moon.show,
      moonColor: NIGHT.moon.color,
    };
    const nightFolder = gui.addFolder(L.night);
    color(nightFolder, nightParams, "color", L.nightColor, { role: "night" }, (v) =>
      night.color.value.set(v),
    );
    nightFolder.add(night.reach, "value", ...RANGES.nightReach).name(L.nightReach);
    nightFolder.add(night.blend, "value", ...RANGES.nightBlend).name(L.nightBlend);
    nightFolder.add(night.stars, "value", ...RANGES.stars).name(L.stars);
    color(nightFolder, nightParams, "starColor", L.starColor, { role: "stars" }, (v) =>
      night.starColor.value.set(v),
    );
    nightFolder
      .add(nightParams, "moon")
      .name(L.moon)
      .onChange((v) => (night.moon.value = v ? 1 : 0));
    color(nightFolder, nightParams, "moonColor", L.moonColor, { role: "moon" }, (v) =>
      night.moonColor.value.set(v),
    );
    nightFolder.add(night.moonSize, "value", ...RANGES.moonSize).name(L.moonSize);
    nightFolder.close();
  }

  // A rebuild of the landscape takes ~6 ms: live while dragging; the seed when typed in.
  const { mountains } = world.settings;
  const { regenerate } = world;

  /** The mountain generator's shape (the seed is global: it builds the city too). */
  function addMountains() {
    const mountainFolder = gui.addFolder(L.mountains);
    mountainFolder
      .add(mountains, "height", ...RANGES.mountainHeight)
      .name(L.mountainHeight)
      .onChange(regenerate);
    mountainFolder
      .add(mountains, "roughness", ...RANGES.mountainRoughness)
      .name(L.mountainRoughness)
      .onChange(regenerate);
    mountainFolder
      .add(mountains, "start", ...RANGES.mountainStart)
      .name(L.mountainStart)
      .onChange(regenerate);
    mountainFolder.close();
  }

  // Thematic order: the cars and the sun ahead, the road and its sides, the landscape, the night
  // and the air, the effects; the global switches last.
  layer("polonez");
  layer("traffic");
  addSun();
  for (const key of ["road", "terrain", "palm", "rock"]) layer(key);
  addMountains();
  layer("hills");
  layer("side");
  addCity();
  addNight();
  addEnvironment();
  addBloom();
  addCrt();

  const glowName = touch ? L.bloomEnabled : `${L.bloomEnabled} (${ACTIONS.glow.label})`;
  gui.add(bloom, "enabled").name(glowName).listen(); // G too

  /** @type {import("../core/tween.js").TweenHandle | null} */
  let randomizing = null;
  const from = new THREE.Color();
  const to = new THREE.Color();
  const mixed = new THREE.Color();

  /**
   * Blends every color control to a fresh random palette (night, day or mixed, lines always
   * readable against their fill, see ui/randomPalette.js); the controllers' onChange applies it.
   */
  function randomize() {
    if (randomizing?.isActive()) return;
    const palette = createRandomPalette();
    /** @type {Record<string, string>} new fill per layer, for its line */
    const fills = {};
    const targets = colors.map(({ controller, role, layer = "" }) => ({
      controller,
      from: /** @type {string} */ (controller.getValue()),
      to:
        role === "wire"
          ? palette.wire(fills[layer])
          : role === "solid"
            ? (fills[layer] = palette.solid())
            : palette[role](),
    }));
    randomizing = tweens.add({
      duration: RANGES.randomizeDuration,
      onUpdate: (t) => {
        for (const target of targets) {
          mixed.lerpColors(from.set(target.from), to.set(target.to), t);
          target.controller.setValue(`#${mixed.getHexString()}`);
        }
      },
    });
  }

  // the emoji gets its own box, so it can sit centered on the label (fonts differ in metrics)
  const randomizeButton = gui.add({ randomize }, "randomize").name(L.randomize);
  randomizeButton.domElement.classList.add("gui-randomize");
  const icon = document.createElement("span");
  icon.className = "gui-randomize__icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = L.randomizeIcon;
  randomizeButton.$name.prepend(icon);

  // Small screens (.is-compact in CSS: folded, just the title; open, at most the screen width) and
  // touch screens start folded, as the open panel covers most of the screen.
  const applyCompact = () => gui.domElement.classList.toggle("is-compact", small.matches);
  small.addEventListener("change", applyCompact);
  applyCompact();
  if (small.matches || touch) gui.close();

  // lil-gui stops key events while one of its controls is focused; give focus back after each
  // edit or folder toggle, so ENTER / F / arrows reach the game without clicking the scene.
  const releaseFocus = () => {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && gui.domElement.contains(focused)) focused.blur();
  };
  gui.onFinishChange(releaseFocus);
  gui.onOpenClose(releaseFocus);

  return {
    show: () => gui.show(),
    hide: () => gui.hide(),
  };
}
