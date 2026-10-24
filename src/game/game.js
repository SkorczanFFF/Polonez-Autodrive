import * as THREE from "three";
import { MINIGAME, SCENE, SPEED, STORAGE, TEXT } from "../config.js";
import { loadNumber, saveNumber } from "../core/storage.js";
import { createStateMachine } from "./state.js";

/** @typedef {import("./state.js").GameState} GameState */

/**
 * @typedef {object} Menu
 * @property {() => void} show
 * @property {() => void} hide
 * @property {() => void} randomize "Randomize all" (R)
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
 * Orchestrates the game: maps input to state events (and gates the menu, glow and randomize keys),
 * runs per-state timers inside update(dt) and performs the enter actions of each state (camera,
 * car, minigame, HUD, menu).
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
  /** @type {import("../core/tween.js").TweenHandle | null} */
  let brakeTween = null;
  /** @type {THREE.Vector3 | null} camera position the crash shake jitters around */
  let shakeFrom = null;
  const shakeOffset = new THREE.Vector3();
  let followX = 0; // sideways camera offset that keeps the car in frame
  let pinned = false; // free ride: the orbit rides along with the car (followX = car x)
  const carBounds = new THREE.Box3();
  const base = new THREE.Vector3();
  const corner = new THREE.Vector3();
  const toCorner = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const moveTo = new THREE.Vector3();
  const moveTarget = new THREE.Vector3();
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
   * game camera ends up clamped exactly like in v1. The orbit target eases back to the home
   * target too (it is off it after free ride); a move into free ride ends pinned to the car.
   *
   * @param {THREE.Vector3} to
   * @param {() => void} [onDone]
   */
  function moveCamera(to, onDone) {
    cameraTween?.cancel();
    controls.enabled = false;
    const from = camera.position.clone();
    const fromTarget = controls.target.clone();
    cameraTween = tweens.add({
      duration: SCENE.camera.transition,
      onUpdate: (t) => {
        followX = pinned ? car.group.position.x : 0; // the offset the move ends with, for followCar
        moveTo.copy(to).x += followX;
        moveTarget.copy(cameraTarget).x += followX;
        camera.position.lerpVectors(from, moveTo, t);
        controls.target.lerpVectors(fromTarget, moveTarget, t);
        controls.update();
      },
      onComplete: onDone,
    });
  }

  /** Ends the crash effects (brake, shake) early, e.g. AGAIN right after the lock. */
  function stopCrash() {
    brakeTween?.cancel();
    if (shakeFrom) camera.position.copy(shakeFrom);
    shakeFrom = null;
  }

  /** The world brakes to a halt (traffic stays where it hit) and the camera starts shaking. */
  function crash() {
    const from = world.speedMultiplier;
    brakeTween = tweens.add({
      duration: MINIGAME.crash.stop,
      ease: (t) => 1 - (1 - t) ** 2, // hard at first, settling softly
      onUpdate: (t) => (world.speedMultiplier = from * (1 - t)),
    });
    shakeFrom = camera.position.clone();
  }

  /** @param {number} time seconds since the crash */
  function shake(time) {
    if (!shakeFrom) return;
    const { shake: duration, shakeAmount } = MINIGAME.crash;
    const left = 1 - time / duration;
    if (left <= 0) {
      stopCrash();
      return;
    }
    const random = () => Math.random() * 2 - 1;
    shakeOffset.set(random(), random(), 0).multiplyScalar(shakeAmount * left * left);
    camera.position.copy(shakeFrom).add(shakeOffset);
  }

  /**
   * On portrait screens the steering range is wider than the view: the camera slides sideways,
   * together with its orbit target, only as far as needed to keep the car inside. Landscape screens
   * keep the fixed camera of the desktop version.
   *
   * The slide is measured against a stand-in camera that looks straight down the road from the
   * real orbit's distance and tilt. The orbit can be turned, and the real camera is then useless
   * as a reference: measured against it, a centred car looked out of frame once the view was
   * turned to the right (the camera ran away), and a car driving past the lens asked for wild
   * slides that could not bring it back anyway. Against the stand-in, turning the orbit
   * changes nothing; the car is simply kept near the orbit centre.
   *
   * Free ride pins the orbit to the car instead, on any screen: the camera and its target follow
   * the car's x one to one, and keep doing so on the way back to the menu until the car is back
   * in the middle of the road.
   */
  function followCar() {
    if (cameraTween?.isActive()) return; // the move sets followX itself
    if (pinned && machine.state !== "free" && car.group.position.x === 0) pinned = false;
    const portrait = camera.aspect < 1;
    if (!pinned && !portrait && followX === 0) return; // landscape: nothing to measure every frame
    let offset = 0;
    if (pinned) {
      offset = car.group.position.x;
    } else if (portrait) {
      // the orbit (same with or without the slide) with its turn undone, around the home target
      base.subVectors(camera.position, controls.target);
      base.set(0, base.y, Math.hypot(base.x, base.z)).add(cameraTarget);
      forward.subVectors(cameraTarget, base).normalize();
      // The outer corner of the body nearest the camera is the first to leave the frame.
      const side = car.group.position.x >= cameraTarget.x ? 1 : -1;
      car.getBounds(carBounds);
      const { min, max } = carBounds;
      corner.set(side > 0 ? max.x : min.x, max.y, max.z);
      const depth = toCorner.subVectors(corner, base).dot(forward);
      const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect; // per unit of depth
      const room = depth * halfWidth - SCENE.camera.followMargin; // half the view at the corner
      offset = side * Math.max(0, side * (corner.x - base.x) - room);
    }
    const dx = offset - followX;
    if (dx === 0) return;
    camera.position.x += dx;
    controls.target.x += dx;
    if (shakeFrom) shakeFrom.x += dx; // shake() rebuilds camera.position from it every frame
    followX = offset;
  }

  function leaveMinigame() {
    stopCrash();
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
    car.steering = next === "free" || next === "playing";
    car.softEdges = next === "free";
    // ESC from free ride keeps the pin while the car eases back to the middle (see followCar)
    pinned = next === "free" || (next === "idle" && previous === "free");

    switch (next) {
      case "countdown":
        stopCrash();
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
        hud.setCountdown(TEXT.countdownGo);
        break;

      case "gameover":
        // the scene stays as it was hit; the camera and the scene GUI return on leaving
        hud.showGameOver(minigame.score, recordScore());
        crash();
        break;

      case "idle":
        car.reset(tweens);
        if (previous === "countdown" || previous === "playing") recordScore();
        if (previous !== "free") leaveMinigame();
        break;

      case "free":
        if (previous === "gameover") leaveMinigame();
        break;
    }
  }

  const machine = createStateMachine("idle", enter);

  input.onPress((action) => {
    switch (action) {
      case "start":
      case "free":
      case "exit":
        if (machine.state === "gameover" && stateTime < MINIGAME.crash.lock) return; // see config
        machine.send(action);
        break;
      case "menu":
        if (machine.state === "idle") hud.toggleMenu(); // only where the toggle is shown
        break;
      case "glow":
        view.bloom.enabled = !view.bloom.enabled;
        break;
      case "randomize":
        menu?.randomize();
        break;
    }
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
      followCar();

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

        case "gameover": {
          shake(stateTime);
          // the score counts up once the panel is in (after the lock)
          const { perPoint, max } = MINIGAME.scoreCount;
          const duration = Math.min(minigame.score * perPoint, max);
          const counting = stateTime - MINIGAME.crash.lock;
          const progress = duration > 0 ? counting / duration : counting >= 0 ? 1 : 0;
          hud.countGameOver(Math.min(Math.max(progress, 0), 1));
          break;
        }
      }
    },
  };
}
