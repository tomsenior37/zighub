import type Database from "better-sqlite3";
import { log as auditLog } from "./auditLog.js";

export const SETTINGS_KEYS = {
  COORDINATOR_PATH: "coordinator.path",
  FIRST_RUN_COMPLETE: "first_run.complete",
  NETWORK_INFO: "network.info",
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export interface SettingsEntry {
  key: string;
  value: unknown;
  updatedAt: number;
}

export class SettingsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "SettingsError";
    this.code = code;
  }
}

export interface SettingsRepo {
  get<T = unknown>(key: string): T | null;
  set<T = unknown>(key: string, value: T): void;
  delete(key: string): void;
  list(): SettingsEntry[];
}

interface SettingRow {
  key: string;
  value: string;
  updated_at: number;
}

export function createSettingsRepo(db: Database.Database): SettingsRepo {
  const getStmt = db.prepare<[string]>("SELECT key, value, updated_at FROM settings WHERE key = ?");
  const upsertStmt = db.prepare<[string, string, number]>(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  );
  const deleteStmt = db.prepare<[string]>("DELETE FROM settings WHERE key = ?");
  const listStmt = db.prepare("SELECT key, value, updated_at FROM settings ORDER BY key ASC");

  function parseValue(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new SettingsError(
        "MALFORMED_JSON",
        `value for setting is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return {
    get<T>(key: string): T | null {
      const row = getStmt.get(key) as SettingRow | undefined;
      if (!row) return null;
      return parseValue(row.value) as T;
    },

    set<T>(key: string, value: T): void {
      const json = JSON.stringify(value);
      upsertStmt.run(key, json, Date.now());
      auditLog(db, { category: "settings", event: "set", details: { key } });
    },

    delete(key: string): void {
      const info = deleteStmt.run(key);
      if (info.changes > 0) {
        auditLog(db, { category: "settings", event: "delete", details: { key } });
      }
    },

    list(): SettingsEntry[] {
      const rows = listStmt.all() as SettingRow[];
      return rows.map((row) => ({
        key: row.key,
        value: parseValue(row.value),
        updatedAt: row.updated_at,
      }));
    },
  };
}
