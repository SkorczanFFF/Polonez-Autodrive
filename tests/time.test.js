import { describe, expect, it } from "vitest";
import { frames, perFrame } from "../src/core/time.js";

describe("time", () => {
  it("counts 60 Hz frames in a delta", () => {
    expect(frames(1 / 60)).toBeCloseTo(1);
    expect(frames(1 / 144)).toBeCloseTo(60 / 144);
  });

  it("perFrame equals the tuned factor at 60 Hz", () => {
    expect(perFrame(0.15, 1 / 60)).toBeCloseTo(0.15);
  });

  it("perFrame gives the same result regardless of frame rate", () => {
    const k = 0.15;
    const twoHalfSteps = 1 - (1 - perFrame(k, 1 / 120)) ** 2;
    expect(twoHalfSteps).toBeCloseTo(k);
  });
});
