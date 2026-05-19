import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import { buildServer } from "./server.js";
import { migrate } from "./db/migrate.js";
import { createSettingsRepo, SETTINGS_KEYS } from "./domain/settings.js";
import { VERSION } from "./version.js";
import { createMockAdapter } from "./zigbee/mockAdapter.js";

let app: FastifyInstance | undefined;
const cleanupDirs: string[] = [];

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
  while (cleanupDirs.length > 0) {
    const dir = cleanupDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function makeWebRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "zighub-web-"));
  writeFileSync(join(dir, "index.html"), "<!doctype html><title>spa</title>");
  writeFileSync(join(dir, "favicon.ico"), "x");
  cleanupDirs.push(dir);
  return dir;
}

describe("GET /health", () => {
  it("returns 200 with status ok and the package version", async () => {
    app = await buildServer();
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.json()).toEqual({ status: "ok", version: VERSION });
  });
});

describe("buildServer", () => {
  it("can be closed without ever listening", async () => {
    app = await buildServer();
    await app.ready();
    await app.close();
    app = undefined;
  });
});

describe("static web serving", () => {
  it("does not serve the SPA when serveStaticWeb is false", async () => {
    app = await buildServer({ serveStaticWeb: false });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("serves the SPA index.html for unknown GET routes when enabled", async () => {
    const root = makeWebRoot();
    app = await buildServer({ serveStaticWeb: true, staticWebRoot: root });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/some/deep/route" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<title>spa</title>");
  });

  it("serves /health as JSON even when static web is enabled", async () => {
    const root = makeWebRoot();
    app = await buildServer({ serveStaticWeb: true, staticWebRoot: root });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", version: VERSION });
  });

  it("returns JSON 404 for unknown /api routes (does not fall back to SPA)", async () => {
    const root = makeWebRoot();
    app = await buildServer({ serveStaticWeb: true, staticWebRoot: root });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/missing" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.json()).toEqual({ error: "not_found" });
  });

  it("returns JSON 404 for non-GET methods", async () => {
    const root = makeWebRoot();
    app = await buildServer({ serveStaticWeb: true, staticWebRoot: root });
    await app.ready();

    const res = await app.inject({ method: "POST", url: "/anything" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("does not throw when the static root does not exist (logs a warning)", async () => {
    app = await buildServer({
      serveStaticWeb: true,
      staticWebRoot: "/nonexistent/path/that/should/not/be/there",
    });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });
});

describe("/api/coordinators/ports", () => {
  it("returns the list of serial ports from the injected lister", async () => {
    app = await buildServer({
      serialPortLister: {
        list: () =>
          Promise.resolve([
            {
              path: "/dev/ttyUSB0",
              manufacturer: "Silicon Labs",
              vendorId: "0x10C4",
              productId: "EA60",
            },
            { path: "/dev/ttyACM0", manufacturer: "ConBee" },
          ]),
      },
    });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/coordinators/ports" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        path: "/dev/ttyUSB0",
        manufacturer: "Silicon Labs",
        vendorId: "10c4",
        productId: "ea60",
      },
      { path: "/dev/ttyACM0", manufacturer: "ConBee" },
    ]);
  });
});

describe("/api/coordinators/detect", () => {
  it("returns detected coordinators sorted by confidence", async () => {
    app = await buildServer({
      serialPortLister: {
        list: () =>
          Promise.resolve([
            { path: "/dev/ttyMouse", manufacturer: "Generic USB Mouse" },
            {
              path: "/dev/ttyUSB0",
              vendorId: "10c4",
              productId: "ea60",
              manufacturer: "Silicon Labs",
            },
            { path: "/dev/ttyACM0", vendorId: "1cf1", productId: "ffff" },
          ]),
      },
    });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/coordinators/detect" });
    expect(res.statusCode).toBe(200);
    const body: Array<{ path: string; confidence: string }> = res.json();
    expect(body.map((d) => ({ path: d.path, confidence: d.confidence }))).toEqual([
      { path: "/dev/ttyUSB0", confidence: "high" },
      { path: "/dev/ttyACM0", confidence: "medium" },
    ]);
  });
});

describe("/api/coordinators/select", () => {
  function makeApp() {
    const db = new Database(":memory:");
    migrate(db);
    const settings = createSettingsRepo(db);
    const lister = {
      list: () =>
        Promise.resolve([
          { path: "/dev/ttyUSB0", vendorId: "10c4", productId: "ea60" },
          { path: "/dev/ttyACM0", vendorId: "1cf1", productId: "0030" },
        ]),
    };
    return { db, settings, lister };
  }

  it("persists a valid selection and returns it", async () => {
    const { settings, lister } = makeApp();
    app = await buildServer({ serialPortLister: lister, settings });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/coordinators/select",
      payload: { path: "/dev/ttyUSB0" },
    });
    expect(res.statusCode).toBe(200);
    const body: { path: string; selectedAt: number } = res.json();
    expect(body.path).toBe("/dev/ttyUSB0");
    expect(typeof body.selectedAt).toBe("number");

    expect(settings.get(SETTINGS_KEYS.COORDINATOR_PATH)).toEqual({
      path: "/dev/ttyUSB0",
      selectedAt: body.selectedAt,
    });
  });

  it("rejects a path not in the current serial port list with 400 port_not_found", async () => {
    const { settings, lister } = makeApp();
    app = await buildServer({ serialPortLister: lister, settings });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/coordinators/select",
      payload: { path: "/dev/ttyDOESNOTEXIST" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "port_not_found", path: "/dev/ttyDOESNOTEXIST" });
  });

  it("re-selecting overwrites the previous selection", async () => {
    const { settings, lister } = makeApp();
    app = await buildServer({ serialPortLister: lister, settings });
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/api/coordinators/select",
      payload: { path: "/dev/ttyUSB0" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/coordinators/select",
      payload: { path: "/dev/ttyACM0" },
    });
    expect(second.statusCode).toBe(200);
    const stored = settings.get<{ path: string }>(SETTINGS_KEYS.COORDINATOR_PATH);
    expect(stored?.path).toBe("/dev/ttyACM0");
  });

  it("rejects empty or malformed bodies with 400", async () => {
    const { settings, lister } = makeApp();
    app = await buildServer({ serialPortLister: lister, settings });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/coordinators/select",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("/api/coordinators/selected", () => {
  it("returns null when nothing is selected yet", async () => {
    const db = new Database(":memory:");
    migrate(db);
    const settings = createSettingsRepo(db);
    app = await buildServer({ settings });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/coordinators/selected" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe("null");
  });

  it("returns the stored selection after a successful POST", async () => {
    const db = new Database(":memory:");
    migrate(db);
    const settings = createSettingsRepo(db);
    const lister = {
      list: () => Promise.resolve([{ path: "/dev/ttyUSB0" }]),
    };
    app = await buildServer({ settings, serialPortLister: lister });
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/api/coordinators/select",
      payload: { path: "/dev/ttyUSB0" },
    });

    const res = await app.inject({ method: "GET", url: "/api/coordinators/selected" });
    expect(res.statusCode).toBe(200);
    const body: { path: string } = res.json();
    expect(body.path).toBe("/dev/ttyUSB0");
  });
});

