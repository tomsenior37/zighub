import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

export const DEFAULT_MIGRATIONS_DIR: string = join(
  dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

export interface MigrateResult {
  applied: string[];
  skipped: string[];
}

interface MigrationFile {
  name: string;
  sql: string;
}

function readMigrationFiles(dir: string): MigrationFile[] {
  const names = readdirSync(dir)
    .filter((n) => n.endsWith(".sql"))
    .sort();
  return names.map((name) => ({
    name,
    sql: readFileSync(join(dir, name), "utf8"),
  }));
}

function migrationsTableExists(db: Database.Database): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_migrations'")
    .get();
  return row !== undefined;
}

function listApplied(db: Database.Database): string[] {
  const rows = db.prepare("SELECT name FROM _migrations ORDER BY id ASC").all() as Array<{
    name: string;
  }>;
  return rows.map((r) => r.name);
}

export function migrate(
  db: Database.Database,
  dir: string = DEFAULT_MIGRATIONS_DIR,
): MigrateResult {
  const files = readMigrationFiles(dir);
  const applied = migrationsTableExists(db) ? listApplied(db) : [];
  const appliedSet = new Set(applied);
  const lastApplied = applied[applied.length - 1];

  const pending = files.filter((f) => !appliedSet.has(f.name));

  for (const file of pending) {
    if (lastApplied !== undefined && file.name <= lastApplied) {
      throw new Error(
        `out-of-order migration: ${file.name} sorts before last applied ${lastApplied}`,
      );
    }
  }

  const newlyApplied: string[] = [];
  for (const file of pending) {
    const apply = db.transaction(() => {
      db.exec(file.sql);
      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file.name);
    });
    apply();
    newlyApplied.push(file.name);
  }

  return {
    applied: newlyApplied,
    skipped: applied,
  };
}
