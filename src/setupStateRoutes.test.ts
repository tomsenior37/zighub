import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";
import { migrate } from "./db/migrate.js";
import { SETTINGS_KEYS, createSettingsRepo } from "./domain/settings.js";
import { list as listAudit } from "./domain/auditLog.js";

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

describe("GET /api/setup-state", () => {
  it("returns firstRunComplete:false on a fresh DB", async () => {
    const settings = createSettingsRepo(db);
    app = await buildServer({ settings, db });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/setup-state" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ firstRunComplete: false });
  });

  it("returns firstRunComplete:true when the flag is set", async () => {
    const settings = createSettingsRepo(db);
    settings.set(SETTINGS_KEYS.FIRST_RUN_COMPLETE, true);
    app = await buildServer({ settings, db });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/setup-state" });
    expect(res.json()).toEqual({ firstRunComplete: true });
  });
});

describe("POST /api/setup-state", () => {
  it("persists the flag and audit-logs", async () => {
    const settings = createSettingsRepo(db);
    app = await buildServer({ settings, db });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/setup-state",
      payload: { firstRunComplete: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ firstRunComplete: true });
    expect(settings.get(SETTINGS_KEYS.FIRST_RUN_COMPLETE)).toBe(true);

    const audit = listAudit(db, { category: "setup" });
    expect(audit).toHaveLength(1);
    expect(audit[0]?.event).toBe("first-run-set");
  });

  it("rejects missing body with 400", async () => {
    const settings = createSettingsRepo(db);
    app = await buildServer({ settings, db });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/setup-state",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});
