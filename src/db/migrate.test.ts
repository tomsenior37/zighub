import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { migrate } from "./migrate.js";

function freshInMemoryDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  return db;
}

describe("migrate (bundled migrations)", () => {
  it("applies every bundled migration on a fresh DB", () => {
    const db = freshInMemoryDb();
    try {
      const result = migrate(db);
      expect(result.applied.length).toBeGreaterThan(0);
      expect(result.applied[0]).toBe("0001_init.sql");
      expect(result.skipped).toHaveLength(0);
      const rows = db.prepare("SELECT name FROM _migrations ORDER BY name").all() as {
        name: string;
      }[];
      expect(rows.map((r) => r.name)).toEqual(result.applied);
    } finally {
      db.close();
    }
  });

  it("is a no-op when every migration has already been applied", () => {
    const db = freshInMemoryDb();
    try {
      const first = migrate(db);
      const second = migrate(db);
      expect(second.applied).toHaveLength(0);
      expect(second.skipped).toEqual(first.applied);
    } finally {
      db.close();
    }
  });
});

describe("migrate (custom directory)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "zighub-migrations-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const initTableSql = `
    CREATE TABLE _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `;

  it("applies multiple migrations in lexical order", () => {
    writeFileSync(join(tmpDir, "0001_init.sql"), initTableSql);
    writeFileSync(join(tmpDir, "0002_a.sql"), "CREATE TABLE a(id INTEGER);");
    writeFileSync(join(tmpDir, "0003_b.sql"), "CREATE TABLE b(id INTEGER);");

    const db = freshInMemoryDb();
    try {
      const result = migrate(db, tmpDir);
      expect(result.applied).toEqual(["0001_init.sql", "0002_a.sql", "0003_b.sql"]);
    } finally {
      db.close();
    }
  });

  it("refuses to apply a new migration whose name sorts before an already-applied one", () => {
    writeFileSync(join(tmpDir, "0002_foo.sql"), `${initTableSql}\nCREATE TABLE foo(id INTEGER);`);
    const db = freshInMemoryDb();
    try {
      const first = migrate(db, tmpDir);
      expect(first.applied).toEqual(["0002_foo.sql"]);

      writeFileSync(join(tmpDir, "0001_earlier.sql"), "CREATE TABLE bar(id INTEGER);");

      expect(() => migrate(db, tmpDir)).toThrow(/out-of-order/i);
    } finally {
      db.close();
    }
  });

  it("rolls back when a migration errors mid-flight", () => {
    writeFileSync(
      join(tmpDir, "0001_bad.sql"),
      `${initTableSql}\nCREATE TABLE good(id INTEGER);\nSELECT no_such_function();`,
    );
    const db = freshInMemoryDb();
    try {
      expect(() => migrate(db, tmpDir)).toThrow();
      const goodTable = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='good'")
        .get();
      expect(goodTable).toBeUndefined();
      const migrationsTable = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'")
        .get();
      expect(migrationsTable).toBeUndefined();
    } finally {
      db.close();
    }
  });
});
