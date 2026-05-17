import { describe, expect, it, vi, beforeEach } from "vitest";

const startMock = vi.fn();
const stopMock = vi.fn();
const getNetworkParametersMock = vi.fn();

vi.mock("zigbee-herdsman", () => {
  class FakeController {
    start = startMock;
    stop = stopMock;
    getNetworkParameters = getNetworkParametersMock;
  }
  return { Controller: FakeController };
});

const { createHerdsmanAdapter } = await import("./herdsmanAdapter.js");
const { ZigbeeAdapterError } = await import("./adapter.js");

beforeEach(() => {
  startMock.mockReset().mockResolvedValue(undefined);
  stopMock.mockReset().mockResolvedValue(undefined);
  getNetworkParametersMock.mockReset();
});

describe("herdsmanAdapter lifecycle", () => {
  it("constructs and starts the herdsman Controller on start()", async () => {
    const adapter = createHerdsmanAdapter({
      coordinatorPath: "/dev/ttyUSB0",
      databasePath: "/tmp/zighub.db",
    });

    expect(adapter.getStatus()).toEqual({ running: false, coordinatorPath: "/dev/ttyUSB0" });

    await adapter.start();
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it("rejects start when already running", async () => {
    const adapter = createHerdsmanAdapter({
      coordinatorPath: "/dev/ttyUSB0",
      databasePath: "/tmp/zighub.db",
    });
    await adapter.start();
    await expect(adapter.start()).rejects.toBeInstanceOf(ZigbeeAdapterError);
  });

  it("is idempotent on stop when not running", async () => {
    const adapter = createHerdsmanAdapter({
      coordinatorPath: "/dev/ttyUSB0",
      databasePath: "/tmp/zighub.db",
    });
    await expect(adapter.stop()).resolves.toBeUndefined();
    expect(stopMock).not.toHaveBeenCalled();
  });

  it("stops cleanly when running", async () => {
    const adapter = createHerdsmanAdapter({
      coordinatorPath: "/dev/ttyUSB0",
      databasePath: "/tmp/zighub.db",
    });
    await adapter.start();
    await adapter.stop();
    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(adapter.getStatus().running).toBe(false);
  });
});

describe("herdsmanAdapter.getStatus", () => {
  it("reports network params from the controller when running", async () => {
    getNetworkParametersMock.mockResolvedValue({ panID: 0x1a62, channel: 11, extendedPanID: [] });
    const adapter = createHerdsmanAdapter({
      coordinatorPath: "/dev/ttyUSB0",
      databasePath: "/tmp/zighub.db",
    });
    await adapter.start();
    expect(adapter.getStatus()).toEqual({
      running: true,
      coordinatorPath: "/dev/ttyUSB0",
      panId: 0x1a62,
      channel: 11,
    });
  });

  it("returns running:true without panId/channel when getNetworkParameters throws", async () => {
    getNetworkParametersMock.mockRejectedValue(new Error("controller not ready"));
    const adapter = createHerdsmanAdapter({
      coordinatorPath: "/dev/ttyUSB0",
      databasePath: "/tmp/zighub.db",
    });
    await adapter.start();
    expect(adapter.getStatus()).toEqual({ running: true, coordinatorPath: "/dev/ttyUSB0" });
  });
});

describe("herdsmanAdapter NotImplemented surface", () => {
  it("permitJoin / getJoinStatus / listJoinedDevices / onEvent throw NOT_IMPLEMENTED", async () => {
    const adapter = createHerdsmanAdapter({
      coordinatorPath: "/dev/ttyUSB0",
      databasePath: "/tmp/zighub.db",
    });

    await expect(adapter.permitJoin(60)).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
    expect(() => adapter.getJoinStatus()).toThrowError(/NOT_IMPLEMENTED|not implemented/);
    await expect(adapter.listJoinedDevices()).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
    expect(() => adapter.onEvent(() => undefined)).toThrowError(/NOT_IMPLEMENTED|not implemented/);
  });
});
