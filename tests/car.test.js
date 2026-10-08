import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { CAR } from "../src/config.js";
import { createCar } from "../src/scene/car.js";
import { createTweens } from "../src/core/tween.js";

/**
 * Like wheel.fbx: the axle runs along x through the model origin, the tire is a polygon (so its
 * bounding box is off-axis in y/z) and the middle of its width is off the origin in x.
 */
const WIDTH_OFFSET = 0.06;

function setup() {
  const mesh = () => new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshBasicMaterial());
  const polonez = new THREE.Group().add(mesh());
  const tire = new THREE.CylinderGeometry(0.55, 0.55, 0.47, 7).rotateZ(Math.PI / 2); // axle on x
  const wheelMesh = new THREE.Mesh(tire, new THREE.MeshBasicMaterial());
  wheelMesh.position.x = WIDTH_OFFSET;
  const wheel = new THREE.Group().add(wheelMesh, new THREE.Group()); // + an empty "camera" branch
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

/** @param {THREE.Object3D} object */
function worldUp(object) {
  object.updateWorldMatrix(true, false);
  return new THREE.Vector3(0, 1, 0).transformDirection(object.matrixWorld);
}

describe("car steering", () => {
  it("moves the same at 60 Hz and 144 Hz", () => {
    const a = setup();
    const b = setup();
    drive(a, 1, -1, 60);
    drive(b, 1, -1, 144);
    expect(b.group.position.x).toBeCloseTo(a.group.position.x, 1);
    expect(b.chassis.rotation.z).toBeCloseTo(a.chassis.rotation.z, 2);
    expect(b.group.rotation.y).toBeCloseTo(a.group.rotation.y, 2);
  });

  it("speeds up the longer a key is held (v1 intent)", () => {
    const car = setup();
    drive(car, 0.5, 1, 60);
    const first = car.group.position.x;
    drive(car, 0.5, 1, 60);
    expect(car.group.position.x - first).toBeGreaterThan(first);
  });

  it("rolls the body outward while the wheels stay upright", () => {
    const car = setup();
    drive(car, 0.5, -1, 60); // moving left
    expect(car.chassis.rotation.z).toBeLessThan(0); // right side dips: outward roll
    for (const pivot of car.frontWheels) expect(worldUp(pivot).y).toBeCloseTo(1, 5);
  });

  it("steers the front wheels and turns the nose towards the lane change", () => {
    const car = setup();
    drive(car, 0.5, -1, 60);
    expect(car.frontWheels).toHaveLength(2);
    const { max } = CAR.handling.wheelSteer;
    for (const pivot of car.frontWheels) expect(pivot.rotation.y).toBeGreaterThan(0.9 * max);
    expect(car.group.rotation.y).toBeGreaterThan(0); // nose to the left
  });

  it("never passes maxOffset and straightens up once it cannot move further", () => {
    const car = setup();
    drive(car, 6, -1, 60);
    expect(car.group.position.x).toBe(-CAR.steer.maxOffset);
    expect(Math.abs(car.group.rotation.y)).toBeLessThan(0.01);
  });

  it("keeps sliding after release and settles to neutral", () => {
    const car = setup();
    drive(car, 1, 1, 60);
    const released = car.group.position.x;
    car.release();
    drive(car, 2, 0, 60);
    expect(car.group.position.x).toBeGreaterThan(released);
    expect(Math.abs(car.chassis.rotation.z)).toBeLessThan(0.01);
    expect(Math.abs(car.group.rotation.y)).toBeLessThan(0.01);
    for (const pivot of car.frontWheels) expect(Math.abs(pivot.rotation.y)).toBeLessThan(0.01);
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
      car.update(1 / 60, 1, 1); // steering still on, but the tween owns the position
    }
    expect(car.group.position.x).toBeLessThan(from);

    car.steering = false; // as the game does while resetting
    for (let i = 0; i < 60; i++) {
      tweens.update(1 / 60);
      car.update(1 / 60, 1, 1);
    }
    expect(car.group.position.x).toBeCloseTo(0);
    expect(car.chassis.rotation.z).toBeCloseTo(0);
    expect(car.group.rotation.y).toBeCloseTo(0, 2);
  });
});

describe("car wheels", () => {
  /** The wheel model inside pivot -> spin -> mirror. @param {THREE.Object3D} pivot */
  const modelOf = (pivot) => pivot.children[0].children[0].children[0];

  /** World position of the modelled axle (the wheel model's origin). @param {THREE.Object3D} pivot */
  const axleOf = (pivot) => {
    pivot.updateWorldMatrix(true, true);
    return modelOf(pivot).getWorldPosition(new THREE.Vector3());
  };

  it("keep the v1 placement (lifted by CAR.lift): axle at the v1 model origin, pivot mid-width", () => {
    const car = setup();
    const [backLeft, , backRight] = car.group.children.slice(1);
    const [lx, ly, lz] = CAR.wheels[0];
    const [rx, ry, rz] = CAR.wheels[2];

    const lift = CAR.lift;
    expect(axleOf(backLeft).distanceTo(new THREE.Vector3(lx, ly + lift, lz))).toBeLessThan(1e-6);
    expect(axleOf(backRight).distanceTo(new THREE.Vector3(rx, ry + lift, rz))).toBeLessThan(1e-6);
    expect(backLeft.position.x).toBeCloseTo(lx + WIDTH_OFFSET);
    expect(backRight.position.x).toBeCloseTo(rx - WIDTH_OFFSET); // mirrored
    expect(backLeft.position.y).toBeCloseTo(ly);
    expect(backLeft.position.z).toBeCloseTo(lz);
  });

  it("spin around the modelled axle, not the off-axis bounding box (no wobble)", () => {
    const car = setup();
    const back = car.group.children[1];
    const before = axleOf(back);
    for (let i = 0; i < 37; i++) car.update(1 / 60, 1, 0); // wheels spin, the car stays put
    expect(axleOf(back).distanceTo(before)).toBeLessThan(1e-6);
  });

  it("steer around the middle of the wheel", () => {
    const car = setup();
    const front = car.frontWheels[0];
    const pivotBefore = front.getWorldPosition(new THREE.Vector3());
    drive(car, 0.7, -1, 60);
    car.group.position.x = 0;
    car.group.rotation.set(0, 0, 0);
    expect(front.rotation.y).toBeGreaterThan(0);
    expect(front.getWorldPosition(new THREE.Vector3()).distanceTo(pivotBefore)).toBeLessThan(1e-6);
    expect(axleOf(front).distanceTo(pivotBefore)).toBeCloseTo(WIDTH_OFFSET);
  });

  it("drops empty helper branches from the wheel model", () => {
    const car = setup();
    let groupsWithoutMesh = 0;
    car.group.traverse((object) => {
      if (object.type !== "Group") return;
      let hasMesh = false;
      object.traverse((o) => (hasMesh ||= o instanceof THREE.Mesh));
      if (!hasMesh) groupsWithoutMesh++;
    });
    expect(groupsWithoutMesh).toBe(0);
  });
});
