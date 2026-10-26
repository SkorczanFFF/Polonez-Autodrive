import "@fontsource/yellowtail/latin.css";
import "@fontsource/vt323/latin.css";
import "./style.css";
import * as THREE from "three";
import { ASSETS, TEXT } from "./config.js";
import { createView } from "./core/renderer.js";
import { createLoop } from "./core/loop.js";
import { detectDevice } from "./core/device.js";
import { loadAssets } from "./core/assets.js";
import { createTweens } from "./core/tween.js";
import { createInput } from "./core/input.js";
import { createMaterials } from "./scene/materials.js";
import { createWorld } from "./scene/world.js";
import { createCar } from "./scene/car.js";
import { createMinigame } from "./game/minigame.js";
import { createGame } from "./game/game.js";
import { applyTheme } from "./ui/theme.js";
import { createLoader } from "./ui/loader.js";
import { createHud } from "./ui/hud.js";
import { createCrt } from "./ui/crt.js";
import { createSceneGui } from "./ui/gui.js";
import { createDevStats } from "./ui/devstats.js";
import { inject } from "@vercel/analytics";

async function main() {
  // Match the v1 (r116) look: colors are used as-is and the output stays linear (ui/color.js and
  // core/renderer.js count on it).
  THREE.ColorManagement.enabled = false;

  applyTheme();
  const device = detectDevice();
  const crt = createCrt();

  const view = createView();
  const loop = createLoop(view.renderer, view.render);
  const loader = createLoader();
  loop.add(loader.update);
  loop.start();

  let assets;
  try {
    assets = await loadAssets(ASSETS, loader.manager);
  } catch (error) {
    loader.fail(TEXT.loaderFailed);
    throw error;
  }

  const { models, textures } = assets;
  const materials = createMaterials(textures, view.renderer.capabilities.getMaxAnisotropy());
  const world = createWorld({ scene: view.scene, materials, models });
  const car = createCar({ scene: view.scene, materials, models });
  const minigame = createMinigame({ scene: view.scene, car, materials });

  const tweens = createTweens();
  const input = createInput();
  const hud = createHud(input);
  const menu = createSceneGui({
    scene: view.scene,
    materials,
    world,
    crt,
    tweens,
    bloom: view.bloom,
    device,
  });
  const game = createGame({ view, world, car, minigame, tweens, input, hud, menu });
  const stats = createDevStats(view.renderer, input);

  loop.add(tweens.update);
  loop.add(world.update);
  loop.add(game.update);
  loop.add(stats.update);

  loader.finish();

  if (import.meta.env.DEV)
    Object.assign(window, {
      app: {
        view,
        loop,
        tweens,
        input,
        materials,
        world,
        car,
        minigame,
        game,
        menu,
        crt,
        stats,
        hud,
        models,
      },
    });
}

// Page views, also of visits where the scene fails to start (vite.config.js sets the flag).
if (import.meta.env.VERCEL) inject();

main().catch((error) => console.error("Failed to initialize application:", error));
