import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TRAFFIC } from "../config.js";
import { dress } from "./wire.js";

/**
 * @typedef {import("../config.js").TrafficModel} TrafficModel
 * @typedef {[number, number]} Point profile point [x, y] in metres: x from the rear bumper
 *   to the front, y up from the ground
 */

/** Segments of each wheel arch (half circle). */
const ARCH_SEGMENTS = 6;
/** Arch radius relative to the wheel radius. */
const ARCH_CLEARANCE = 1.15;
const WHEEL_SEGMENTS = 8;
/** Panel grid on the car sides (triangle wireframe), metres. */
const PANEL = { width: 0.35, height: 0.25 };
/** Side window frame inset and B-pillar width, metres. */
const WINDOW_FRAME = 0.07;
const PILLAR = 0.1;
/** Bumper height, thickness and how far it sticks out, metres. */
const BUMPER = { height: 0.1, depth: 0.08, out: 0.03 };

/** Half the widest car, in scene units: the minigame keeps lanes this far from the centre. */
export function trafficHalfWidth() {
  const widest = Math.max(...Object.values(TRAFFIC.models).map((model) => model.width));
  return (widest * TRAFFIC.scale) / 2;
}

/**
 * Low-poly oncoming cars of the communist era (Fiat 126p, Škoda 120), one template per
 * TRAFFIC model. Each car is a side profile with wheel arches, extruded across its width, a
 * cabin narrowing towards the roof, wheels and headlights; the front faces +z (towards the
 * camera). Body, cabin and wheels are one geometry (one draw call plus its wireframe twin).
 *
 * The local hitbox (body + wheels) is in `userData.hitbox` as { min, max } arrays: clone()
 * copies userData through JSON, which would turn a Box3 into a plain object.
 *
 * @param {import("./materials.js").Materials} materials
 * @returns {THREE.Group[]}
 */
export function createTrafficModels(materials) {
  return Object.values(TRAFFIC.models).map((model) => {
    const body = bodyGeometry(model).scale(TRAFFIC.scale, TRAFFIC.scale, TRAFFIC.scale);
    const lights = lightsGeometry(model).scale(TRAFFIC.scale, TRAFFIC.scale, TRAFFIC.scale);

    const car = new THREE.Group().add(new THREE.Mesh(body));
    dress(car, materials.solid.traffic, materials.wire.traffic);
    const headlights = new THREE.Mesh(lights, materials.headlight);
    car.add(headlights); // after dress(): no wireframe on the lamps

    body.computeBoundingBox();
    const { min, max } = /** @type {THREE.Box3} */ (body.boundingBox);
    car.userData.hitbox = { min: min.toArray(), max: max.toArray() };
    return car;
  });
}

/** @param {TrafficModel} model */
function bodyGeometry(model) {
  const half = model.width / 2;
  const length = Math.max(...model.profile.map(([x]) => x));
  const { radius, axles } = model.wheel;

  const lower = prism(withArches(model.profile, radius, axles), () => half);

  const cabinBottom = Math.min(...model.cabin.map(([, y]) => y));
  const cabinTop = Math.max(...model.cabin.map(([, y]) => y));
  const cabinHalf = (/** @type {number} */ y) => {
    const t = (y - cabinBottom) / (cabinTop - cabinBottom);
    return half * THREE.MathUtils.lerp(1, TRAFFIC.roofWidth, t);
  };
  const cabin = prism(model.cabin, cabinHalf);

  const parts = [lower, cabin, ...sideWindows(model, cabinHalf)];
  for (const [x, out] of [
    [length, BUMPER.out],
    [0, -BUMPER.out],
  ]) {
    const bumper = new THREE.BoxGeometry(model.width + 0.04, BUMPER.height, BUMPER.depth);
    parts.push(plain(bumper.translate(0, model.bumper ?? 0.32, x + out)));
  }
  const tire = TRAFFIC.tireWidth;
  for (const axle of axles) {
    for (const side of [-1, 1]) {
      const wheel = new THREE.CylinderGeometry(radius, radius, tire, WHEEL_SEGMENTS)
        .rotateZ(Math.PI / 2)
        .translate(side * (half - tire / 2 - 0.02), radius, axle);
      parts.push(plain(wheel));
    }
  }

  // Origin on the ground, in the middle of the car's length.
  return /** @type {THREE.BufferGeometry} */ (mergeGeometries(parts)).translate(0, 0, -length / 2);
}

/**
 * Two side windows per side (split by the B-pillar), just outside the sloped cabin sides, so
 * the outline mode draws them as window frames. The cabin outline is [rear bottom, front bottom,
 * front top, rear top].
 *
 * @param {TrafficModel} model
 * @param {(y: number) => number} cabinHalf
 */
