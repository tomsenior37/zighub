import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockAdapter } from "../zigbee/mockAdapter.js";
import { executeAction, __testing } from "./actions.js";

const { clampAndRound } = __testing;

describe("clampAndRound", () => {
  it.each([
    [127, 0, 254, undefined, 127],
    [300, 0, 254, undefined, 254],
    [-1, 0, 254, undefined, 0],
    [127, 0, 254, 10, 130],
    [124, 0, 254, 10, 120],
    [127, 100, 200, undefined, 127],
  ])("clampAndRound(%s,%s,%s,%s) === %s", (v, min, max, step, expected) => {
    expect(clampAndRound(v, min, max, step)).toBe(expected);
  });
});

describe("executeAction", () => {
  let adapter: ReturnType<typeof createMockAdapter>;
  beforeEach(async () => {
    adapter = createMockAdapter();
    await adapter.start();
  });
  afterEach(async () => {
    await adapter.stop();
  });

  it("toggle sends state:TOGGLE", async () => {
    const result = await executeAction({ type: "toggle", device: "aa" }, { adapter });
    expect(result).toEqual({ ok: true });
    expect(adapter.getCommandLog()).toEqual([{ ieeeAddress: "aa", payload: { state: "TOGGLE" } }]);
  });

  it("set_state sends the requested state", async () => {
    await executeAction({ type: "set_state", device: "aa", state: "ON" }, { adapter });
    expect(adapter.getCommandLog()[0]?.payload).toEqual({ state: "ON" });
  });

  it("adjust_brightness clamps + rounds before sending", async () => {
    await executeAction(
      { type: "adjust_brightness", device: "aa", brightness: 127, step: 10 },
      { adapter },
    );
    expect(adapter.getCommandLog()[0]?.payload).toEqual({ brightness: 130 });
  });

  it("adjust_brightness clamps above max", async () => {
    await executeAction(
      { type: "adjust_brightness", device: "aa", brightness: 500, max: 200 },
      { adapter },
    );
    expect(adapter.getCommandLog()[0]?.payload).toEqual({ brightness: 200 });
  });

  it("delay actually waits", async () => {
    vi.useFakeTimers();
    const promise = executeAction({ type: "delay", ms: 500 }, { adapter });
    let resolved = false;
    void promise.then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(499);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(resolved).toBe(true);
    vi.useRealTimers();
  });

  it("send_notification logs", async () => {
    const info = vi.fn();
    const result = await executeAction(
      { type: "send_notification", message: "hello" },
      { adapter, logger: { info } },
    );
    expect(result).toEqual({ ok: true });
    expect(info).toHaveBeenCalledTimes(1);
  });

  it("sendCommand failure surfaces as {ok:false}", async () => {
    const failing = createMockAdapter();
    await failing.start();
    failing.sendCommand = vi.fn(() => Promise.reject(new Error("boom")));
    const result = await executeAction({ type: "toggle", device: "aa" }, { adapter: failing });
    expect(result).toEqual({ ok: false, error: "boom" });
  });
});
