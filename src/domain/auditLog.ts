import type Database from "better-sqlite3";

export interface AuditEntry {
  id: number;
  timestamp: string;
  category: string;
  event: string;
  details: Record<string, unknown>;
}

export interface LogInput {
  category: string;
  event: string;
  details?: Record<string, unknown>;
}

export interface ListAuditOptions {
  category?: string;
  since?: string;
  limit?: number;
}

interface AuditRow {
  id: number;
  timestamp: string;
  category: string;
  event: string;
  details: string;
}

const DEFAULT_LIMIT = 100;
const COLUMNS = "id, timestamp, category, event, details";

function parseDetails(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function rowToEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    category: row.category,
    event: row.event,
    details: parseDetails(row.details),
  };
}

// Never throws. Audit logging must not be able to break the flow that called it
// — a failed log is logged to stderr and the caller continues.
export function log(db: Database.Database, input: LogInput): void {
  try {
    const detailsJson = input.details === undefined ? "{}" : JSON.stringify(input.details);
    db.prepare("INSERT INTO audit_log (category, event, details) VALUES (?, ?, ?)").run(
      input.category,
      input.event,
      detailsJson,
    );
  } catch (err) {
    console.error("[auditLog] failed to write audit entry:", err);
  }
}

export function list(db: Database.Database, options: ListAuditOptions = {}): AuditEntry[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (options.category !== undefined) {
    clauses.push("category = ?");
    params.push(options.category);
  }
  if (options.since !== undefined) {
    clauses.push("timestamp >= ?");
    params.push(options.since);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = options.limit ?? DEFAULT_LIMIT;
  const rows = db
    .prepare(`SELECT ${COLUMNS} FROM audit_log ${where} ORDER BY timestamp DESC, id DESC LIMIT ?`)
    .all(...params, limit) as AuditRow[];
  return rows.map(rowToEntry);
}

export function purgeOlderThan(db: Database.Database, days: number): number {
  const info = db
    .prepare("DELETE FROM audit_log WHERE timestamp < datetime('now', ?)")
    .run(`-${days} days`);
  return Number(info.changes);
}
