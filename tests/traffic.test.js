import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { LAYERS, TRAFFIC } from "../src/config.js";
import { createMaterials } from "../src/scene/materials.js";
import {
  createTrafficModels,
  monotoneChains,
  prism,
  trafficHalfWidth,
  withArches,
} from "../src/scene/traffic.js";

const materials = () => createMaterials({ [String(LAYERS.road.wireMap)]: new THREE.Texture() }, 1);

describe("prism", () => {
  it("faces point outwards", () => {
    const geometry = prism(
      [
        [0, 0],
        [2, 0],
        [2, 1],
        [0, 1],
      ],
      () => 0.5,
    );
    const position = geometry.getAttribute("position");
    const centre = new THREE.Vector3(0, 0.5, 1);
    const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const normal = new THREE.Vector3();
    for (let i = 0; i < position.count; i += 3) {
      a.fromBufferAttribute(position, i);
      b.fromBufferAttribute(position, i + 1);
      c.fromBufferAttribute(position, i + 2);
      normal.subVectors(b, a).cross(c.clone().sub(a));
      const outwards = a.clone().add(b).add(c).divideScalar(3).sub(centre);
      expect(normal.dot(outwards)).toBeGreaterThan(0);
    }
  });
});

describe("profiles", () => {
  it("are x-monotone with their arches, as the panel grid needs", () => {
    for (const model of Object.values(TRAFFIC.models)) {
      const body = withArches(model.profile, model.wheel.radius, model.wheel.axles);
      expect(() => monotoneChains(body), model.label).not.toThrow();
      expect(() => monotoneChains(model.cabin), model.label).not.toThrow();
    }
  });

  it("reject outlines a vertical line crosses more than twice", () => {
    const zigzag = /** @type {[number, number][]} */ ([
      [0, 0],
      [2, 0],
      [2, 1],
      [1, 0.5],
      [1.5, 1.5],
      [0, 1],
    ]);
    expect(() => monotoneChains(zigzag)).toThrow();
  });
});

describe("wheel arches", () => {
  it("cut a half circle into the bottom edge around every axle", () => {
    const profile = /** @type {[number, number][]} */ ([
      [0, 0.2],
      [3, 0.2],
      [3, 1],
      [0, 1],
    ]);
    const cut = withArches(profile, 0.3, [0.7, 2.3]);
    expect(cut.length).toBeGreaterThan(profile.length + 2 * 6);
    const top = Math.max(...cut.filter(([, y]) => y < 1).map(([, y]) => y));
    expect(top).toBeCloseTo(0.3 + 0.3 * 1.15);
    for (const [, y] of cut) expect(y).toBeGreaterThanOrEqual(0.2 - 1e-9); // feet on the edge
  });
});

describe("traffic models", () => {
  const models = createTrafficModels(materials());
  const configs = Object.values(TRAFFIC.models);

  it("builds one template per model, front towards +z, on the ground", () => {
    expect(models).toHaveLength(configs.length);
    models.forEach((model, i) => {
      const config = configs[i];
      const { min, max } = model.userData.hitbox;
      const hitbox = new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max));
      const size = hitbox.getSize(new THREE.Vector3());
      const length = Math.max(...config.profile.map(([x]) => x)) * TRAFFIC.scale;

      expect(hitbox.min.y).toBeCloseTo(0, 5); // tyres touch the ground
      expect(size.z).toBeGreaterThanOrEqual(length - 1e-6); // body, plus the bumpers
      expect(size.z).toBeLessThan(length + 0.3);
      expect(size.x).toBeGreaterThanOrEqual(config.width * TRAFFIC.scale - 1e-6);
      expect(Math.abs(hitbox.min.z + hitbox.max.z)).toBeLessThan(0.01); // centred along z
    });
  });

  it("keeps lanes clear of the widest car", () => {
    const widest = Math.max(...configs.map((config) => config.width));
    expect(trafficHalfWidth()).toBeCloseTo((widest * TRAFFIC.scale) / 2);
  });

  it("clones keep the hitbox, the wireframe and the lamps", () => {
    const clone = models[0].clone();
    expect(clone.userData.hitbox).toEqual(models[0].userData.hitbox);
    const lamp = /** @type {THREE.Mesh} */ (models[0].children[1]).material;
    let wires = 0;
    let lamps = 0;
    clone.traverse((o) => {
      if (o.userData.isWire) wires++;
      if (o instanceof THREE.Mesh && o.material === lamp) lamps++;
    });
    expect(wires).toBe(1);
    expect(lamps).toBe(1);
  });
});