describe("/api/network/create", () => {
  it("returns NetworkInfo and persists it via settings", async () => {
    const db = new Database(":memory:");
    migrate(db);
    const settings = createSettingsRepo(db);
    const adapter = createMockAdapter();
    await adapter.start();

    app = await buildServer({ zigbeeAdapter: adapter, settings });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/network/create",
      payload: { channel: 22 },
    });
    expect(res.statusCode).toBe(200);
    const body: { channel: number; panId: number; networkKeyHash: string } = res.json();
    expect(body.channel).toBe(22);
    expect(body.networkKeyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(settings.get(SETTINGS_KEYS.NETWORK_INFO)).toMatchObject({ channel: 22 });

    await adapter.stop();
    db.close();
  });

  it("rejects out-of-range channel with 400", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    app = await buildServer({ zigbeeAdapter: adapter });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/network/create",
      payload: { channel: 30 },
    });
    expect(res.statusCode).toBe(400);

    await adapter.stop();
  });

  it("GET /api/network returns null before creation and the info after", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    app = await buildServer({ zigbeeAdapter: adapter });
    await app.ready();

    const before = await app.inject({ method: "GET", url: "/api/network" });
    expect(before.statusCode).toBe(200);
    expect(before.body).toBe("null");

    await app.inject({ method: "POST", url: "/api/network/create", payload: {} });

    const after = await app.inject({ method: "GET", url: "/api/network" });
    const body: { channel: number } = after.json();
    expect(body.channel).toBeGreaterThan(0);

    await adapter.stop();
  });
});

