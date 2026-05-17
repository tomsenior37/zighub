import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDb } from "./connection.js";

describe("getDb", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "zighub-conn-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("opens a database file at the supplied path", () => {
    const path = join(tmpDir, "test.db");
    const db = getDb({ path });
    try {
      expect(db.open).toBe(true);
      expect(existsSync(path)).toBe(true);
    } finally {
      db.close();
    }
  });

  it("creates parent directories that do not yet exist", () => {
    const path = join(tmpDir, "nested", "deep", "test.db");
    const db = getDb({ path });
    try {
      expect(existsSync(path)).toBe(true);
    } finally {
      db.close();
    }
  });

  it("enables WAL journal mode", () => {
    const db = getDb({ path: join(tmpDir, "wal.db") });
    try {
      const mode = db.pragma("journal_mode", { simple: true }) as string;
      expect(mode.toLowerCase()).toBe("wal");
    } finally {
      db.close();
    }
  });

  it("enables foreign key enforcement", () => {
    const db = getDb({ path: join(tmpDir, "fk.db") });
    try {
      const fk = db.pragma("foreign_keys", { simple: true }) as number;
      expect(fk).toBe(1);
    } finally {
      db.close();
    }
  });

  it("sets synchronous to NORMAL", () => {
    const db = getDb({ path: join(tmpDir, "sync.db") });
    try {
      // 0=OFF, 1=NORMAL, 2=FULL, 3=EXTRA
      const sync = db.pragma("synchronous", { simple: true }) as number;
      expect(sync).toBe(1);
    } finally {
      db.close();
    }
  });

  it("falls back to ZIGHUB_DB_PATH when no path is supplied", () => {
    const path = join(tmpDir, "from-env.db");
    const prev = process.env["ZIGHUB_DB_PATH"];
    process.env["ZIGHUB_DB_PATH"] = path;
    try {
      const db = getDb();
      try {
        expect(existsSync(path)).toBe(true);
      } finally {
        db.close();
      }
    } finally {
      if (prev === undefined) {
        delete process.env["ZIGHUB_DB_PATH"];
      } else {
        process.env["ZIGHUB_DB_PATH"] = prev;
      }
    }
  });
});
