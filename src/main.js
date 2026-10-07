import "./style.css";
import { ASSETS } from "./config.js";
import { createView } from "./core/renderer.js";
import { createLoop } from "./core/loop.js";
import { loadAssets } from "./core/assets.js";
import { createMaterials } from "./scene/materials.js";
import { createWorld } from "./scene/world.js";

async function main() {
  const view = createView();
  const { textures } = await loadAssets({ textures: ASSETS.textures });

  const materials = createMaterials(textures, view.renderer.capabilities.getMaxAnisotropy());
  const world = createWorld({ scene: view.scene, materials, textures });

  const loop = createLoop(view.renderer, view.render);
  loop.add(world.update);
  loop.start();

  if (import.meta.env.DEV) Object.assign(window, { app: { view, materials, world } });
}

main().catch((error) => console.error("Failed to initialize application:", error));
