import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "../db/migrate.js";
import { create as createLocation } from "./locations.js";
import {
  create,
  deleteAutomation,
  disable,
  enable,
  get,
  list,
  promote,
  recordRun,
  updateYaml,
  ValidationError,
} from "./automations.js";

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

const YAML_A = "trigger: { device: button-1, event: press }\naction: { device: lamp, set: on }";
const YAML_B = "trigger: { time: '07:00' }\naction: { device: blinds, set: open }";

describe("automations.create", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("inserts a draft automation with defaults", () => {
    const a = create(db, {
      name: "Morning lights",
      source_yaml: YAML_A,
      generation_method: "manual",
    });
    expect(a.id).toBeGreaterThan(0);
    expect(a.name).toBe("Morning lights");
    expect(a.source_yaml).toBe(YAML_A);
    expect(a.generation_method).toBe("manual");
    expect(a.state).toBe("draft");
    expect(a.primary_location_id).toBeNull();
    expect(a.last_triggered_at).toBeNull();
    expect(a.run_count).toBe(0);
    expect(a.created_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(a.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("inserts with primary_location_id set", () => {
    const loc = createLocation(db, { name: "Kitchen" });
    const a = create(db, {
      name: "Kitchen morning",
      source_yaml: YAML_A,
      generation_method: "visual",
      primary_location_id: loc.id,
    });
    expect(a.primary_location_id).toBe(loc.id);
    expect(a.generation_method).toBe("visual");
  });

  it("always lands as draft even if caller tries to be sneaky", () => {
    const a = create(db, {
      name: "X",
      source_yaml: YAML_A,
      generation_method: "llm",
    });
    expect(a.state).toBe("draft");
  });

  it("rejects empty name", () => {
    expect(() =>
      create(db, { name: "", source_yaml: YAML_A, generation_method: "manual" }),
    ).toThrow(ValidationError);
  });

  it("rejects whitespace-only name", () => {
    expect(() =>
      create(db, { name: "   ", source_yaml: YAML_A, generation_method: "manual" }),
    ).toThrow(ValidationError);
  });

  it("rejects empty source_yaml", () => {
    expect(() => create(db, { name: "X", source_yaml: "", generation_method: "manual" })).toThrow(
      ValidationError,
    );
  });

  it("rejects invalid generation_method", () => {
    expect(() =>
      create(db, {
        name: "X",
        source_yaml: YAML_A,
        // @ts-expect-error testing runtime validation
        generation_method: "telepathy",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects duplicate name", () => {
    create(db, { name: "Same", source_yaml: YAML_A, generation_method: "manual" });
    expect(() =>
      create(db, { name: "Same", source_yaml: YAML_B, generation_method: "manual" }),
    ).toThrow(ValidationError);
  });

  it("rejects primary_location_id pointing at a missing location", () => {
    expect(() =>
      create(db, {
        name: "X",
        source_yaml: YAML_A,
        generation_method: "manual",
        primary_location_id: 9999,
      }),
    ).toThrow(ValidationError);
  });
});

describe("automations.list", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns an empty array on an empty table", () => {
    expect(list(db)).toEqual([]);
  });

  it("orders alphabetically by name (case-insensitive)", () => {
    create(db, { name: "Charlie", source_yaml: YAML_A, generation_method: "manual" });
    create(db, { name: "alpha", source_yaml: YAML_A, generation_method: "manual" });
    create(db, { name: "Bravo", source_yaml: YAML_A, generation_method: "manual" });
    const rows = list(db);
    expect(rows.map((r) => r.name)).toEqual(["alpha", "Bravo", "Charlie"]);
  });

  it("filters by state", () => {
    const draft = create(db, { name: "D", source_yaml: YAML_A, generation_method: "manual" });
    const active = create(db, { name: "A", source_yaml: YAML_A, generation_method: "manual" });
    promote(db, active.id);
    const disabled = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    promote(db, disabled.id);
    disable(db, disabled.id);

    expect(list(db, { state: "draft" }).map((r) => r.id)).toEqual([draft.id]);
    expect(list(db, { state: "active" }).map((r) => r.id)).toEqual([active.id]);
    expect(list(db, { state: "disabled" }).map((r) => r.id)).toEqual([disabled.id]);
  });

  it("filters by locationId", () => {
    const kitchen = createLocation(db, { name: "Kitchen" });
    const lounge = createLocation(db, { name: "Lounge" });
    const k = create(db, {
      name: "K",
      source_yaml: YAML_A,
      generation_method: "manual",
      primary_location_id: kitchen.id,
    });
    create(db, {
      name: "L",
      source_yaml: YAML_A,
      generation_method: "manual",
      primary_location_id: lounge.id,
    });
    create(db, { name: "Floating", source_yaml: YAML_A, generation_method: "manual" });

    const rows = list(db, { locationId: kitchen.id });
    expect(rows.map((r) => r.id)).toEqual([k.id]);
  });

  it("filters by locationId null (unassigned only)", () => {
    const loc = createLocation(db, { name: "Kitchen" });
    create(db, {
      name: "K",
      source_yaml: YAML_A,
      generation_method: "manual",
      primary_location_id: loc.id,
    });
    const floating = create(db, {
      name: "Floating",
      source_yaml: YAML_A,
      generation_method: "manual",
    });

    const rows = list(db, { locationId: null });
    expect(rows.map((r) => r.id)).toEqual([floating.id]);
  });

  it("combines state and locationId filters", () => {
    const kitchen = createLocation(db, { name: "Kitchen" });
    const draftK = create(db, {
      name: "Kdraft",
      source_yaml: YAML_A,
      generation_method: "manual",
      primary_location_id: kitchen.id,
    });
    const activeK = create(db, {
      name: "Kactive",
      source_yaml: YAML_A,
      generation_method: "manual",
      primary_location_id: kitchen.id,
    });
    promote(db, activeK.id);

    const rows = list(db, { state: "draft", locationId: kitchen.id });
    expect(rows.map((r) => r.id)).toEqual([draftK.id]);
  });

  it("rejects locationId pointing at a missing location", () => {
    expect(() => list(db, { locationId: 9999 })).toThrow(ValidationError);
  });

  it("rejects invalid state filter", () => {
    expect(() =>
      // @ts-expect-error testing runtime validation
      list(db, { state: "broken" }),
    ).toThrow(ValidationError);
  });
});

describe("automations.get", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns the automation when it exists", () => {
    const created = create(db, {
      name: "X",
      source_yaml: YAML_A,
      generation_method: "manual",
    });
    expect(get(db, created.id)).toEqual(created);
  });

  it("returns undefined for an unknown id", () => {
    expect(get(db, 9999)).toBeUndefined();
  });
});

