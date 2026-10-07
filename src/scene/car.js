import * as THREE from "three";
import { CAR, SPEED } from "../config.js";
import { frames, perFrame } from "../core/time.js";
import { dress } from "./wire.js";

/** @typedef {-1 | 0 | 1} SteerInput left, none, right */

/**
 * The Polonez: one group holding the body and the four wheels, so moving or tilting the group
 * moves everything together. Wheels share the "polonez" materials with the body.
 *
 * Steering ports the v1 feel: per-frame constants from CAR.steer are scaled with core/time.js,
 * so the car behaves the same at 60 Hz and 144 Hz.
 *
 * @param {{ scene: THREE.Scene, models: Record<string, THREE.Group>, materials: import("./materials.js").Materials }} deps
 */
export function createCar({ scene, models, materials }) {
  const solid = materials.solid.polonez;
  const wire = materials.wire.polonez;

  const body = dress(models.polonez, solid, wire);
  body.position.set(CAR.bodyX, 0, 0);

  const wheelTemplate = dress(models.wheel, solid, wire);
  const wheels = CAR.wheels.map(([x, y, z]) => {
    const wheel = wheelTemplate.clone();
    wheel.position.set(x, y, z);
    if (x > 0) wheel.rotation.y = Math.PI; // mirror the right side
    return wheel;
  });

  const group = new THREE.Group();
  group.add(body, ...wheels);
  scene.add(group);

  const s = CAR.steer;
  let speed = 0; // units per reference frame
  let angle = 0; // eased target tilt
  let direction = 0; // last steering direction, used for momentum
  let holdTime = 0; // seconds the current direction has been held
  /** @type {SteerInput} */
  let lastInput = 0;
  /** @type {import("../core/tween.js").TweenHandle | null} */
  let resetTween = null;

  /** @param {number} dx */
  function moveBy(dx) {
    group.position.x = THREE.MathUtils.clamp(group.position.x + dx, -s.maxOffset, s.maxOffset);
  }

  /**
   * v1 eases the tilt target first, then the actual rotation towards it.
   *
   * @param {number} target
   * @param {number} dt
   */
  function easeTilt(target, dt) {
    const k = perFrame(s.angleEasing, dt);
    angle += (target - angle) * k;
    group.rotation.z += (angle - group.rotation.z) * k;
  }

  /**
   * @param {number} dt
   * @param {SteerInput} input
   */
  function steer(dt, input) {
    const f = frames(dt);

    if (input !== 0) {
      if (input !== lastInput) holdTime = 0;
      holdTime += dt;
      direction = input;

      const target = Math.min(s.baseSpeed + s.holdAccel * holdTime, s.maxSpeed);
      speed += (target - speed) * perFrame(s.speedEasing, dt);
      moveBy(direction * speed * f);
      easeTilt(-direction * s.maxAngle, dt);
    } else {
      speed = Math.max(0, speed - s.decel * f);
      if (Math.abs(angle) > s.angleEpsilon) easeTilt(0, dt);
      if (speed > 0) moveBy(direction * speed * f); // momentum after release
    }

    lastInput = input;
  }

  function stop() {
    speed = 0;
    angle = 0;
    holdTime = 0;
    lastInput = 0;
  }

  return {
    group,
    body,
    /** Steering is only active in free ride and while playing. */
    steering: false,

    /**
     * @param {number} dt
     * @param {number} speedMultiplier
     * @param {SteerInput} input
     */
    update(dt, speedMultiplier, input) {
      const spin = SPEED.wheelSpin * speedMultiplier * frames(dt);
      for (const wheel of wheels) wheel.rotation.x += spin;

      if (this.steering && !resetTween?.isActive()) steer(dt, input);
    },

    /** A steering key was released (v1: speed drops right away). */
    release() {
      speed *= s.releaseDamp;
    },

    /**
     * Eases the car back to the start position and an upright pose.
     *
     * @param {import("../core/tween.js").Tweens} tweens
     */
    reset(tweens) {
      resetTween?.cancel();
      const fromX = group.position.x;
      const fromTilt = group.rotation.z;
      resetTween = tweens.add({
        duration: CAR.resetDuration,
        onUpdate: (t) => {
          group.position.x = fromX * (1 - t);
          group.rotation.z = fromTilt * (1 - t);
        },
        onComplete: stop,
      });
    },

    /**
     * World-space bounds of the body (wheels excluded, as in v1).
     *
     * @param {THREE.Box3} target
     */
    getBounds(target) {
      group.updateMatrixWorld(true);
      return target.setFromObject(body);
    },
  };
}
