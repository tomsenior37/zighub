import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "../db/migrate.js";
import { create, deleteLocation, get, list, update, ValidationError } from "./locations.js";

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

describe("locations.create", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("inserts a root location and returns it with an id", () => {
    const loc = create(db, { name: "House" });
    expect(loc.id).toBeTypeOf("number");
    expect(loc.name).toBe("House");
    expect(loc.parent_id).toBeNull();
    expect(loc.created_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("inserts a child location with parent_id", () => {
    const parent = create(db, { name: "House" });
    const child = create(db, { name: "Kitchen", parent_id: parent.id });
    expect(child.parent_id).toBe(parent.id);
  });

  it("allows two locations with the same name under different parents", () => {
    const a = create(db, { name: "Wing A" });
    const b = create(db, { name: "Wing B" });
    const ka = create(db, { name: "Kitchen", parent_id: a.id });
    const kb = create(db, { name: "Kitchen", parent_id: b.id });
    expect(ka.id).not.toBe(kb.id);
  });

  it("rejects siblings with duplicate names", () => {
    const parent = create(db, { name: "House" });
    create(db, { name: "Kitchen", parent_id: parent.id });
    expect(() => create(db, { name: "Kitchen", parent_id: parent.id })).toThrow();
  });

  it("rejects duplicate names at root level", () => {
    create(db, { name: "House" });
    expect(() => create(db, { name: "House" })).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => create(db, { name: "" })).toThrow(ValidationError);
  });

  it("rejects whitespace-only name", () => {
    expect(() => create(db, { name: "   " })).toThrow(ValidationError);
  });

  it("rejects parent_id pointing at a missing location", () => {
    expect(() => create(db, { name: "Orphan", parent_id: 9999 })).toThrow();
  });
});

describe("locations.list", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns an empty array on an empty table", () => {
    expect(list(db)).toEqual([]);
  });

  it("returns locations sorted alphabetically by name", () => {
    create(db, { name: "Cellar" });
    create(db, { name: "Attic" });
    create(db, { name: "Bedroom" });
    const rows = list(db);
    expect(rows.map((r) => r.name)).toEqual(["Attic", "Bedroom", "Cellar"]);
  });
});

describe("locations.get", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns the location when it exists", () => {
    const created = create(db, { name: "Garage" });
    const fetched = get(db, created.id);
    expect(fetched).toEqual(created);
  });

  it("returns undefined for a missing id", () => {
    expect(get(db, 12345)).toBeUndefined();
  });
});

describe("locations.update", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("renames a location", () => {
    const loc = create(db, { name: "Old" });
    const updated = update(db, loc.id, { name: "New" });
    expect(updated.name).toBe("New");
    expect(get(db, loc.id)?.name).toBe("New");
  });

  it("rejects empty name on update", () => {
    const loc = create(db, { name: "Old" });
    expect(() => update(db, loc.id, { name: "" })).toThrow(ValidationError);
  });

  it("rejects rename collision with a sibling", () => {
    const parent = create(db, { name: "House" });
    create(db, { name: "Kitchen", parent_id: parent.id });
    const lounge = create(db, { name: "Lounge", parent_id: parent.id });
    expect(() => update(db, lounge.id, { name: "Kitchen" })).toThrow();
  });

  it("throws when the location does not exist", () => {
    expect(() => update(db, 9999, { name: "x" })).toThrow();
  });
});

describe("locations.delete", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("removes the location", () => {
    const loc = create(db, { name: "Temp" });
    deleteLocation(db, loc.id);
    expect(get(db, loc.id)).toBeUndefined();
  });

  it("sets children's parent_id to NULL rather than cascading", () => {
    const parent = create(db, { name: "House" });
    const child = create(db, { name: "Kitchen", parent_id: parent.id });
    deleteLocation(db, parent.id);
    const reloaded = get(db, child.id);
    expect(reloaded).toBeDefined();
    expect(reloaded?.parent_id).toBeNull();
  });

  it("is a no-op for a missing id", () => {
    expect(() => deleteLocation(db, 9999)).not.toThrow();
  });
});
