import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "../db/migrate.js";
import { type AuditEntry, list, log, purgeOlderThan } from "./auditLog.js";

function firstEntry(entries: AuditEntry[]): AuditEntry {
  const entry = entries[0];
  if (!entry) throw new Error("expected at least one audit entry");
  return entry;
}

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

describe("auditLog.log", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("writes a row with category, event, and default empty details", () => {
    log(db, { category: "backup", event: "backup-created" });
    const entries = list(db);
    expect(entries).toHaveLength(1);
    const entry = firstEntry(entries);
    expect(entry.category).toBe("backup");
    expect(entry.event).toBe("backup-created");
    expect(entry.details).toEqual({});
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(entry.id).toBeGreaterThan(0);
  });

  it("round-trips a structured details object as JSON", () => {
    log(db, {
      category: "cloud",
      event: "upload-failed",
      details: {
        provider: "drive",
        filename: "zighub-2026-05-17.zbk",
        attempt: 3,
        retryable: true,
      },
    });
    expect(firstEntry(list(db)).details).toEqual({
      provider: "drive",
      filename: "zighub-2026-05-17.zbk",
      attempt: 3,
      retryable: true,
    });
  });

  it("round-trips nested objects and arrays in details", () => {
    log(db, {
      category: "automation",
      event: "fired",
      details: {
        automation_id: 42,
        actions: [
          { device: "lamp-1", state: "on" },
          { device: "lamp-2", state: "off" },
        ],
        meta: { source: "scheduler", attempts: 1 },
      },
    });
    expect(firstEntry(list(db)).details).toEqual({
      automation_id: 42,
      actions: [
        { device: "lamp-1", state: "on" },
        { device: "lamp-2", state: "off" },
      ],
      meta: { source: "scheduler", attempts: 1 },
    });
  });

  it("accepts an empty details object explicitly", () => {
    log(db, { category: "db", event: "integrity-check-pass", details: {} });
    expect(firstEntry(list(db)).details).toEqual({});
  });
});

describe("auditLog.log error-swallowing guarantee", () => {
  let consoleSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("does not throw when the database is closed", () => {
    const db = freshDb();
    db.close();
    expect(() => log(db, { category: "backup", event: "backup-created" })).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("does not throw when details contains a circular reference", () => {
    const db = freshDb();
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(() => log(db, { category: "x", event: "y", details: circular })).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    expect(list(db)).toEqual([]);
  });
});

describe("auditLog.list", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns an empty array when no entries exist", () => {
    expect(list(db)).toEqual([]);
  });

  it("orders newest first by timestamp then id", () => {
    log(db, { category: "x", event: "first" });
    log(db, { category: "x", event: "second" });
    log(db, { category: "x", event: "third" });
    const entries = list(db);
    expect(entries.map((e) => e.event)).toEqual(["third", "second", "first"]);
  });

  it("filters by category", () => {
    log(db, { category: "backup", event: "backup-created" });
    log(db, { category: "cloud", event: "upload-ok" });
    log(db, { category: "backup", event: "backup-deleted" });

    const backups = list(db, { category: "backup" });
    expect(backups).toHaveLength(2);
    expect(backups.every((e) => e.category === "backup")).toBe(true);
  });

  it("filters by since (inclusive lower bound)", () => {
    db.prepare("INSERT INTO audit_log (timestamp, category, event) VALUES (?, ?, ?)").run(
      "2020-01-01 00:00:00",
      "old",
      "ancient",
    );
    db.prepare("INSERT INTO audit_log (timestamp, category, event) VALUES (?, ?, ?)").run(
      "2026-01-01 00:00:00",
      "recent",
      "newish",
    );
    db.prepare("INSERT INTO audit_log (timestamp, category, event) VALUES (?, ?, ?)").run(
      "2026-06-01 00:00:00",
      "recent",
      "newer",
    );

    const since2025 = list(db, { since: "2025-01-01 00:00:00" });
    expect(since2025.map((e) => e.event)).toEqual(["newer", "newish"]);
  });

  it("applies a default limit of 100", () => {
    const stmt = db.prepare("INSERT INTO audit_log (category, event) VALUES (?, ?)");
    for (let i = 0; i < 150; i++) {
      stmt.run("x", `e${i}`);
    }
    expect(list(db)).toHaveLength(100);
  });

  it("honours a custom limit", () => {
    log(db, { category: "x", event: "a" });
    log(db, { category: "x", event: "b" });
    log(db, { category: "x", event: "c" });
    expect(list(db, { limit: 2 })).toHaveLength(2);
  });

  it("combines category, since, and limit filters", () => {
    db.prepare("INSERT INTO audit_log (timestamp, category, event) VALUES (?, ?, ?)").run(
      "2020-01-01 00:00:00",
      "backup",
      "old-backup",
    );
    db.prepare("INSERT INTO audit_log (timestamp, category, event) VALUES (?, ?, ?)").run(
      "2026-06-01 00:00:00",
      "backup",
      "new-backup",
    );
    db.prepare("INSERT INTO audit_log (timestamp, category, event) VALUES (?, ?, ?)").run(
      "2026-06-02 00:00:00",
      "cloud",
      "new-cloud",
    );

    const rows = list(db, { category: "backup", since: "2025-01-01 00:00:00", limit: 5 });
    expect(rows.map((e) => e.event)).toEqual(["new-backup"]);
  });

  it("returns details as a parsed object even if column was corrupted", () => {
    db.prepare("INSERT INTO audit_log (category, event, details) VALUES (?, ?, ?)").run(
      "x",
      "y",
      "not json{",
    );
    expect(firstEntry(list(db)).details).toEqual({});
  });
});

describe("auditLog.purgeOlderThan", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("deletes rows older than N days and returns the count", () => {
    db.prepare("INSERT INTO audit_log (timestamp, category, event) VALUES (?, ?, ?)").run(
      "2020-01-01 00:00:00",
      "x",
      "old-1",
    );
    db.prepare("INSERT INTO audit_log (timestamp, category, event) VALUES (?, ?, ?)").run(
      "2020-06-01 00:00:00",
      "x",
      "old-2",
    );
    log(db, { category: "x", event: "fresh" });

    const deleted = purgeOlderThan(db, 30);
    expect(deleted).toBe(2);

    const remaining = list(db);
    expect(remaining.map((e) => e.event)).toEqual(["fresh"]);
  });

  it("returns 0 when nothing is old enough", () => {
    log(db, { category: "x", event: "fresh" });
    expect(purgeOlderThan(db, 30)).toBe(0);
    expect(list(db)).toHaveLength(1);
  });

  it("is a no-op on an empty table", () => {
    expect(purgeOlderThan(db, 0)).toBe(0);
  });
});
