import * as THREE from "three";
import { MINIGAME, SCENE, SPEED, STORAGE, TEXT } from "../config.js";
import { loadNumber, saveNumber } from "../core/storage.js";
import { createStateMachine } from "./state.js";

/** @typedef {import("./state.js").GameState} GameState */

/**
 * @typedef {object} Menu
 * @property {() => void} show
 * @property {() => void} hide
 */

/**
 * @typedef {object} GameDeps
 * @property {ReturnType<typeof import("../core/renderer.js").createView>} view
 * @property {ReturnType<typeof import("../scene/world.js").createWorld>} world
 * @property {ReturnType<typeof import("../scene/car.js").createCar>} car
 * @property {ReturnType<typeof import("./minigame.js").createMinigame>} minigame
 * @property {import("../core/tween.js").Tweens} tweens
 * @property {ReturnType<typeof import("../core/input.js").createInput>} input
 * @property {ReturnType<typeof import("../ui/hud.js").createHud>} hud
 * @property {Menu} [menu] scene GUI, hidden during the minigame
 */

/** @param {number} score */
const tierForScore = (score) => Math.floor(score / SPEED.tierEvery);

/** @param {number} score */
const speedForScore = (score) => 1 + tierForScore(score) * SPEED.tierStep;

/**
 * Orchestrates the game: maps input to state events, runs per-state timers inside update(dt)
 * and performs the enter actions of each state (camera, car, minigame, HUD, menu).
 *
 * @param {GameDeps} deps
 */
export function createGame({ view, world, car, minigame, tweens, input, hud, menu }) {
  const { camera, controls } = view;
  const cameraTarget = new THREE.Vector3().fromArray(SCENE.camera.target);
  const homePosition = new THREE.Vector3().fromArray(SCENE.camera.position);
  const gamePosition = new THREE.Vector3().fromArray(SCENE.camera.gamePosition);

  /** @type {import("../core/tween.js").TweenHandle | null} */
  let cameraTween = null;
  let stateTime = 0;
  let best = loadNumber(STORAGE.bestScore);

  /** Keeps the best score (also when leaving mid-game with ESC). @returns {boolean} new record */
  function recordScore() {
    if (minigame.score <= best) return false;
    best = minigame.score;
    saveNumber(STORAGE.bestScore, best);
    hud.setBest(best);
    return true;
  }

  /**
   * Controls stay disabled during the move; controls.update() applies the orbit limits, so the
   * game camera ends up clamped exactly like in v1.
   *
   * @param {THREE.Vector3} to
   * @param {() => void} [onDone]
   */
  function moveCamera(to, onDone) {
    cameraTween?.cancel();
    controls.enabled = false;
    const from = camera.position.clone();
    cameraTween = tweens.add({
      duration: SCENE.camera.transition,
      onUpdate: (t) => {
        camera.position.lerpVectors(from, to, t);
        controls.target.copy(cameraTarget);
        controls.update();
      },
      onComplete: onDone,
    });
  }

  function leaveMinigame() {
    minigame.reset();
    world.speedMultiplier = 1;
    moveCamera(homePosition, () => (controls.enabled = true));
    menu?.show();
  }

  /**
   * @param {GameState} next
   * @param {GameState} previous
   */
  function enter(next, previous) {
    stateTime = 0;
    hud.setState(next);

    switch (next) {
      case "countdown":
        car.steering = false;
        car.reset(tweens);
        minigame.reset();
        world.speedMultiplier = 1;
        menu?.hide();
        moveCamera(gamePosition);
        hud.setScore(null);
        hud.setLevel(1);
        hud.setCountdown(String(MINIGAME.countdown));
        break;

      case "playing":
        car.steering = true;
        hud.setCountdown(TEXT.countdownGo);
        break;

      case "gameover":
        car.steering = false;
        hud.showGameOver(minigame.score, recordScore());
        leaveMinigame();
        break;

      case "idle":
        car.steering = false;
        car.reset(tweens);
        if (previous === "countdown" || previous === "playing") {
          recordScore();
          leaveMinigame();
        }
        break;

      case "free":
        car.steering = true;
        break;
    }
  }

  const machine = createStateMachine("idle", enter);

  input.onPress((action) => {
    if (action === "start" || action === "free" || action === "exit") machine.send(action);
  });
  input.onRelease((action) => {
    if (action === "left" || action === "right") car.release();
  });

  /** @returns {import("../scene/car.js").SteerInput} */
  function steerInput() {
    if (input.isHeld("left")) return -1;
    if (input.isHeld("right")) return 1;
    return 0;
  }

  hud.setState(machine.state);
  hud.setBest(best);

  return {
    get state() {
      return machine.state;
    },

    /** @param {number} dt */
    update(dt) {
      stateTime += dt;
      car.update(dt, world.speedMultiplier, steerInput());

      switch (machine.state) {
        case "countdown": {
          minigame.spawning = stateTime >= MINIGAME.trafficStartsAt;
          minigame.update(dt, world.speedMultiplier);
          if (stateTime >= MINIGAME.countdown) {
            machine.send("timeout");
            break;
          }
          hud.setCountdown(String(MINIGAME.countdown - Math.floor(stateTime)));
          break;
        }

        case "playing": {
          if (stateTime >= MINIGAME.startLabelDuration) {
            hud.setCountdown(null);
            hud.setScore(minigame.score);
          }
          const { crashed, scored } = minigame.update(dt, world.speedMultiplier);
          if (crashed) {
            machine.send("crash");
            break;
          }
          if (scored) {
            world.speedMultiplier = speedForScore(minigame.score);
            hud.setScore(minigame.score);
            hud.setLevel(tierForScore(minigame.score) + 1);
          }
          break;
        }

        case "gameover":
          if (stateTime >= MINIGAME.gameOverDuration) machine.send("timeout");
          break;
      }
    },
  };
}
