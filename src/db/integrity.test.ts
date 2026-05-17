import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeSync, mkdtempSync, openSync, rmSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { migrate } from "./migrate.js";
import { runIntegrityCheck } from "./integrity.js";

function freshMigratedDb(path: string): Database.Database {
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

describe("runIntegrityCheck", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "zighub-integrity-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns ok:true on an empty in-memory DB", () => {
    const db = new Database(":memory:");
    try {
      expect(runIntegrityCheck(db)).toEqual({ ok: true });
    } finally {
      db.close();
    }
  });

  it("returns ok:true on a freshly migrated DB", () => {
    const db = freshMigratedDb(join(tmpDir, "ok.db"));
    try {
      expect(runIntegrityCheck(db)).toEqual({ ok: true });
    } finally {
      db.close();
    }
  });

  it("returns ok:true on a populated DB with valid foreign keys", () => {
    const db = freshMigratedDb(join(tmpDir, "populated.db"));
    try {
      const locId = (
        db.prepare("INSERT INTO locations (name) VALUES ('Living Room') RETURNING id").get() as {
          id: number;
        }
      ).id;
      db.prepare(
        `INSERT INTO devices (z2m_id, friendly_name, location_id, role)
         VALUES (?, ?, ?, 'output')`,
      ).run("0x00124b001234abcd", "lamp", locId);

      expect(runIntegrityCheck(db)).toEqual({ ok: true });
    } finally {
      db.close();
    }
  });

  it("detects corruption when bytes 100-200 of the file are overwritten with garbage", () => {
    const path = join(tmpDir, "corrupt.db");
    const setup = freshMigratedDb(path);
    setup.exec(
      `INSERT INTO locations (name) VALUES ('A'), ('B'), ('C');
       INSERT INTO devices (z2m_id, friendly_name, role) VALUES
         ('0x1', 'd1', 'output'),
         ('0x2', 'd2', 'output'),
         ('0x3', 'd3', 'output');`,
    );
    setup.close();

    const fd = openSync(path, "r+");
    try {
      const garbage = Buffer.alloc(100, 0xff);
      writeSync(fd, garbage, 0, 100, 100);
    } finally {
      closeSync(fd);
    }

    const reopened = new Database(path);
    try {
      const result = runIntegrityCheck(reopened);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    } finally {
      reopened.close();
    }
  });

  it("detects foreign-key violations introduced with FKs disabled", () => {
    const db = new Database(":memory:");
    try {
      db.pragma("foreign_keys = OFF");
      migrate(db);
      db.prepare(
        `INSERT INTO devices (z2m_id, friendly_name, location_id, role)
         VALUES (?, ?, ?, 'output')`,
      ).run("0xorphan", "orphan-lamp", 9999);
      db.pragma("foreign_keys = ON");

      const result = runIntegrityCheck(db);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("foreign_key_check"))).toBe(true);
        expect(result.errors.some((e) => e.includes("devices"))).toBe(true);
      }
    } finally {
      db.close();
    }
  });

  it("does not throw when the database is closed — returns errors instead", () => {
    const db = new Database(":memory:");
    db.close();
    const result = runIntegrityCheck(db);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});
