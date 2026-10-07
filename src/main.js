import "@fontsource/pacifico/latin.css";
import "./style.css";
import { ASSETS, TEXT } from "./config.js";
import { createView } from "./core/renderer.js";
import { createLoop } from "./core/loop.js";
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

async function main() {
  applyTheme();

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
  const hud = createHud(input.dispatch);
  const game = createGame({ view, world, car, minigame, tweens, input, hud });

  loop.add(tweens.update);
  loop.add(world.update);
  loop.add(game.update);

  loader.finish();

  if (import.meta.env.DEV)
    Object.assign(window, {
      app: { view, loop, tweens, input, materials, world, car, minigame, game, models },
    });
}

main().catch((error) => console.error("Failed to initialize application:", error));