function sideWindows(model, cabinHalf) {
  const [rearBottom, frontBottom, frontTop, rearTop] = model.cabin;
  const bottom = Math.max(rearBottom[1], frontBottom[1]) + WINDOW_FRAME + 0.03; // over the belt
  const top = Math.min(frontTop[1], rearTop[1]) - WINDOW_FRAME;
  /** x on the edge from a to b at height y. @param {number[]} a @param {number[]} b @param {number} y */
  const along = (a, b, y) => a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]);
  const rear = (/** @type {number} */ y) => along(rearBottom, rearTop, y) + WINDOW_FRAME;
  const front = (/** @type {number} */ y) => along(frontBottom, frontTop, y) - WINDOW_FRAME;
  const pillar = (rear(bottom) + front(bottom) + rear(top) + front(top)) / 4;

  /** @type {[number, number][][]} */
  const panes = [
    [
      [rear(bottom), bottom],
      [pillar - PILLAR / 2, bottom],
      [pillar - PILLAR / 2, top],
      [rear(top), top],
    ],
    [
      [pillar + PILLAR / 2, bottom],
      [front(bottom), bottom],
      [front(top), top],
      [pillar + PILLAR / 2, top],
    ],
  ];

  /** @type {number[]} */
  const positions = [];
  for (const pane of panes) {
    const corner = (/** @type {number} */ i, /** @type {number} */ side) => {
      const [x, y] = pane[i];
      positions.push(side * (cabinHalf(y) + 0.005), y, x);
    };
    // counter-clockwise in (z, y) faces -x: keep the order on the left, flip it on the right
    for (const [a, b, c] of [
      [0, 1, 2],
      [0, 2, 3],
    ]) {
      (corner(a, -1), corner(b, -1), corner(c, -1));
      (corner(a, 1), corner(c, 1), corner(b, 1));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return [geometry];
}

/** @param {TrafficModel} model */
function lightsGeometry(model) {
  const { shape, y, inset, size } = model.lights;
  const x = model.width / 2 - inset;
  const front = Math.max(...model.profile.map(([px]) => px));
  const parts = [-1, 1].map((side) => {
    const lamp =
      shape === "round"
        ? new THREE.CircleGeometry(size, 8)
        : new THREE.PlaneGeometry(size * 1.8, size * 1.1);
    return plain(lamp.translate(side * x, y, front + 0.01));
  });
  return /** @type {THREE.BufferGeometry} */ (mergeGeometries(parts)).translate(0, 0, -front / 2);
}

/**
 * Cuts a half-circle wheel arch into the bottom edge of a counter-clockwise profile around
 * every axle (wheel centre at y = radius).
 *
 * @param {Point[]} profile
 * @param {number} radius
 * @param {number[]} axles x of each axle
 * @returns {Point[]}
 */
export function withArches(profile, radius, axles) {
  const bottom = Math.min(...profile.map(([, y]) => y));
  const arch = radius * ARCH_CLEARANCE;
  const start = Math.asin(THREE.MathUtils.clamp((bottom - radius) / arch, -1, 1)); // foot angle

  /** @type {Point[]} */
  const result = [];
  profile.forEach((a, i) => {
    result.push(a);
    const b = profile[(i + 1) % profile.length];
    if (a[1] !== bottom || b[1] !== bottom || b[0] <= a[0]) return; // bottom edge runs rear -> front
    for (const axle of axles.filter((x) => x > a[0] && x < b[0]).sort((p, q) => p - q)) {
      for (let k = 0; k <= ARCH_SEGMENTS; k++) {
        const angle = Math.PI - start - (k / ARCH_SEGMENTS) * (Math.PI - 2 * start);
        result.push([axle + arch * Math.cos(angle), radius + arch * Math.sin(angle)]);
      }
    }
  });
  return result;
}

/**
 * A closed solid over a side profile: the profile's x runs along the car (+z), its y up; the
 * left and right sides sit at x = ∓halfWidth(y), joined by a strip around the outline. The sides
 * are a grid of panels (columns at every outline vertex and at most PANEL.width apart, rows at
 * most PANEL.height high), so the triangle wireframe looks like a regular low-poly mesh instead
 * of long slivers. Faces point outwards; non-indexed, so normals are flat.
 *
 * @param {Point[]} profile x-monotone outline (every vertical line crosses it twice), any winding
 * @param {(y: number) => number} halfWidth
 */
export function prism(profile, halfWidth) {
  const { lower, upper } = monotoneChains(profile);
  const xs = columns(profile.map(([x]) => x));
  const bottom = xs.map((x) => chainY(lower, x, Math.min));
  const top = xs.map((x) => chainY(upper, x, Math.max));

  /** @type {number[]} */
  const positions = [];
  /** @param {number} x @param {number} y @param {number} side -1 left, 1 right */
  const push = (x, y, side) => positions.push(side * halfWidth(y), y, x);
  /** Counter-clockwise (x, y) triangle on both sides: as is it faces -x, flipped it faces +x. */
  const side = (/** @type {Point[]} */ [a, b, c]) => {
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    if (area < 1e-9) return; // where the outline closes to a point
    (push(...a, -1), push(...b, -1), push(...c, -1));
    (push(...a, 1), push(...c, 1), push(...b, 1));
  };

  for (let k = 0; k + 1 < xs.length; k++) {
    const [x0, x1] = [xs[k], xs[k + 1]];
    const rows = Math.max(
      1,
      Math.ceil(Math.max(top[k] - bottom[k], top[k + 1] - bottom[k + 1]) / PANEL.height),
    );
    const y0 = (/** @type {number} */ f) => THREE.MathUtils.lerp(bottom[k], top[k], f);
    const y1 = (/** @type {number} */ f) => THREE.MathUtils.lerp(bottom[k + 1], top[k + 1], f);
    for (let r = 0; r < rows; r++) {
      const [f, g] = [r / rows, (r + 1) / rows];
      /** @type {Point[]} */
      const quad = [
        [x0, y0(f)],
        [x1, y1(f)],
        [x1, y1(g)],
        [x0, y0(g)],
      ];
      side([quad[0], quad[1], quad[2]]);
      side([quad[0], quad[2], quad[3]]);
    }
  }

  // Strip around the outline (bottom left -> right, top right -> left), counter-clockwise.
  /** @type {Point[]} */
  const outline = [];
  const add = (/** @type {Point} */ p) => {
    const last = outline[outline.length - 1];
    if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > 1e-9) outline.push(p);
  };
  xs.forEach((x, k) => add([x, bottom[k]]));
  for (let k = xs.length - 1; k >= 0; k--) add([xs[k], top[k]]);
  if (
    Math.hypot(
      outline[0][0] - outline[outline.length - 1][0],
      outline[0][1] - outline[outline.length - 1][1],
    ) < 1e-9
  ) {
    outline.pop();
  }
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    (push(...a, -1), push(...b, 1), push(...b, -1));
    (push(...a, -1), push(...a, 1), push(...b, 1));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Splits an x-monotone outline into its lower and upper chain, both by increasing x.
 *
 * @param {Point[]} profile
 */
export function monotoneChains(profile) {
  const contour = profile.map(([x, y]) => new THREE.Vector2(x, y));
  if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
  // Counter-clockwise from the leftmost point (the top one on a vertical edge) runs along the
  // bottom to the right, then back along the top.
  let start = 0;
  contour.forEach((p, i) => {
    const s = contour[start];
    if (p.x < s.x || (p.x === s.x && p.y > s.y)) start = i;
  });
  const walk = [...contour.slice(start), ...contour.slice(0, start)].map(
    (p) => /** @type {Point} */ ([p.x, p.y]),
  );
  let turn = 0;
  while (turn + 1 < walk.length && walk[turn + 1][0] >= walk[turn][0]) turn++;
  const lower = walk.slice(0, turn + 1);
  const upper = [...walk.slice(turn), walk[0]].reverse();
  for (const chain of [lower, upper]) {
    for (let i = 1; i < chain.length; i++) {
      if (chain[i][0] < chain[i - 1][0]) throw new Error("traffic profile is not x-monotone");
    }
  }
  return { lower, upper };
}

/**
 * y of a chain (sorted by x) at x; on a vertical edge `pick` chooses (min for the bottom).
 *
 * @param {Point[]} chain
 * @param {number} x
 * @param {(...values: number[]) => number} pick
 */
function chainY(chain, x, pick) {
  const exact = chain.filter(([px]) => px === x).map(([, y]) => y);
  if (exact.length) return pick(...exact);
  for (let i = 0; i + 1 < chain.length; i++) {
    const [[ax, ay], [bx, by]] = [chain[i], chain[i + 1]];
    if (x > ax && x < bx) return ay + ((by - ay) * (x - ax)) / (bx - ax);
  }
  throw new Error(`x ${x} outside the traffic profile`);
}

/**
 * Column positions: every outline vertex, plus even splits so no column is wider than
 * PANEL.width.
 *
 * @param {number[]} vertexXs
 */
function columns(vertexXs) {
  const xs = [...new Set(vertexXs)].sort((a, b) => a - b);
  /** @type {number[]} */
  const result = [xs[0]];
  for (let i = 1; i < xs.length; i++) {
    const gap = xs[i] - xs[i - 1];
    const splits = Math.ceil(gap / PANEL.width);
    for (let s = 1; s <= splits; s++) result.push(xs[i - 1] + (gap * s) / splits);
  }
  return result;
}

/**
 * Non-indexed, position + normal only, so built-in shapes merge with the prisms.
 *
 * @param {THREE.BufferGeometry} geometry
 */
function plain(geometry) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.deleteAttribute("uv");
  return flat;
}
