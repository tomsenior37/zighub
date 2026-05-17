import type Database from "better-sqlite3";

export type IntegrityResult = { ok: true } | { ok: false; errors: string[] };

interface IntegrityCheckRow {
  integrity_check: string;
}

interface ForeignKeyCheckRow {
  table: string;
  rowid: number | null;
  parent: string;
  fkid: number;
}

// Runs PRAGMA integrity_check and PRAGMA foreign_key_check. Never throws —
// any error from the underlying SQLite call is captured into the errors
// array so the caller (startup path) can decide what to do with it.
export function runIntegrityCheck(db: Database.Database): IntegrityResult {
  const errors: string[] = [];

  try {
    const rows = db.pragma("integrity_check") as IntegrityCheckRow[];
    for (const row of rows) {
      if (row.integrity_check !== "ok") {
        errors.push(`integrity_check: ${row.integrity_check}`);
      }
    }
  } catch (err) {
    errors.push(`integrity_check failed to run: ${formatError(err)}`);
  }

  try {
    const rows = db.pragma("foreign_key_check") as ForeignKeyCheckRow[];
    for (const row of rows) {
      errors.push(
        `foreign_key_check: table=${row.table} rowid=${String(row.rowid)} parent=${row.parent} fkid=${String(row.fkid)}`,
      );
    }
  } catch (err) {
    errors.push(`foreign_key_check failed to run: ${formatError(err)}`);
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
