import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";
import { migrate } from "./db/migrate.js";
import { create as createDevice } from "./domain/devices.js";
import { create as createLocation } from "./domain/locations.js";
import { list as listAudit } from "./domain/auditLog.js";
import { createMockAdapter } from "./zigbee/mockAdapter.js";

let db: Database.Database;
let app: FastifyInstance | undefined;

beforeEach(() => {
  db = new Database(":memory:");
  migrate(db);
});

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
  db.close();
});

describe("GET /api/devices", () => {
  it("returns an empty array when no devices are paired", async () => {
    app = await buildServer({ db });
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/devices" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("groups devices by location with online flag", async () => {
    const loc = createLocation(db, { name: "Kitchen" });
    createDevice(db, {
      z2m_id: "aa:bb",
      friendly_name: "switch-1",
      location_id: loc.id,
    });
    createDevice(db, { z2m_id: "cc:dd", friendly_name: "unassigned-1" });

    app = await buildServer({ db });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/devices" });
    const body: Array<{
      location: { name: string } | null;
      devices: Array<{ z2m_id: string; online: boolean }>;
    }> = res.json();
    expect(body).toHaveLength(2);
    expect(body[0]?.location?.name).toBe("Kitchen");
    expect(body[0]?.devices).toHaveLength(1);
    expect(body[0]?.devices[0]?.online).toBe(false);
    expect(body[1]?.location).toBeNull();
  });
});

describe("GET /api/devices/:ieeeAddress", () => {
  it("returns the device when present", async () => {
    createDevice(db, { z2m_id: "aa:bb", friendly_name: "x" });
    app = await buildServer({ db });
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/devices/aa:bb" });
    expect(res.statusCode).toBe(200);
    const body: { z2m_id: string } = res.json();
    expect(body.z2m_id).toBe("aa:bb");
  });

  it("returns 404 for unknown ieeeAddress", async () => {
    app = await buildServer({ db });
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/api/devices/missing" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "device_not_found", ieeeAddress: "missing" });
  });
});

describe("POST /api/devices/:ieeeAddress/command", () => {
  it("returns accepted and audit-logs on success", async () => {
    createDevice(db, { z2m_id: "aa:bb", friendly_name: "lamp" });
    const adapter = createMockAdapter();
    await adapter.start();
    app = await buildServer({ db, zigbeeAdapter: adapter });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/devices/aa:bb/command",
      payload: { state: "ON" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ accepted: true });

    expect(adapter.getCommandLog()).toEqual([{ ieeeAddress: "aa:bb", payload: { state: "ON" } }]);
    const audit = listAudit(db, { category: "zigbee" }).filter((e) => e.event === "device-command");
    expect(audit).toHaveLength(1);

    await adapter.stop();
  });

  it("404 when device is not in the DB", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    app = await buildServer({ db, zigbeeAdapter: adapter });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/devices/missing/command",
      payload: { state: "ON" },
    });
    expect(res.statusCode).toBe(404);

    await adapter.stop();
  });
});

describe("DELETE /api/devices/:ieeeAddress", () => {
  it("unpairs through the adapter, deletes the row, and audit-logs", async () => {
    createDevice(db, { z2m_id: "aa:bb", friendly_name: "lamp" });
    const adapter = createMockAdapter();
    await adapter.start();
    adapter.simulateDeviceJoin({ ieeeAddress: "aa:bb", networkAddress: 1 });
    app = await buildServer({ db, zigbeeAdapter: adapter });
    await app.ready();

    const res = await app.inject({ method: "DELETE", url: "/api/devices/aa:bb" });
    expect(res.statusCode).toBe(204);

    const getRes = await app.inject({ method: "GET", url: "/api/devices/aa:bb" });
    expect(getRes.statusCode).toBe(404);

    const audit = listAudit(db, { category: "devices" }).filter((e) => e.event === "unpaired");
    expect(audit).toHaveLength(1);
    expect(audit[0]?.details).toMatchObject({ ieeeAddress: "aa:bb", friendlyName: "lamp" });

    await adapter.stop();
  });

  it("returns 404 when the device is not in the DB", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    app = await buildServer({ db, zigbeeAdapter: adapter });
    await app.ready();

    const res = await app.inject({ method: "DELETE", url: "/api/devices/missing" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "device_not_found", ieeeAddress: "missing" });

    await adapter.stop();
  });

  it("returns 404 when the adapter no longer knows the device", async () => {
    createDevice(db, { z2m_id: "aa:bb", friendly_name: "lamp" });
    const adapter = createMockAdapter();
    await adapter.start();
    app = await buildServer({ db, zigbeeAdapter: adapter });
    await app.ready();

    const res = await app.inject({ method: "DELETE", url: "/api/devices/aa:bb" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: "UNKNOWN_DEVICE" });

    await adapter.stop();
  });
});

