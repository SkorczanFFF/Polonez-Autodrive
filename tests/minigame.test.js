import { describe, expect, it } from "vitest";
import { CAR, MINIGAME } from "../src/config.js";
import { createLanePicker } from "../src/game/minigame.js";

/** Deterministic pseudo-random sequence. @param {number} seed */
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

describe("lane picker", () => {
  const halfWidth = MINIGAME.box.size[0] / 2;
  const reach = CAR.steer.maxOffset;

  it("keeps boxes inside the steering range and outside the centre safe zone", () => {
    const next = createLanePicker(rng(1));
    for (let i = 0; i < 500; i++) {
      const x = next();
      expect(Math.abs(x)).toBeLessThanOrEqual(reach - MINIGAME.outerMargin);
      expect(Math.abs(x)).toBeGreaterThanOrEqual(MINIGAME.safeZone + halfWidth + MINIGAME.innerGap);
    }
  });

  it("starts on the left and switches lanes after batches of 1-3 boxes", () => {
    const next = createLanePicker(rng(7));
    const sides = Array.from({ length: 300 }, () => Math.sign(next()));
    expect(sides[0]).toBe(-1);

    let run = 1;
    for (let i = 1; i < sides.length; i++) {
      if (sides[i] === sides[i - 1]) run++;
      else {
        expect(run).toBeGreaterThanOrEqual(MINIGAME.batch[0]);
        expect(run).toBeLessThanOrEqual(MINIGAME.batch[1]);
        run = 1;
      }
    }
  });
});
