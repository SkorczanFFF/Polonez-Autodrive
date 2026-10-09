import { describe, expect, it, vi } from "vitest";
import { createTweens, easeInOutCubic } from "../src/core/tween.js";

describe("tweens", () => {
  it("eases from 0 to 1 and completes once", () => {
    const tweens = createTweens();
    const values = [];
    const onComplete = vi.fn();
    tweens.add({ duration: 1, onUpdate: (v) => values.push(v), onComplete });
    for (let i = 0; i < 70; i++) tweens.update(1 / 60);
    expect(values.at(-1)).toBe(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(values.length).toBeLessThanOrEqual(61);
  });

  it("cancel stops updates without completing", () => {
    const tweens = createTweens();
    const onUpdate = vi.fn();
    const onComplete = vi.fn();
    const handle = tweens.add({ duration: 1, onUpdate, onComplete });
    tweens.update(0.1);
    handle.cancel();
    tweens.update(2);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
    expect(handle.isActive()).toBe(false);
  });

  it("easeInOutCubic is symmetric", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.25)).toBeCloseTo(1 - easeInOutCubic(0.75));
  });
});
