import { describe, expect, it, vi } from "vitest";
import { ZigbeeAdapterError } from "./adapter.js";
import { createMockAdapter } from "./mockAdapter.js";

describe("mockAdapter lifecycle", () => {
  it("starts and stops cleanly", async () => {
    const adapter = createMockAdapter();
    expect(adapter.getStatus().running).toBe(false);

    await adapter.start();
    expect(adapter.getStatus().running).toBe(true);

    await adapter.stop();
    expect(adapter.getStatus().running).toBe(false);
  });

  it("rejects start when already started", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    await expect(adapter.start()).rejects.toBeInstanceOf(ZigbeeAdapterError);
  });

  it("is idempotent on stop when not running", async () => {
    const adapter = createMockAdapter();
    await expect(adapter.stop()).resolves.toBeUndefined();
  });

  it("includes coordinatorPath / panId / channel in status when configured", async () => {
    const adapter = createMockAdapter({
      coordinatorPath: "/dev/ttyMOCK",
      panId: 0x1a62,
      channel: 15,
    });
    await adapter.start();
    expect(adapter.getStatus()).toEqual({
      running: true,
      coordinatorPath: "/dev/ttyMOCK",
      panId: 0x1a62,
      channel: 15,
    });
  });
});

describe("mockAdapter permitJoin", () => {
  it("activates and decrements with a controllable clock", async () => {
    let nowMs = 1_000_000;
    const adapter = createMockAdapter({ now: () => nowMs });
    await adapter.start();

    expect(adapter.getJoinStatus()).toEqual({ active: false, remainingSec: 0 });

    await adapter.permitJoin(60);
    expect(adapter.getJoinStatus()).toEqual({ active: true, remainingSec: 60 });

    nowMs += 30_000;
    expect(adapter.getJoinStatus()).toEqual({ active: true, remainingSec: 30 });

    nowMs += 30_000;
    expect(adapter.getJoinStatus()).toEqual({ active: false, remainingSec: 0 });
  });

  it("re-opens with a fresh countdown when called while active", async () => {
    let nowMs = 0;
    const adapter = createMockAdapter({ now: () => nowMs });
    await adapter.start();

    await adapter.permitJoin(30);
    nowMs += 20_000;
    await adapter.permitJoin(60);

    expect(adapter.getJoinStatus()).toEqual({ active: true, remainingSec: 60 });
  });

  it("closes immediately on permitJoin(0)", async () => {
    const adapter = createMockAdapter({ now: () => 0 });
    await adapter.start();

    await adapter.permitJoin(60);
    expect(adapter.getJoinStatus().active).toBe(true);

    await adapter.permitJoin(0);
    expect(adapter.getJoinStatus().active).toBe(false);
  });

  it("rejects durations over the Zigbee spec maximum", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    await expect(adapter.permitJoin(300)).rejects.toMatchObject({ code: "INVALID_DURATION" });
  });

  it("rejects negative durations", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    await expect(adapter.permitJoin(-1)).rejects.toMatchObject({ code: "INVALID_DURATION" });
  });

  it("rejects when adapter is not running", async () => {
    const adapter = createMockAdapter();
    await expect(adapter.permitJoin(30)).rejects.toMatchObject({ code: "NOT_RUNNING" });
  });
});

describe("mockAdapter events", () => {
  it("simulateDeviceJoin fires deviceJoined and lists the device", async () => {
    const adapter = createMockAdapter();
    await adapter.start();

    const handler = vi.fn();
    adapter.onEvent(handler);

    adapter.simulateDeviceJoin({
      ieeeAddress: "00:11:22:33:44:55:66:77",
      networkAddress: 0x1234,
      modelId: "TS0203",
      manufacturerName: "TuYa",
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      type: "deviceJoined",
      device: expect.objectContaining({ ieeeAddress: "00:11:22:33:44:55:66:77" }),
    });

    const devices = await adapter.listJoinedDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0]?.modelId).toBe("TS0203");
  });

  it("simulateDeviceLeave fires deviceLeft only for known devices", async () => {
    const adapter = createMockAdapter();
    await adapter.start();

    const handler = vi.fn();
    adapter.onEvent(handler);

    adapter.simulateDeviceLeave("unknown:device");
    expect(handler).not.toHaveBeenCalled();

    adapter.simulateDeviceJoin({ ieeeAddress: "aa:bb", networkAddress: 1 });
    handler.mockClear();

    adapter.simulateDeviceLeave("aa:bb");
    expect(handler).toHaveBeenCalledWith({ type: "deviceLeft", ieeeAddress: "aa:bb" });
    expect(await adapter.listJoinedDevices()).toHaveLength(0);
  });

  it("simulateMessage emits deviceMessage with the payload", async () => {
    const adapter = createMockAdapter();
    await adapter.start();

    const handler = vi.fn();
    adapter.onEvent(handler);

    adapter.simulateMessage("device:1", { state: "ON", brightness: 254 });
    expect(handler).toHaveBeenCalledWith({
      type: "deviceMessage",
      ieeeAddress: "device:1",
      payload: { state: "ON", brightness: 254 },
    });
  });

  it("fans events out to multiple handlers; unsubscribe stops only that handler", async () => {
    const adapter = createMockAdapter();
    await adapter.start();

    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const unsubA = adapter.onEvent(handlerA);
    adapter.onEvent(handlerB);

    adapter.simulateMessage("d", {});
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);

    unsubA();

    adapter.simulateMessage("d", {});
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(2);
  });

  it("clears handlers on stop so a restart doesn't re-fire to old subscribers", async () => {
    const adapter = createMockAdapter();
    await adapter.start();

    const handler = vi.fn();
    adapter.onEvent(handler);

    await adapter.stop();
    await adapter.start();

    adapter.simulateMessage("d", {});
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("mockAdapter listJoinedDevices", () => {
  it("rejects when not running", async () => {
    const adapter = createMockAdapter();
    await expect(adapter.listJoinedDevices()).rejects.toMatchObject({ code: "NOT_RUNNING" });
  });

  it("returns an empty array when no devices have joined", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    expect(await adapter.listJoinedDevices()).toEqual([]);
  });
});