describe("PATCH /api/devices/:ieeeAddress", () => {
  it("renames a device and audit-logs the rename", async () => {
    createDevice(db, { z2m_id: "aa:bb", friendly_name: "original" });
    app = await buildServer({ db });
    await app.ready();

    const res = await app.inject({
      method: "PATCH",
      url: "/api/devices/aa:bb",
      payload: { friendly_name: "kitchen-switch" },
    });
    expect(res.statusCode).toBe(200);
    const body: { friendly_name: string } = res.json();
    expect(body.friendly_name).toBe("kitchen-switch");

    const audit = listAudit(db, { category: "devices" }).filter((e) => e.event === "renamed");
    expect(audit).toHaveLength(1);
  });

  it("returns 409 on name_collision", async () => {
    createDevice(db, { z2m_id: "a", friendly_name: "alpha" });
    createDevice(db, { z2m_id: "b", friendly_name: "beta" });
    app = await buildServer({ db });
    await app.ready();

    const res = await app.inject({
      method: "PATCH",
      url: "/api/devices/a",
      payload: { friendly_name: "beta" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: "name_collision" });
  });

  it("sets a valid location", async () => {
    const loc = createLocation(db, { name: "Hallway" });
    createDevice(db, { z2m_id: "aa:bb", friendly_name: "x" });
    app = await buildServer({ db });
    await app.ready();

    const res = await app.inject({
      method: "PATCH",
      url: "/api/devices/aa:bb",
      payload: { location_id: loc.id },
    });
    expect(res.statusCode).toBe(200);
    const body: { location_id: number } = res.json();
    expect(body.location_id).toBe(loc.id);
  });

  it("rejects empty body with 400", async () => {
    createDevice(db, { z2m_id: "aa:bb", friendly_name: "x" });
    app = await buildServer({ db });
    await app.ready();

    const res = await app.inject({ method: "PATCH", url: "/api/devices/aa:bb", payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 for unknown ieeeAddress", async () => {
    app = await buildServer({ db });
    await app.ready();

    const res = await app.inject({
      method: "PATCH",
      url: "/api/devices/missing",
      payload: { friendly_name: "x" },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/locations", () => {
  it("returns the list of locations", async () => {
    createLocation(db, { name: "Kitchen" });
    createLocation(db, { name: "Hallway" });
    app = await buildServer({ db });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/locations" });
    expect(res.statusCode).toBe(200);
    const body: Array<{ name: string }> = res.json();
    expect(body.map((l) => l.name).sort()).toEqual(["Hallway", "Kitchen"]);
  });
});

describe("GET /api/devices/:ieeeAddress/ping", () => {
  it("returns ok:true for a known joined device", async () => {
    createDevice(db, { z2m_id: "ping-1", friendly_name: "ping-test" });
    const adapter = createMockAdapter();
    await adapter.start();
    adapter.simulateDeviceJoin({ ieeeAddress: "ping-1", networkAddress: 1 });
    app = await buildServer({ db, zigbeeAdapter: adapter });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/devices/ping-1/ping" });
    expect(res.statusCode).toBe(200);
    const body: { ok: boolean } = res.json();
    expect(body.ok).toBe(true);

    await adapter.stop();
  });

  it("returns 404 when device is unknown", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    app = await buildServer({ db, zigbeeAdapter: adapter });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/devices/missing/ping" });
    expect(res.statusCode).toBe(404);

    await adapter.stop();
  });
});
