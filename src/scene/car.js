import * as THREE from "three";
import { CAR, SPEED } from "../config.js";
import { frames, perFrame } from "../core/time.js";
import { pruneEmpty, wheelCenter } from "./model.js";
import { dress } from "./wire.js";

/** @typedef {-1 | 0 | 1} SteerInput left, none, right */

const UP = new THREE.Vector3(0, 1, 0);

/**
 * The Polonez. Each part of the motion lives on its own node, so nothing has to be synced:
 *
 *   group        lateral position (x) + yaw: the nose turns towards the lane change; CAR.lift (y)
 *   ├ chassis    body roll around the axle line (CAR.rollCenterY)
 *   │ └ body
 *   └ 4× pivot   on the axle, mid-width; front pivots steer (y)
 *       └ spin   rolls the wheel around its axle (x)
 *         └ mirror → wheel model, offset so its axle and mid-width sit on the pivot
 *
 * The wheels never roll with the body, which gives the suspension feel of v1. Per-frame
 * constants from CAR are scaled with core/time.js, so 60 Hz and 144 Hz feel the same.
 *
 * @param {{ scene: THREE.Scene, models: Record<string, THREE.Group>, materials: import("./materials.js").Materials }} deps
 */
export function createCar({ scene, models, materials }) {
  const solid = materials.solid.polonez;
  const wire = materials.wire.polonez;

  const body = dress(models.polonez, solid, wire);
  body.position.set(CAR.bodyX, -CAR.rollCenterY, 0);

  const chassis = new THREE.Group();
  chassis.position.y = CAR.rollCenterY;
  chassis.add(body);

  // Spin around the modelled axle (through the model origin) and steer around the middle of
  // the wheel's width, which is off the origin in wheel.fbx.
  const wheelModel = dress(pruneEmpty(models.wheel), solid, wire);
  const center = wheelCenter(wheelModel);

  /** @type {THREE.Group[]} */
  const spins = [];
  /** @type {THREE.Group[]} */
  const frontWheels = [];

  const wheels = CAR.wheels.map(([x, y, z]) => {
    const mirrored = x > 0;
    const wheel = wheelModel.clone();
    wheel.position.copy(center).negate();

    const mirror = new THREE.Group();
    if (mirrored) mirror.rotation.y = Math.PI;
    mirror.add(wheel);

    const spin = new THREE.Group();
    spin.add(mirror);
    spins.push(spin);

    // (x, y, z) is where v1 put the model origin; the pivot moves to the middle of the width.
    const pivot = new THREE.Group();
    const centerOffset = center.clone().applyAxisAngle(UP, mirrored ? Math.PI : 0);
    pivot.position.set(x, y, z).add(centerOffset);
    pivot.add(spin);
    if (z < 0) frontWheels.push(pivot);
    return pivot;
  });

  const group = new THREE.Group();
  group.position.y = CAR.lift;
  group.add(chassis, ...wheels);
  scene.add(group);

  const s = CAR.steer;
  const { roll, yaw, wheelSteer } = CAR.handling;
  const rollSign = roll.outward ? 1 : -1;

  let speed = 0; // lateral speed, units per reference frame
  let direction = 0; // last steering direction, used for momentum
  let holdTime = 0; // seconds the current direction has been held
  /** @type {SteerInput} */
  let lastInput = 0;
  let rollTarget = 0; // eased target of the body roll (v1 eases twice)
  let steerAngle = 0;
  /** @type {import("../core/tween.js").TweenHandle | null} */
  let resetTween = null;

  /** @param {number} dx */
  function moveBy(dx) {
    group.position.x = THREE.MathUtils.clamp(group.position.x + dx, -s.maxOffset, s.maxOffset);
  }

  /**
   * Lateral motion (v1 feel): hold to speed up, momentum after release.
   *
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
    } else {
      speed = Math.max(0, speed - s.decel * f);
      if (speed > 0) moveBy(direction * speed * f);
    }

    lastInput = input;
  }

  /**
   * Body roll, yaw and front wheel angle. Runs every frame, so everything settles back to
   * neutral on its own (also while the reset tween moves the car).
   *
   * @param {number} dt
   * @param {SteerInput} input
   * @param {number} lateralVelocity units per reference frame, measured this frame
   */
  function handle(dt, input, lateralVelocity) {
    const kRoll = perFrame(roll.easing, dt);
    rollTarget += (input * roll.max * rollSign - rollTarget) * kRoll;
    chassis.rotation.z += (rollTarget - chassis.rotation.z) * kRoll;

    const yawTarget = THREE.MathUtils.clamp(-lateralVelocity * yaw.perSpeed, -yaw.max, yaw.max);
    group.rotation.y += (yawTarget - group.rotation.y) * perFrame(yaw.easing, dt);

    steerAngle += (-input * wheelSteer.max - steerAngle) * perFrame(wheelSteer.easing, dt);
    for (const pivot of frontWheels) pivot.rotation.y = steerAngle;
  }

  function stop() {
    speed = 0;
    holdTime = 0;
    lastInput = 0;
  }

  return {
    group,
    chassis,
    body,
    frontWheels,
    /** Steering is only active in free ride and while playing. */
    steering: false,

    /**
     * @param {number} dt
     * @param {number} speedMultiplier
     * @param {SteerInput} input
     */
    update(dt, speedMultiplier, input) {
      const spin = SPEED.wheelSpin * speedMultiplier * frames(dt);
      for (const wheel of spins) wheel.rotation.x += spin;

      const active = this.steering && !resetTween?.isActive();
      const startX = group.position.x;
      if (active) steer(dt, input);

      const f = frames(dt);
      const lateralVelocity = f > 0 ? (group.position.x - startX) / f : 0;
      handle(dt, active ? input : 0, lateralVelocity);
    },

    /** A steering key was released (v1: speed drops right away). */
    release() {
      speed *= s.releaseDamp;
    },

    /**
     * Eases the car back to the start position; roll, yaw and wheels settle on their own.
     *
     * @param {import("../core/tween.js").Tweens} tweens
     */
    reset(tweens) {
      resetTween?.cancel();
      const fromX = group.position.x;
      resetTween = tweens.add({
        duration: CAR.resetDuration,
        onUpdate: (t) => {
          group.position.x = fromX * (1 - t);
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
