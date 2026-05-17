import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { migrate } from "./migrate.js";
import { snapshot } from "./snapshot.js";

function freshMigratedDb(path: string): Database.Database {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

describe("snapshot", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "zighub-snapshot-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes a valid SQLite file to destPath", async () => {
    const srcPath = join(tmpDir, "src.db");
    const destPath = join(tmpDir, "snap.db");
    const db = freshMigratedDb(srcPath);
    try {
      db.prepare("INSERT INTO locations (name) VALUES ('Kitchen')").run();

      const result = await snapshot(db, destPath);

      expect(result.bytes).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(existsSync(destPath)).toBe(true);
      expect(statSync(destPath).size).toBe(result.bytes);
    } finally {
      db.close();
    }
  });

  it("snapshot file has the same data as the source", async () => {
    const srcPath = join(tmpDir, "src.db");
    const destPath = join(tmpDir, "snap.db");
    const db = freshMigratedDb(srcPath);
    try {
      db.exec(`
        INSERT INTO locations (name) VALUES ('Kitchen'), ('Hallway');
        INSERT INTO devices (z2m_id, friendly_name, role) VALUES
          ('0xaa', 'lamp', 'output'),
          ('0xbb', 'button', 'input');
      `);

      await snapshot(db, destPath);

      const snap = new Database(destPath, { readonly: true });
      try {
        const locNames = (
          snap.prepare("SELECT name FROM locations ORDER BY name").all() as { name: string }[]
        ).map((r) => r.name);
        const devNames = (
          snap.prepare("SELECT friendly_name FROM devices ORDER BY friendly_name").all() as {
            friendly_name: string;
          }[]
        ).map((r) => r.friendly_name);
        expect(locNames).toEqual(["Hallway", "Kitchen"]);
        expect(devNames).toEqual(["button", "lamp"]);
      } finally {
        snap.close();
      }
    } finally {
      db.close();
    }
  });

  it("leaves no .tmp file after a successful snapshot", async () => {
    const srcPath = join(tmpDir, "src.db");
    const destPath = join(tmpDir, "snap.db");
    const db = freshMigratedDb(srcPath);
    try {
      await snapshot(db, destPath);
      expect(existsSync(`${destPath}.tmp`)).toBe(false);
      expect(existsSync(destPath)).toBe(true);
    } finally {
      db.close();
    }
  });

  it("overwrites an existing dest file atomically", async () => {
    const srcPath = join(tmpDir, "src.db");
    const destPath = join(tmpDir, "snap.db");
    const db = freshMigratedDb(srcPath);
    try {
      db.prepare("INSERT INTO locations (name) VALUES ('Round 1')").run();
      await snapshot(db, destPath);
      const firstSize = statSync(destPath).size;

      db.exec(`
        INSERT INTO locations (name) VALUES ('Round 2'), ('Round 3'), ('Round 4');
        INSERT INTO devices (z2m_id, friendly_name, role) VALUES
          ('0x1', 'd1', 'output'),
          ('0x2', 'd2', 'output'),
          ('0x3', 'd3', 'output'),
          ('0x4', 'd4', 'output'),
          ('0x5', 'd5', 'output');
      `);
      await snapshot(db, destPath);

      expect(statSync(destPath).size).toBeGreaterThanOrEqual(firstSize);
      expect(existsSync(`${destPath}.tmp`)).toBe(false);

      const snap = new Database(destPath, { readonly: true });
      try {
        const count = (snap.prepare("SELECT COUNT(*) AS c FROM locations").get() as { c: number })
          .c;
        expect(count).toBe(4);
      } finally {
        snap.close();
      }
    } finally {
      db.close();
    }
  });

  it("captures a consistent snapshot while writes are in flight", async () => {
    const srcPath = join(tmpDir, "src.db");
    const destPath = join(tmpDir, "snap.db");
    const db = freshMigratedDb(srcPath);
    try {
      // Seed a known starting row so we can prove the snapshot has *some* rows
      // and verify the schema is intact.
      db.prepare(
        "INSERT INTO audit_log (category, event, details) VALUES ('seed', 'before-loop', '{}')",
      ).run();

      const insert = db.prepare(
        "INSERT INTO audit_log (category, event, details) VALUES ('snapshot-test', ?, '{}')",
      );

      let stop = false;
      let inserted = 0;
      const writer = (async () => {
        while (!stop) {
          try {
            insert.run(`event-${String(inserted)}`);
            inserted++;
          } catch {
            // DB closed in afterEach if the snapshot threw — stop quietly.
            break;
          }
          // Yield to the event loop so the snapshot worker actually gets to run.
          await new Promise((r) => setImmediate(r));
        }
      })();

      let result: { bytes: number; durationMs: number };
      try {
        result = await snapshot(db, destPath);
      } finally {
        stop = true;
        await writer;
      }

      expect(result.bytes).toBeGreaterThan(0);
      // The snapshot must contain at least the seed row, and at most everything
      // that has been inserted so far. Anything outside that range means the
      // snapshot is not point-in-time consistent.
      const snap = new Database(destPath, { readonly: true });
      try {
        const total = (snap.prepare("SELECT COUNT(*) AS c FROM audit_log").get() as { c: number })
          .c;
        expect(total).toBeGreaterThanOrEqual(1);
        expect(total).toBeLessThanOrEqual(inserted + 1);
      } finally {
        snap.close();
      }
    } finally {
      db.close();
    }
  });

  it("produces a snapshot that passes PRAGMA foreign_key_check", async () => {
    const srcPath = join(tmpDir, "src.db");
    const destPath = join(tmpDir, "snap.db");
    const db = freshMigratedDb(srcPath);
    try {
      const locId = (
        db.prepare("INSERT INTO locations (name) VALUES ('Lounge') RETURNING id").get() as {
          id: number;
        }
      ).id;
      db.prepare(
        `INSERT INTO devices (z2m_id, friendly_name, location_id, role)
         VALUES (?, ?, ?, 'output')`,
      ).run("0xfeed", "fk-test-device", locId);

      await snapshot(db, destPath);

      const snap = new Database(destPath, { readonly: true });
      try {
        snap.pragma("foreign_keys = ON");
        const violations = snap.pragma("foreign_key_check");
        expect(violations).toEqual([]);
      } finally {
        snap.close();
      }
    } finally {
      db.close();
    }
  });

  it("throws a useful error and leaves no .tmp behind when destPath is unwritable", async () => {
    const srcPath = join(tmpDir, "src.db");
    const destPath = join(tmpDir, "no-such-dir", "snap.db");
    const db = freshMigratedDb(srcPath);
    try {
      await expect(snapshot(db, destPath)).rejects.toThrow();
      expect(existsSync(`${destPath}.tmp`)).toBe(false);
    } finally {
      db.close();
    }
  });
});
