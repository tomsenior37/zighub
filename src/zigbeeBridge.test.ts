import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "./db/migrate.js";
import { create as createLocation } from "./domain/locations.js";
import {
  create as createDevice,
  get as getDevice,
  list as listDevices,
  setLocation,
} from "./domain/devices.js";
import { list as listAudit } from "./domain/auditLog.js";
import { createMockAdapter } from "./zigbee/mockAdapter.js";
import { attachZigbeeBridge, __testing } from "./zigbeeBridge.js";

const { shortName } = __testing;

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  migrate(db);
});

afterEach(() => {
  db.close();
});

describe("shortName", () => {
  it("uses the last 6 hex chars, lowercase, no separators", () => {
    expect(shortName("00:11:22:33:44:55:66:77")).toBe("device_556677");
    expect(shortName("AABBCC")).toBe("device_aabbcc");
  });

  it("handles short addresses gracefully", () => {
    expect(shortName("abc")).toBe("device_abc");
  });
});

describe("zigbeeBridge deviceJoined", () => {
  it("inserts a fresh device row with default friendly_name", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    attachZigbeeBridge({ adapter, db });

    adapter.simulateDeviceJoin({
      ieeeAddress: "00:11:22:33:44:55:66:77",
      networkAddress: 0x1234,
      modelId: "TS0203",
      manufacturerName: "TuYa",
    });

    const row = getDevice(db, "00:11:22:33:44:55:66:77");
    expect(row).toBeDefined();
    expect(row?.friendly_name).toBe("device_556677");
    expect(row?.model).toBe("TS0203");
    expect(row?.manufacturer).toBe("TuYa");
    expect(row?.location_id).toBeNull();
  });

  it("audit-logs the join", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    attachZigbeeBridge({ adapter, db });

    adapter.simulateDeviceJoin({ ieeeAddress: "aa:bb:cc:dd:ee:ff:00:11", networkAddress: 1 });

    const audit = listAudit(db, { category: "zigbee" });
    expect(audit).toHaveLength(1);
    expect(audit[0]?.event).toBe("device-joined");
    expect(audit[0]?.details).toMatchObject({ ieeeAddress: "aa:bb:cc:dd:ee:ff:00:11" });
  });

  it("preserves user-set friendly_name and location on re-join, updates model + last_seen_at", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    attachZigbeeBridge({ adapter, db });

    // Initial join
    adapter.simulateDeviceJoin({
      ieeeAddress: "00:00:00:00:00:00:00:01",
      networkAddress: 1,
      modelId: "TS0001",
      manufacturerName: "TuYa",
    });

    // User customises the row
    const loc = createLocation(db, { name: "Living Room" });
    setLocation(db, "00:00:00:00:00:00:00:01", loc.id);
    // Rename via direct DB so we don't depend on rename API existing yet
    db.prepare("UPDATE devices SET friendly_name = 'kitchen-switch' WHERE z2m_id = ?").run(
      "00:00:00:00:00:00:00:01",
    );

    // Re-join with updated model info
    adapter.simulateDeviceJoin({
      ieeeAddress: "00:00:00:00:00:00:00:01",
      networkAddress: 1,
      modelId: "TS0001-V2",
      manufacturerName: "TuYa-Renamed",
    });

    const row = getDevice(db, "00:00:00:00:00:00:00:01");
    expect(row?.friendly_name).toBe("kitchen-switch");
    expect(row?.location_id).toBe(loc.id);
    expect(row?.model).toBe("TS0001-V2");
    expect(row?.manufacturer).toBe("TuYa-Renamed");
    expect(row?.last_seen_at).not.toBeNull();

    const audit = listAudit(db, { category: "zigbee" });
    expect(audit.map((e) => e.event)).toContain("device-rejoined");
  });

  it("resolves friendly_name collisions with -2, -3 suffixes", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    attachZigbeeBridge({ adapter, db });

    // Pre-populate two devices that would collide with the default name
    createDevice(db, { z2m_id: "preexisting-1", friendly_name: "device_556677" });
    createDevice(db, { z2m_id: "preexisting-2", friendly_name: "device_556677-2" });

    adapter.simulateDeviceJoin({
      ieeeAddress: "00:11:22:33:44:55:66:77",
      networkAddress: 0x1234,
    });

    const row = getDevice(db, "00:11:22:33:44:55:66:77");
    expect(row?.friendly_name).toBe("device_556677-3");
  });

  it("detach() stops further events from touching the DB", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    const bridge = attachZigbeeBridge({ adapter, db });

    adapter.simulateDeviceJoin({ ieeeAddress: "11:11:11:11:11:11:11:11", networkAddress: 1 });
    expect(listDevices(db).flatMap((g) => g.devices)).toHaveLength(1);

    bridge.detach();

    adapter.simulateDeviceJoin({ ieeeAddress: "22:22:22:22:22:22:22:22", networkAddress: 2 });
    expect(listDevices(db).flatMap((g) => g.devices)).toHaveLength(1);
  });

  it("handler errors are logged but never crash the caller", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    const logger = { error: vi.fn() };
    attachZigbeeBridge({ adapter, db, logger });

    // Drop the devices table to force a SQL error inside the handler
    db.exec("DROP TABLE devices");

    expect(() => {
      adapter.simulateDeviceJoin({ ieeeAddress: "00:00:00:00:00:00:00:99", networkAddress: 1 });
    }).not.toThrow();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
