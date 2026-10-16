import { describe, expect, it, vi } from "vitest";
import { createInput } from "../src/core/input.js";

/**
 * @param {EventTarget} target
 * @param {"keydown" | "keyup"} type
 * @param {string} code
 * @param {{ repeat?: boolean }} [options]
 */
function key(target, type, code, { repeat = false } = {}) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, { code: { value: code }, repeat: { value: repeat } });
  target.dispatchEvent(event);
  return event;
}

describe("input", () => {
  it("maps keys to actions and tracks held keys", () => {
    const target = new EventTarget();
    const input = createInput(target);
    const pressed = vi.fn();
    const released = vi.fn();
    input.onPress(pressed);
    input.onRelease(released);

    const down = key(target, "keydown", "ArrowLeft");
    expect(down.defaultPrevented).toBe(true);
    expect(pressed).toHaveBeenCalledWith("left");
    expect(input.isHeld("left")).toBe(true);

    key(target, "keyup", "ArrowLeft");
    expect(released).toHaveBeenCalledWith("left");
    expect(input.isHeld("left")).toBe(false);
  });

  it("ignores OS auto-repeat and unmapped keys", () => {
    const target = new EventTarget();
    const input = createInput(target);
    const pressed = vi.fn();
    input.onPress(pressed);

    key(target, "keydown", "Enter");
    key(target, "keydown", "Enter", { repeat: true });
    const other = key(target, "keydown", "KeyQ");
    expect(pressed).toHaveBeenCalledTimes(1);
    expect(other.defaultPrevented).toBe(false);
  });

  it("releases held keys when the window loses focus", () => {
    const target = new EventTarget();
    const input = createInput(target);
    key(target, "keydown", "ArrowRight");
    target.dispatchEvent(new Event("blur"));
    expect(input.isHeld("right")).toBe(false);
  });

  it("on-screen buttons hold actions like keys (touch steering)", () => {
    const input = createInput(new EventTarget());
    const pressed = vi.fn();
    const released = vi.fn();
    input.onPress(pressed);
    input.onRelease(released);

    input.hold("left", true);
    input.hold("left", true); // a second pointerdown does not press again
    expect(input.isHeld("left")).toBe(true);
    expect(pressed).toHaveBeenCalledTimes(1);

    input.hold("left", false);
    input.hold("left", false); // pointerup and lostpointercapture both fire
    expect(input.isHeld("left")).toBe(false);
    expect(released).toHaveBeenCalledTimes(1);
  });

  it("stays held until the last finger or key lets go", () => {
    const target = new EventTarget();
    const input = createInput(target);
    const pressed = vi.fn();
    const released = vi.fn();
    input.onPress(pressed);
    input.onRelease(released);

    input.hold("left", true, 1);
    input.hold("left", true, 2); // a second finger on the same button
    key(target, "keydown", "ArrowLeft"); // and the key on a tablet with a keyboard
    expect(pressed).toHaveBeenCalledTimes(1);

    input.hold("left", false, 1);
    key(target, "keyup", "ArrowLeft");
    expect(input.isHeld("left")).toBe(true);
    expect(released).not.toHaveBeenCalled();

    input.hold("left", false, 2);
    expect(input.isHeld("left")).toBe(false);
    expect(released).toHaveBeenCalledTimes(1);
  });

  it("two keys for one action release it once, with the last key", () => {
    const target = new EventTarget();
    const input = createInput(target);
    const released = vi.fn();
    input.onRelease(released);

    key(target, "keydown", "Enter");
    key(target, "keydown", "NumpadEnter");
    key(target, "keyup", "Enter");
    expect(input.isHeld("start")).toBe(true);

    key(target, "keyup", "NumpadEnter");
    expect(input.isHeld("start")).toBe(false);
    expect(released).toHaveBeenCalledTimes(1);
  });
});
