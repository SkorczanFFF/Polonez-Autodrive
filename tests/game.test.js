import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { MINIGAME } from "../src/config.js";
import { createInput } from "../src/core/input.js";
import { createTweens } from "../src/core/tween.js";
import { createGame } from "../src/game/game.js";

/** A game with stand-ins for the scene, HUD and GUI; `crashNext` makes the next update crash. */
function setup() {
  const camera = new THREE.PerspectiveCamera();
  const controls = { enabled: true, target: new THREE.Vector3(), update() {} };
  const world = { speedMultiplier: 1 };
  const calls = { minigameReset: 0, menuShow: 0, menuHide: 0 };
  const state = { crashNext: false };
  const minigame = {
    score: 7,
    spawning: false,
    reset: () => calls.minigameReset++,
    update: () => ({ crashed: state.crashNext, scored: false }),
  };
  const car = { steering: false, reset() {}, update() {}, release() {} };
  const hud = new Proxy({}, { get: () => () => {} }); // every HUD call is a no-op
  const menu = { show: () => calls.menuShow++, hide: () => calls.menuHide++ };
  const tweens = createTweens();
  const input = createInput(new EventTarget());
  const view = { camera, controls };
  const game = createGame(
    /** @type {any} */ ({ view, world, car, minigame, tweens, input, hud, menu }),
  );

  /** @param {number} seconds */
  const run = (seconds, dt = 1 / 60) => {
    for (let t = 0; t < seconds - 1e-9; t += dt) {
      tweens.update(dt);
      game.update(dt);
    }
  };

  const crash = () => {
    input.dispatch("start");
    run(MINIGAME.countdown + 0.1);
    world.speedMultiplier = 1.3; // a later tier
    state.crashNext = true;
    run(1 / 60);
    state.crashNext = false;
  };

  return { game, input, world, camera, calls, run, crash };
}

describe("crash", () => {
  it("brakes the world to a halt and keeps the traffic and the game camera", () => {
    const { game, world, camera, calls, run, crash } = setup();
    crash();
    expect(game.state).toBe("gameover");
    const resets = calls.minigameReset;
    const shows = calls.menuShow;
    const cameraAt = camera.position.clone();

    run(MINIGAME.crash.stop / 2);
    expect(world.speedMultiplier).toBeGreaterThan(0);
    expect(world.speedMultiplier).toBeLessThan(1.3 / 2); // hard at first
    run(MINIGAME.crash.shake);
    expect(world.speedMultiplier).toBe(0);
    expect(camera.position.distanceTo(cameraAt)).toBeCloseTo(0); // shake over, back in place
    expect(calls.minigameReset).toBe(resets); // traffic stays where it hit
    expect(calls.menuShow).toBe(shows); // the scene GUI waits
  });

  it("shakes the camera, fading out", () => {
    const { camera, run, crash } = setup();
    crash();
    const cameraAt = camera.position.clone();
    run(0.05);
    expect(camera.position.distanceTo(cameraAt)).toBeGreaterThan(0);
    expect(camera.position.distanceTo(cameraAt)).toBeLessThan(MINIGAME.crash.shakeAmount * 2);
  });

  it("ignores keys and buttons until the lock is over", () => {
    const { game, input, run, crash } = setup();
    crash();
    input.dispatch("start");
    input.dispatch("exit");
    expect(game.state).toBe("gameover");
    run(MINIGAME.crash.lock);
    input.dispatch("start");
    expect(game.state).toBe("countdown");
  });

  it("brings the camera, speed and scene GUI back on leaving to the menu", () => {
    const { game, input, world, calls, run, crash } = setup();
    crash();
    run(MINIGAME.crash.lock);
    const resets = calls.minigameReset;
    input.dispatch("exit");
    expect(game.state).toBe("idle");
    expect(world.speedMultiplier).toBe(1);
    expect(calls.minigameReset).toBe(resets + 1);
    expect(calls.menuShow).toBe(1);
  });

  it("leaves the minigame for free ride too", () => {
    const { game, input, world, calls, run, crash } = setup();
    crash();
    run(MINIGAME.crash.lock);
    input.dispatch("free");
    expect(game.state).toBe("free");
    expect(world.speedMultiplier).toBe(1);
    expect(calls.menuShow).toBe(1);
  });
});
