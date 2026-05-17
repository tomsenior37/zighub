import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";
import { migrate } from "./db/migrate.js";
import { create } from "./domain/automations.js";

let db: Database.Database;
let app: FastifyInstance | undefined;

const VALID_YAML = `
version: 1
name: switch->lamp
trigger:
  type: device_event
  device: aa
  event: state
actions:
  - type: toggle
    device: bb
`;

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

describe("/api/automations CRUD", () => {
  it("POST creates a draft, GET lists it", async () => {
    app = await buildServer({ db });
    await app.ready();

    const createRes = await app.inject({
      method: "POST",
      url: "/api/automations",
      payload: { name: "Test", source_yaml: VALID_YAML },
    });
    expect(createRes.statusCode).toBe(200);
    const created: { id: number; state: string } = createRes.json();
    expect(created.state).toBe("draft");

    const listRes = await app.inject({ method: "GET", url: "/api/automations" });
    const list: Array<{ id: number }> = listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(created.id);
  });

  it("POST with invalid YAML returns 400 + issues", async () => {
    app = await buildServer({ db });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/automations",
      payload: { name: "Test", source_yaml: "version: 1\nname: x\nactions: []" },
    });
    expect(res.statusCode).toBe(400);
    const body: { error: string; issues: unknown[] } = res.json();
    expect(body.error).toBe("invalid_yaml");
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it("promote moves draft to active", async () => {
    const created = create(db, {
      name: "x",
      source_yaml: VALID_YAML,
      generation_method: "manual",
    });
    app = await buildServer({ db });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: `/api/automations/${created.id.toString()}/promote`,
    });
    expect(res.statusCode).toBe(200);
    const body: { state: string } = res.json();
    expect(body.state).toBe("active");
  });

  it("promote on non-draft returns 409", async () => {
    const created = create(db, {
      name: "x",
      source_yaml: VALID_YAML,
      generation_method: "manual",
    });
    db.prepare("UPDATE automations SET state = 'active' WHERE id = ?").run(created.id);
    app = await buildServer({ db });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: `/api/automations/${created.id.toString()}/promote`,
    });
    expect(res.statusCode).toBe(409);
  });

  it("disable + enable transitions", async () => {
    const created = create(db, {
      name: "x",
      source_yaml: VALID_YAML,
      generation_method: "manual",
    });
    db.prepare("UPDATE automations SET state = 'active' WHERE id = ?").run(created.id);
    app = await buildServer({ db });
    await app.ready();

    const disable = await app.inject({
      method: "POST",
      url: `/api/automations/${created.id.toString()}/disable`,
    });
    const disableBody: { state: string } = disable.json();
    expect(disableBody.state).toBe("disabled");

    const enable = await app.inject({
      method: "POST",
      url: `/api/automations/${created.id.toString()}/enable`,
    });
    const enableBody: { state: string } = enable.json();
    expect(enableBody.state).toBe("active");
  });

  it("DELETE active returns 409, DELETE draft returns 204", async () => {
    const draft = create(db, {
      name: "draft",
      source_yaml: VALID_YAML,
      generation_method: "manual",
    });
    const active = create(db, {
      name: "active",
      source_yaml: VALID_YAML,
      generation_method: "manual",
    });
    db.prepare("UPDATE automations SET state = 'active' WHERE id = ?").run(active.id);
    app = await buildServer({ db });
    await app.ready();

    const deleteActive = await app.inject({
      method: "DELETE",
      url: `/api/automations/${active.id.toString()}`,
    });
    expect(deleteActive.statusCode).toBe(409);

    const deleteDraft = await app.inject({
      method: "DELETE",
      url: `/api/automations/${draft.id.toString()}`,
    });
    expect(deleteDraft.statusCode).toBe(204);
  });
});
