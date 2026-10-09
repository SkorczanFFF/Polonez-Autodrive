import GUI from "lil-gui";
import * as THREE from "three";
import { GUI as RANGES, LAYERS, SCENE, SUN, TEXT } from "../config.js";
import { BasicLineMaterial, PhongLineMaterial, lineWidth } from "../scene/lines.js";
import { setSceneColor } from "./theme.js";

/**
 * @typedef {object} SceneGuiDeps
 * @property {THREE.Scene} scene
 * @property {import("../scene/materials.js").Materials} materials
 * @property {ReturnType<typeof import("../scene/world.js").createWorld>} world
 * @property {ReturnType<typeof import("./crt.js").createCrt>} crt
 * @property {import("../core/tween.js").Tweens} tweens
 * @property {ReturnType<typeof import("../core/bloom.js").createBloom>} bloom
 */

const randomColor = () => `#${new THREE.Color(Math.random() * 0xffffff).getHexString()}`;

/**
 * Scene manipulation panel, built from config.LAYERS: every layer gets the same controls, and
 * every starting value comes from config, so the panel always shows what is rendered.
 *
 * @param {SceneGuiDeps} deps
 */
export function createSceneGui({ scene, materials, world, crt, tweens, bloom }) {
  const L = TEXT.gui;
  const gui = new GUI({ title: L.title });

  /** Color controllers, in creation order; "Randomize all" animates all of them. */
  /** @type {import("lil-gui").Controller[]} */
  const colors = [];

  /**
   * @param {GUI} folder
   * @param {Record<string, any>} params
   * @param {string} key
   * @param {string} label
   * @param {(hex: string) => void} apply
   */
  function color(folder, params, key, label, apply) {
    colors.push(folder.addColor(params, key).name(label).onChange(apply));
  }

  for (const [key, layer] of Object.entries(LAYERS)) {
    const folder = gui.addFolder(layer.label);
    const params = {
      color: layer.solid,
      showSolid: true,
      wire: layer.wire,
      showWire: true,
      density: 1,
    };
    const solid = materials.solid[key];
    const wire = materials.wire[key];

    color(folder, params, "color", L.color, (v) => {
      solid.color.set(v);
      setSceneColor(`${key}Solid`, v); // the logo wears the scene colors
    });
    if (layer.toggleSolid) {
      folder
        .add(params, "showSolid")
        .name(L.showModel)
        .onChange((v) => (solid.visible = v));
    }
    if (layer.density) {
      const spawner = world.parts.scenery[layer.density];
      folder
        .add(params, "density", ...RANGES.density)
        .name(L.density)
        .onChange((v) => (spawner.density = v));
    }
    color(folder, params, "wire", L.wireColor, (v) => {
      wire.color.set(v);
      setSceneColor(`${key}Wire`, v);
    });
    folder
      .add(params, "showWire")
      .name(L.showWire)
      .onChange((v) => (wire.visible = v));
    if (key === "polonez") {
      folder.add(lineWidth, "value", ...RANGES.lineWidth).name(L.lineWidth); // a shared uniform
    }
    if (wire instanceof BasicLineMaterial || wire instanceof PhongLineMaterial) {
      const { fade, min } = wire.lineUniforms;
      folder.add(fade, "value", ...RANGES.lineFade).name(L.lineFade);
      folder.add(min, "value", ...RANGES.lineMin).name(L.lineMin);
      folder.add(wire.userData, "glow", ...RANGES.glow).name(L.glow);
    }
    folder.close();
  }

  const sunParams = { top: SUN.top, bottom: SUN.bottom, effect: true };
  const sun = gui.addFolder(L.sun);
  color(sun, sunParams, "top", L.sunTop, (v) => {
    materials.sun.topColor.set(v);
    setSceneColor("sunTop", v);
  });
  color(sun, sunParams, "bottom", L.sunBottom, (v) => {
    materials.sun.bottomColor.set(v);
    setSceneColor("sunBottom", v);
  });
  sun
    .add(sunParams, "effect")
    .name(L.sunEffect)
    .onChange((v) => (materials.sun.effect = v));
  sun.close();

  const bloomFolder = gui.addFolder(L.bloom);
  bloomFolder.add(bloom, "strength", ...RANGES.bloomStrength).name(L.bloomStrength);
  bloomFolder.add(bloom, "radius", ...RANGES.bloomRadius).name(L.bloomRadius);
  bloomFolder.close();

  const c = crt.state;
  const crtFolder = gui.addFolder(L.crt);
  crtFolder.add(c, "enabled").name(L.crtEnabled).onChange(crt.apply);
  color(crtFolder, c, "lineColor", L.crtLineColor, crt.apply);
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

  const fog = /** @type {THREE.Fog} */ (scene.fog);
  const background = /** @type {THREE.Color} */ (scene.background);
  const sceneParams = { ...SCENE.fog, sky: SCENE.background };
  const environment = gui.addFolder(L.environment);
  color(environment, sceneParams, "sky", L.sky, (v) => background.set(v));
  color(environment, sceneParams, "color", L.fogColor, (v) => fog.color.set(v));
  environment
    .add(sceneParams, "near", ...RANGES.fogNear)
    .name(L.fogNear)
    .onChange((v) => (fog.near = v));
  environment
    .add(sceneParams, "far", ...RANGES.fogFar)
    .name(L.fogFar)
    .onChange((v) => (fog.far = v));
  environment.close();

  gui.add(bloom, "enabled").name(`${L.bloomEnabled} (${TEXT.keys.glow})`).listen(); // G too

  /** @type {import("../core/tween.js").TweenHandle | null} */
  let randomizing = null;
  const from = new THREE.Color();
  const to = new THREE.Color();
  const mixed = new THREE.Color();

  /** Blends every color control to a random color; the controllers' onChange applies it. */
  function randomize() {
    if (randomizing?.isActive()) return;
    const targets = colors.map((controller) => ({
      controller,
      from: /** @type {string} */ (controller.getValue()),
      to: randomColor(),
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

  gui.add({ randomize }, "randomize").name(L.randomize);

  // lil-gui stops key events while one of its controls is focused; give focus back after each
  // edit or folder toggle, so ENTER / F / arrows reach the game without clicking the scene.
  const releaseFocus = () => {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && gui.domElement.contains(focused)) focused.blur();
  };
  gui.onFinishChange(releaseFocus);
  gui.onOpenClose(releaseFocus);

  return {
    gui,
    randomize,
    show: () => gui.show(),
    hide: () => gui.hide(),
  };
}