describe("automations.updateYaml", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("replaces source_yaml and bumps updated_at", async () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    await new Promise((r) => setTimeout(r, 1100));
    const updated = updateYaml(db, a.id, YAML_B);
    expect(updated.source_yaml).toBe(YAML_B);
    expect(updated.updated_at >= a.updated_at).toBe(true);
    expect(updated.updated_at).not.toBe(a.updated_at);
  });

  it("resets state to draft from active", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    promote(db, a.id);
    expect(get(db, a.id)?.state).toBe("active");
    const updated = updateYaml(db, a.id, YAML_B);
    expect(updated.state).toBe("draft");
  });

  it("resets state to draft from disabled", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    promote(db, a.id);
    disable(db, a.id);
    const updated = updateYaml(db, a.id, YAML_B);
    expect(updated.state).toBe("draft");
  });

  it("leaves a draft as draft", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    const updated = updateYaml(db, a.id, YAML_B);
    expect(updated.state).toBe("draft");
  });

  it("rejects empty yaml", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    expect(() => updateYaml(db, a.id, "")).toThrow(ValidationError);
  });

  it("throws when automation does not exist", () => {
    expect(() => updateYaml(db, 9999, YAML_B)).toThrow(ValidationError);
  });
});

describe("automations state machine", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("promote moves draft → active", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    const promoted = promote(db, a.id);
    expect(promoted.state).toBe("active");
  });

  it("disable moves active → disabled", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    promote(db, a.id);
    const disabled = disable(db, a.id);
    expect(disabled.state).toBe("disabled");
  });

  it("enable moves disabled → active", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    promote(db, a.id);
    disable(db, a.id);
    const enabled = enable(db, a.id);
    expect(enabled.state).toBe("active");
  });

  it("full cycle: draft → active → disabled → active", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    expect(promote(db, a.id).state).toBe("active");
    expect(disable(db, a.id).state).toBe("disabled");
    expect(enable(db, a.id).state).toBe("active");
  });

  it("promote rejects an already-active automation", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    promote(db, a.id);
    expect(() => promote(db, a.id)).toThrow(ValidationError);
  });

  it("promote rejects a disabled automation (can't skip back to draft)", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    promote(db, a.id);
    disable(db, a.id);
    expect(() => promote(db, a.id)).toThrow(ValidationError);
  });

  it("disable rejects a draft (can't disable what was never live)", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    expect(() => disable(db, a.id)).toThrow(ValidationError);
  });

  it("disable rejects an already-disabled automation", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    promote(db, a.id);
    disable(db, a.id);
    expect(() => disable(db, a.id)).toThrow(ValidationError);
  });

  it("enable rejects a draft", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    expect(() => enable(db, a.id)).toThrow(ValidationError);
  });

  it("enable rejects an already-active automation", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    promote(db, a.id);
    expect(() => enable(db, a.id)).toThrow(ValidationError);
  });

  it("promote/disable/enable all throw on missing id", () => {
    expect(() => promote(db, 9999)).toThrow(ValidationError);
    expect(() => disable(db, 9999)).toThrow(ValidationError);
    expect(() => enable(db, 9999)).toThrow(ValidationError);
  });
});

describe("automations.recordRun", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("increments run_count and sets last_triggered_at", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    expect(a.run_count).toBe(0);
    expect(a.last_triggered_at).toBeNull();

    const after = recordRun(db, a.id);
    expect(after.run_count).toBe(1);
    expect(after.last_triggered_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("accumulates across multiple calls", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    recordRun(db, a.id);
    recordRun(db, a.id);
    const after = recordRun(db, a.id);
    expect(after.run_count).toBe(3);
  });

  it("does not change state", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    promote(db, a.id);
    const after = recordRun(db, a.id);
    expect(after.state).toBe("active");
  });

  it("throws when automation does not exist", () => {
    expect(() => recordRun(db, 9999)).toThrow(ValidationError);
  });
});

describe("automations.delete", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("removes the automation", () => {
    const a = create(db, { name: "X", source_yaml: YAML_A, generation_method: "manual" });
    deleteAutomation(db, a.id);
    expect(get(db, a.id)).toBeUndefined();
  });

  it("is a no-op for an unknown id", () => {
    expect(() => deleteAutomation(db, 9999)).not.toThrow();
  });
});

describe("automations and location FK behaviour", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("sets primary_location_id to NULL when the location is deleted", () => {
    const loc = createLocation(db, { name: "Kitchen" });
    const a = create(db, {
      name: "X",
      source_yaml: YAML_A,
      generation_method: "manual",
      primary_location_id: loc.id,
    });
    db.prepare("DELETE FROM locations WHERE id = ?").run(loc.id);
    expect(get(db, a.id)?.primary_location_id).toBeNull();
  });
});
