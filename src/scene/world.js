import { createSky } from "./environment/sky.js";
import { createLights } from "./environment/lights.js";
import { createGround } from "./environment/ground.js";
import { createSun } from "./environment/sun.js";
import { createHills } from "./environment/hills.js";
import { createSideHills } from "./environment/sideHills.js";
import { createScenery } from "./environment/scenery.js";
import { createCity } from "./environment/city.js";
import { createMountainParams } from "./mountains.js";

/**
 * @typedef {object} WorldAssets
 * @property {import("three").Scene} scene
 * @property {import("./materials.js").Materials} materials
 * @property {Record<string, import("three").Group>} models
 */

/**
 * @typedef {WorldAssets & { mountains: import("./mountains.js").MountainParams }} WorldContext
 *   mountains: live generator settings shared by the side mountains and the horizon range
 */

/**
 * Every environment part follows this shape; parts are independent and can be swapped
 * (e.g. other mountains, a different sky) without touching the rest.
 *
 * @typedef {object} WorldPart
 * @property {(dt: number, speedMultiplier: number) => void} [update]
 */

/** @typedef {(context: WorldContext) => WorldPart} WorldPartFactory */

/**
 * The environment the car drives through. Owns the world speed shared by everything that
 * moves with the ground.
 *
 * @param {WorldAssets} assets
 */
export function createWorld(assets) {
  /** @type {WorldContext} */
  const context = { ...assets, mountains: createMountainParams() };

  // Order = update order. Swap a factory to replace a part.
  const parts = {
    sky: createSky(context),
    lights: createLights(context),
    ground: createGround(context),
    sun: createSun(context),
    hills: createHills(context),
    sideHills: createSideHills(context),
    scenery: createScenery(context),
    city: createCity(context),
  };
  // parts may expose more (regenerate, densities); the loop only needs update()
  const ordered = /** @type {WorldPart[]} */ (Object.values(parts));

  const world = {
    /** Named parts (tests, debugging); the loop only needs update(). */
    parts,

    /**
     * What the scene panel edits, gathered here so the panel never reaches into a part (a part
     * can be swapped by changing this list): the mountain generator settings (then
     * regenerate()), the night sky's uniforms, the city's layout (then city.regenerate()) and
     * haze, and the roadside spawners (`density`).
     */
    settings: {
      mountains: context.mountains,
      night: parts.sky.night,
      city: { params: parts.city.params, haze: parts.city.haze, regenerate: parts.city.regenerate },
      density: { palms: parts.scenery.palms, rocks: parts.scenery.rocks },
    },

    /** 1 = base speed; the minigame raises it per tier. */
    speedMultiplier: 1,

    /** Rebuilds the landscape from settings.mountains: everything that grows from its seed. */
    regenerate() {
      parts.sideHills.regenerate();
      parts.hills.regenerate();
      parts.city.regenerate(); // built from the same seed
    },

    /** @param {number} dt */
    update(dt) {
      for (const part of ordered) part.update?.(dt, world.speedMultiplier);
    },
  };

  return world;
}
