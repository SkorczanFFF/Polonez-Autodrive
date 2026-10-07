import { describe, expect, it, vi } from "vitest";
import { createStateMachine, nextState } from "../src/game/state.js";

describe("game state machine", () => {
  it("ENTER starts the minigame from the menu, free ride and game over", () => {
    expect(nextState("idle", "start")).toBe("countdown");
    expect(nextState("free", "start")).toBe("countdown");
    expect(nextState("gameover", "start")).toBe("countdown");
  });

  it("ignores ENTER while playing or counting down (v1: car reset mid-game)", () => {
    expect(nextState("playing", "start")).toBeNull();
    expect(nextState("countdown", "start")).toBeNull();
  });

  it("F enters free ride only from the menu or game over", () => {
    expect(nextState("idle", "free")).toBe("free");
    expect(nextState("gameover", "free")).toBe("free");
    expect(nextState("playing", "free")).toBeNull();
  });

  it("ESC always leaves to the menu, except in the menu itself", () => {
    for (const state of /** @type {const} */ (["free", "countdown", "playing", "gameover"])) {
      expect(nextState(state, "exit")).toBe("idle");
    }
    expect(nextState("idle", "exit")).toBeNull();
  });

  it("timers and crashes drive the minigame flow", () => {
    expect(nextState("countdown", "timeout")).toBe("playing");
    expect(nextState("playing", "crash")).toBe("gameover");
    expect(nextState("gameover", "timeout")).toBe("idle");
  });

  it("reports transitions and rejects invalid events", () => {
    const onChange = vi.fn();
    const machine = createStateMachine("idle", onChange);
    expect(machine.send("exit")).toBe(false);
    expect(machine.send("start")).toBe(true);
    expect(machine.state).toBe("countdown");
    expect(onChange).toHaveBeenCalledWith("countdown", "idle", "start");
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
