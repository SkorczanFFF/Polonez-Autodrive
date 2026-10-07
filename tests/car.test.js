import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CAR } from "../src/config.js";
import { createCar } from "../src/scene/car.js";
import { createTweens } from "../src/core/tween.js";

function setup() {
  const mesh = () => new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshBasicMaterial());
  const polonez = new THREE.Group().add(mesh());
  const wheel = new THREE.Group().add(mesh());
  const material = new THREE.MeshBasicMaterial();
  const materials = /** @type {any} */ ({
    solid: { polonez: material },
    wire: { polonez: material },
  });
  const car = createCar({ scene: new THREE.Scene(), models: { polonez, wheel }, materials });
  car.steering = true;
  return car;
}

/**
 * @param {ReturnType<typeof setup>} car
 * @param {number} seconds
 * @param {-1 | 0 | 1} input
 * @param {number} hz
 */
function drive(car, seconds, input, hz) {
  const steps = Math.round(seconds * hz);
  for (let i = 0; i < steps; i++) car.update(1 / hz, 1, input);
}

describe("car steering", () => {
  it("moves the same distance at 60 Hz and 144 Hz", () => {
    const a = setup();
    const b = setup();
    drive(a, 1, -1, 60);
    drive(b, 1, -1, 144);
    expect(b.group.position.x).toBeCloseTo(a.group.position.x, 1);
    expect(b.group.rotation.z).toBeCloseTo(a.group.rotation.z, 2);
  });

  it("speeds up the longer a key is held (v1 intent)", () => {
    const car = setup();
    drive(car, 0.5, 1, 60);
    const first = car.group.position.x;
    drive(car, 0.5, 1, 60);
    const second = car.group.position.x - first;
    expect(second).toBeGreaterThan(first);
  });

  it("tilts against the steering direction and never passes maxOffset", () => {
    const car = setup();
    drive(car, 5, -1, 60);
    expect(car.group.position.x).toBe(-CAR.steer.maxOffset);
    expect(car.group.rotation.z).toBeGreaterThan(0);
  });

  it("keeps sliding after release and comes back upright", () => {
    const car = setup();
    drive(car, 1, 1, 60);
    const released = car.group.position.x;
    car.release();
    drive(car, 2, 0, 60);
    expect(car.group.position.x).toBeGreaterThan(released);
    expect(Math.abs(car.group.rotation.z)).toBeLessThan(0.01);
  });

  it("does not steer when steering is off", () => {
    const car = setup();
    car.steering = false;
    drive(car, 1, 1, 60);
    expect(car.group.position.x).toBe(0);
  });

  it("reset eases back to the start pose and ignores input meanwhile", () => {
    const car = setup();
    const tweens = createTweens();
    drive(car, 1, 1, 60);
    const from = car.group.position.x;
    car.reset(tweens);

    for (let i = 0; i < 30; i++) {
      tweens.update(1 / 60);
      car.update(1 / 60, 1, 1); // steering still on, but the tween owns the pose
    }
    expect(car.group.position.x).toBeLessThan(from);

    car.steering = false; // as the game does while resetting
    for (let i = 0; i < 40; i++) {
      tweens.update(1 / 60);
      car.update(1 / 60, 1, 1);
    }
    expect(car.group.position.x).toBeCloseTo(0);
    expect(car.group.rotation.z).toBeCloseTo(0);
  });
});
