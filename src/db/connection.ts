import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

export const DEFAULT_DB_PATH = "./data/zighub.db";

export interface GetDbOptions {
  path?: string;
}

export function resolveDbPath(explicit?: string): string {
  return explicit ?? process.env["ZIGHUB_DB_PATH"] ?? DEFAULT_DB_PATH;
}

export function getDb(options: GetDbOptions = {}): Database.Database {
  const path = resolveDbPath(options.path);
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  return db;
}
