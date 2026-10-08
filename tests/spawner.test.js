import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createSpawner } from "../src/scene/spawner.js";

/** @param {Partial<import("../src/scene/spawner.js").SpawnerOptions>} [options] */
function setup(options = {}) {
  const parent = new THREE.Group();
  const spawner = createSpawner({
    parent,
    speed: 10,
    interval: () => 1,
    create: () => [new THREE.Object3D()],
    startZ: -100,
    endZ: 100,
    ...options,
  });
  return { parent, spawner };
}

/** @param {{ update(dt: number, m: number): void }} s @param {number} seconds @param {number} [m] */
const run = (s, seconds, m = 1, dt = 1 / 60) => {
  for (let t = 0; t < seconds - 1e-9; t += dt) s.update(dt, m);
};

describe("spawner", () => {
  it("spawns once per interval, not immediately", () => {
    const { spawner } = setup();
    run(spawner, 0.5);
    expect(spawner.objects).toHaveLength(0);
    run(spawner, 3);
    expect(spawner.objects).toHaveLength(3);
  });

  it("moves objects with speed * multiplier and removes them past endZ", () => {
    const { spawner, parent } = setup({ speed: 100, interval: () => 10 });
    run(spawner, 10);
    const [object] = spawner.objects;
    expect(object.position.z).toBeCloseTo(-100, 0);
    run(spawner, 1, 1.5);
    expect(object.position.z).toBeCloseTo(50, 0);
    run(spawner, 1, 1.5);
    expect(parent.children).not.toContain(object);
  });

  it("keeps the spacing frame-rate independent", () => {
    const slow = setup().spawner;
    const fast = setup().spawner;
    run(slow, 5, 1, 1 / 10);
    run(fast, 5, 1, 1 / 240);
    const zs = (/** @type {typeof slow} */ s) => s.objects.map((o) => o.position.z);
    zs(slow).forEach((z, i) => expect(z).toBeCloseTo(zs(fast)[i], 0));
  });

  it("scales the interval with speed and density, clamped to minInterval", () => {
    const { spawner } = setup({ interval: () => 1.5, minInterval: 0.5 });
    expect(spawner.currentInterval(1)).toBeCloseTo(1.5);
    spawner.density = 2;
    expect(spawner.currentInterval(1.5)).toBeCloseTo(0.5);
    spawner.density = 0.5;
    expect(spawner.currentInterval(1)).toBeCloseTo(3);
  });

  it("clear removes everything", () => {
    const { spawner, parent } = setup();
    run(spawner, 3);
    spawner.clear();
    expect(spawner.objects).toHaveLength(0);
    expect(parent.children).toHaveLength(0);
  });
});

describe("spawner fade-in", () => {
  /** @param {THREE.Material} material */
  const fadingSetup = (material) =>
    setup({
      interval: () => 1,
      fadeIn: 0.5,
      create: () => [new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(), material))],
    });

  /** @param {THREE.Object3D} object */
  const meshOf = (object) => /** @type {THREE.Mesh} */ (object.children[0]);

  it("fades new instances from transparent and hands back the shared material", () => {
    const shared = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const { spawner } = fadingSetup(shared);
    run(spawner, 1); // first spawn
    const mesh = meshOf(spawner.objects[0]);
    const own = /** @type {THREE.MeshBasicMaterial} */ (mesh.material);
    expect(own).not.toBe(shared);
    expect(own.transparent).toBe(true);
    expect(own.opacity).toBeLessThan(0.1);

    run(spawner, 0.25);
    expect(own.opacity).toBeGreaterThan(0.4);
    expect(own.opacity).toBeLessThan(0.6);

    run(spawner, 0.3);
    expect(mesh.material).toBe(shared);
    expect(shared.transparent).toBe(false);
  });

  it("keeps fading copies in sync with GUI changes on the shared material", () => {
    const shared = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const { spawner } = fadingSetup(shared);
    run(spawner, 1);
    shared.color.set(0x00ff00);
    shared.visible = false;
    run(spawner, 0.1);
    const own = /** @type {THREE.MeshBasicMaterial} */ (meshOf(spawner.objects[0]).material);
    expect(own.color.getHex()).toBe(0x00ff00);
    expect(own.visible).toBe(false);
  });

  // Disposing the last transparent copy deletes its shader; the next spawn would recompile it.
  it("reuses material copies instead of disposing them", () => {
    const shared = new THREE.MeshBasicMaterial();
    const { spawner } = fadingSetup(shared);
    run(spawner, 1);
    const own = meshOf(spawner.objects[0]).material;
    let disposed = false;
    /** @type {THREE.Material} */ (own).addEventListener("dispose", () => (disposed = true));
    run(spawner, 1); // first fade done, second spawn
    expect(disposed).toBe(false);
    expect(meshOf(spawner.objects[1]).material).toBe(own);
  });

  it("restores shared materials when instances are cleared mid-fade", () => {
    const shared = new THREE.MeshBasicMaterial();
    const { spawner } = fadingSetup(shared);
    run(spawner, 1);
    const mesh = meshOf(spawner.objects[0]);
    spawner.clear();
    expect(mesh.material).toBe(shared);
  });
});
