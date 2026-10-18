import { describe, expect, it } from "vitest";
import { formatProgress } from "../src/ui/loader.js";
import { TEXT } from "../src/config.js";

describe("formatProgress", () => {
  it("renders an empty bar before anything is known", () => {
    expect(formatProgress(0, 0, 4)).toBe(`${TEXT.loading}: [    ] 0%`);
  });

  it("fills the bar proportionally", () => {
    expect(formatProgress(5, 10, 4)).toBe(`${TEXT.loading}: [==  ] 50%`);
    expect(formatProgress(10, 10, 4)).toBe(`${TEXT.loading}: [====] 100%`);
  });

  it("never overflows", () => {
    expect(formatProgress(12, 10, 4)).toBe(`${TEXT.loading}: [====] 100%`);
  });
});