describe("/api/network/permit-join", () => {
  it("opens permit-join, returns active status, audit-logs", async () => {
    const db = new Database(":memory:");
    migrate(db);
    const adapter = createMockAdapter({ now: () => 1_000_000 });
    await adapter.start();

    app = await buildServer({ zigbeeAdapter: adapter, db });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/network/permit-join",
      payload: { durationSec: 60 },
    });
    expect(res.statusCode).toBe(200);
    const body: { active: boolean; remainingSec: number } = res.json();
    expect(body.active).toBe(true);
    expect(body.remainingSec).toBeGreaterThan(0);

    const audit = db
      .prepare("SELECT event FROM audit_log WHERE category = ?")
      .all("network") as Array<{ event: string }>;
    expect(audit).toEqual([{ event: "permit-join-open" }]);

    await adapter.stop();
    db.close();
  });

  it("rejects durationSec > 255 with 400", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    app = await buildServer({ zigbeeAdapter: adapter });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/network/permit-join",
      payload: { durationSec: 300 },
    });
    expect(res.statusCode).toBe(400);

    await adapter.stop();
  });

  it("durationSec=0 logs permit-join-stop", async () => {
    const db = new Database(":memory:");
    migrate(db);
    const adapter = createMockAdapter();
    await adapter.start();
    app = await buildServer({ zigbeeAdapter: adapter, db });
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/api/network/permit-join",
      payload: { durationSec: 30 },
    });
    await app.inject({
      method: "POST",
      url: "/api/network/permit-join",
      payload: { durationSec: 0 },
    });

    const audit = db
      .prepare("SELECT event FROM audit_log WHERE category = ?")
      .all("network") as Array<{ event: string }>;
    expect(audit.map((e) => e.event)).toEqual(["permit-join-open", "permit-join-stop"]);

    await adapter.stop();
    db.close();
  });

  it("GET returns the live status", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    app = await buildServer({ zigbeeAdapter: adapter });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/network/permit-join" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ active: false, remainingSec: 0 });

    await adapter.stop();
  });
});

describe("/api/zigbee/status", () => {
  it("returns the adapter's getStatus when an adapter is wired in", async () => {
    const adapter = createMockAdapter({
      coordinatorPath: "/dev/ttyMOCK",
      panId: 0x1a62,
      channel: 11,
    });
    await adapter.start();

    app = await buildServer({
      zigbeeAdapter: adapter,
      zigbeeRuntime: {
        adapterMode: "mock",
        adapterReason: "ZIGBEE_ENABLED is not '1'",
      },
    });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/zigbee/status" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      running: true,
      coordinatorPath: "/dev/ttyMOCK",
      panId: 0x1a62,
      channel: 11,
      adapterMode: "mock",
      adapterReason: "ZIGBEE_ENABLED is not '1'",
      mockMode: true,
    });

    await adapter.stop();
  });

  it("reports herdsman mode when runtime metadata says the real adapter is selected", async () => {
    const adapter = createMockAdapter({
      coordinatorPath: "/dev/ttyUSB0",
      panId: 0x1a62,
      channel: 11,
    });
    await adapter.start();

    app = await buildServer({
      zigbeeAdapter: adapter,
      zigbeeRuntime: {
        adapterMode: "herdsman",
        adapterReason: "ZIGBEE_ENABLED=1 with coordinator + database paths configured",
      },
    });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/zigbee/status" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      adapterMode: "herdsman",
      adapterReason: "ZIGBEE_ENABLED=1 with coordinator + database paths configured",
      mockMode: false,
      running: true,
      coordinatorPath: "/dev/ttyUSB0",
    });

    await adapter.stop();
  });

  it("returns 404 (no route) when no adapter is wired in", async () => {
    app = await buildServer();
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/zigbee/status" });
    expect(res.statusCode).toBe(404);
  });
});
