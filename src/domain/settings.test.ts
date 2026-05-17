import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "../db/migrate.js";
import { SETTINGS_KEYS, SettingsError, createSettingsRepo } from "./settings.js";
import { list as listAudit } from "./auditLog.js";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  migrate(db);
});

afterEach(() => {
  db.close();
});

describe("settings repo round-trips", () => {
  it("returns null for unknown keys", () => {
    const repo = createSettingsRepo(db);
    expect(repo.get("does.not.exist")).toBeNull();
  });

  it("round-trips primitives, objects, and arrays", () => {
    const repo = createSettingsRepo(db);

    repo.set("a.string", "hello");
    repo.set("a.number", 42);
    repo.set("a.bool", true);
    repo.set("an.object", { nested: { count: 3 } });
    repo.set("an.array", [1, 2, 3]);

    expect(repo.get<string>("a.string")).toBe("hello");
    expect(repo.get<number>("a.number")).toBe(42);
    expect(repo.get<boolean>("a.bool")).toBe(true);
    expect(repo.get<{ nested: { count: number } }>("an.object")).toEqual({ nested: { count: 3 } });
    expect(repo.get<number[]>("an.array")).toEqual([1, 2, 3]);
  });

  it("overwrites existing keys (upsert)", () => {
    const repo = createSettingsRepo(db);
    repo.set("k", { v: 1 });
    repo.set("k", { v: 2 });
    expect(repo.get<{ v: number }>("k")).toEqual({ v: 2 });
  });

  it("uses the reserved SETTINGS_KEYS constants for the coordinator path", () => {
    const repo = createSettingsRepo(db);
    repo.set(SETTINGS_KEYS.COORDINATOR_PATH, "/dev/ttyUSB0");
    expect(repo.get(SETTINGS_KEYS.COORDINATOR_PATH)).toBe("/dev/ttyUSB0");
  });
});

describe("settings repo delete", () => {
  it("removes the row and is silent for missing keys", () => {
    const repo = createSettingsRepo(db);
    repo.set("k", "v");
    repo.delete("k");
    expect(repo.get("k")).toBeNull();

    expect(() => repo.delete("never.existed")).not.toThrow();
  });

  it("audit-logs successful deletes only", () => {
    const repo = createSettingsRepo(db);
    repo.set("k", "v");
    repo.delete("k");
    repo.delete("nonexistent");

    const settingsAudit = listAudit(db, { category: "settings" });
    const deleteEvents = settingsAudit.filter((e) => e.event === "delete");
    expect(deleteEvents).toHaveLength(1);
    expect(deleteEvents[0]?.details).toEqual({ key: "k" });
  });
});

describe("settings repo list", () => {
  it("returns rows in key-ascending order with parsed values", () => {
    const repo = createSettingsRepo(db);
    repo.set("z", 1);
    repo.set("a", "hello");
    repo.set("m", { x: 2 });

    const rows = repo.list();
    expect(rows.map((r) => r.key)).toEqual(["a", "m", "z"]);
    expect(rows[0]?.value).toBe("hello");
    expect(rows[1]?.value).toEqual({ x: 2 });
  });

  it("returns an empty array on an empty table", () => {
    const repo = createSettingsRepo(db);
    expect(repo.list()).toEqual([]);
  });
});

describe("settings repo malformed JSON", () => {
  it("throws SettingsError when stored JSON is malformed", () => {
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)").run(
      "broken",
      "{ not json",
      Date.now(),
    );
    const repo = createSettingsRepo(db);
    expect(() => repo.get("broken")).toThrow(SettingsError);
    expect(() => repo.get("broken")).toThrow(/MALFORMED_JSON|not valid JSON/);
  });
});

describe("settings audit", () => {
  it("records a 'set' audit entry on every write", () => {
    const repo = createSettingsRepo(db);
    repo.set("a", 1);
    repo.set("b", 2);
    const settingsAudit = listAudit(db, { category: "settings" });
    expect(settingsAudit.filter((e) => e.event === "set")).toHaveLength(2);
  });
});
