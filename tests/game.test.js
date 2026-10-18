import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { MINIGAME, SCENE, CAR } from "../src/config.js";
import { createInput } from "../src/core/input.js";
import { createTweens } from "../src/core/tween.js";
import { createGame } from "../src/game/game.js";

/** A game with stand-ins for the scene, HUD and GUI; `crashNext` makes the next update crash. */
function setup() {
  const camera = new THREE.PerspectiveCamera();
  const controls = { enabled: true, target: new THREE.Vector3(), update() {} };
  const world = { speedMultiplier: 1 };
  const calls = { minigameReset: 0, menuShow: 0 };
  const state = { crashNext: false };
  const minigame = {
    score: 7,
    spawning: false,
    reset: () => calls.minigameReset++,
    update: () => ({ crashed: state.crashNext, scored: false }),
  };
  const group = new THREE.Group();
  const car = {
    steering: false,
    group,
    reset() {},
    update() {},
    release() {},
    // a body 1.8 wide, 1.4 high and 4.2 long, centred on the group
    getBounds: (/** @type {THREE.Box3} */ box) =>
      box.setFromCenterAndSize(group.position, new THREE.Vector3(1.8, 1.4, 4.2)),
  };
  /** @type {number[]} progress of every countGameOver call */
  const counts = [];
  // every HUD call is a no-op, but the game over count is recorded
  const hud = new Proxy(
    {},
    {
      get: (_, name) =>
        name === "countGameOver" ? (/** @type {number} */ p) => counts.push(p) : () => {},
    },
  );
  const menu = { show: () => calls.menuShow++, hide() {} };
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

  return { game, input, world, camera, controls, car, calls, counts, minigame, run, crash };
}

describe("portrait follow", () => {
  const target = new THREE.Vector3().fromArray(SCENE.camera.target);

  /** A portrait view (aspect 1:2, 90° vertical fov) from `position`, looking at the orbit target. */
  function portrait(/** @type {number[]} */ position) {
    const s = setup();
    s.camera.aspect = 0.5;
    s.camera.fov = 90;
    s.camera.updateProjectionMatrix();
    s.camera.position.fromArray(position);
    s.camera.lookAt(target);
    s.controls.target.copy(target);
    return s;
  }

  it("stays put while the centred car is looked at from any side", () => {
    for (const x of [-5, 0, 5]) {
      const { camera, controls, run } = portrait([x, 3, 5]);
      const at = camera.position.clone();
      run(0.5);
      expect(camera.position.distanceTo(at)).toBeCloseTo(0);
      expect(controls.target.distanceTo(target)).toBeCloseTo(0);
    }
  });

  it("slides the orbit sideways just enough to keep a steered car in view, and back", () => {
    const { camera, controls, car, run } = portrait(SCENE.camera.position);
    car.group.position.x = CAR.steer.maxOffset;
    run(1 / 60);
    expect(camera.position.x).toBeGreaterThan(0);
    expect(camera.position.y).toBeCloseTo(3);
    expect(camera.position.z).toBeCloseTo(7);
    expect(controls.target.x).toBeCloseTo(camera.position.x); // the orbit moves as a whole
    // the outer top corner nearest the camera ends up just inside the right edge
    camera.updateMatrixWorld();
    const corner = new THREE.Vector3(6.9, 0.7, 2.1).project(camera);
    expect(corner.x).toBeLessThan(1);
    expect(corner.x).toBeGreaterThan(0.7);

    car.group.position.x = 0;
    run(1 / 60);
    expect(camera.position.x).toBeCloseTo(0);
    expect(controls.target.x).toBeCloseTo(0);
  });

  it("slides the same for a steered car however the orbit is turned, and not while turning", () => {
    const { camera, controls, car, run } = portrait(SCENE.camera.position);
    car.group.position.x = CAR.steer.maxOffset;
    run(1 / 60);
    const slide = controls.target.x;
    expect(slide).toBeGreaterThan(0);

    // turn the orbit around its (slid) target, as OrbitControls does, then keep running
    const orbit = camera.position.clone().sub(controls.target);
    for (const angle of [0.3, 1, -1, Math.PI / 2]) {
      camera.position.copy(orbit).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      camera.position.add(controls.target);
      camera.lookAt(controls.target);
      const at = camera.position.clone();
      run(0.5);
      expect(camera.position.distanceTo(at)).toBeCloseTo(0);
      expect(controls.target.x).toBeCloseTo(slide);
    }
  });
});

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

  it("counts the score up once the panel is in, then holds it", () => {
    const { counts, minigame, run, crash } = setup();
    crash();
    counts.length = 0;
    run(MINIGAME.crash.lock - 0.05);
    expect(Math.max(...counts)).toBe(0); // the panel is not in yet
    const duration = Math.min(
      minigame.score * MINIGAME.scoreCount.perPoint,
      MINIGAME.scoreCount.max,
    );
    run(0.05 + duration / 2);
    expect(counts.at(-1)).toBeGreaterThan(0.3);
    expect(counts.at(-1)).toBeLessThan(0.7);
    run(duration);
    expect(counts.at(-1)).toBe(1);
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
