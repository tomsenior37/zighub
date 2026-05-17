import type Database from "better-sqlite3";

export interface AutomationRun {
  id: number;
  automation_id: number;
  started_at: string;
  duration_ms: number;
  ok: boolean;
  error: string | null;
  trigger_summary: Record<string, unknown>;
}

export interface RecordRunInput {
  automation_id: number;
  duration_ms: number;
  ok: boolean;
  error?: string | null;
  trigger_summary: Record<string, unknown>;
}

interface AutomationRunRow {
  id: number;
  automation_id: number;
  started_at: string;
  duration_ms: number;
  ok: number;
  error: string | null;
  trigger_summary: string;
}

function rowToRun(row: AutomationRunRow): AutomationRun {
  let parsed: Record<string, unknown> = {};
  try {
    const obj = JSON.parse(row.trigger_summary) as unknown;
    if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
      parsed = obj as Record<string, unknown>;
    }
  } catch {
    /* leave parsed empty */
  }
  return {
    id: row.id,
    automation_id: row.automation_id,
    started_at: row.started_at,
    duration_ms: row.duration_ms,
    ok: row.ok === 1,
    error: row.error,
    trigger_summary: parsed,
  };
}

export function record(db: Database.Database, input: RecordRunInput): AutomationRun {
  const transaction = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO automation_runs (automation_id, duration_ms, ok, error, trigger_summary)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        input.automation_id,
        input.duration_ms,
        input.ok ? 1 : 0,
        input.error ?? null,
        JSON.stringify(input.trigger_summary),
      );
    db.prepare(
      `UPDATE automations
       SET run_count = run_count + 1, last_triggered_at = datetime('now')
       WHERE id = ?`,
    ).run(input.automation_id);
    return Number(info.lastInsertRowid);
  });

  const id = transaction();
  const row = db
    .prepare(
      "SELECT id, automation_id, started_at, duration_ms, ok, error, trigger_summary FROM automation_runs WHERE id = ?",
    )
    .get(id) as AutomationRunRow | undefined;
  if (!row) throw new Error("failed to load run after insert");
  return rowToRun(row);
}

export function list(db: Database.Database, automationId: number, limit = 20): AutomationRun[] {
  const rows = db
    .prepare(
      `SELECT id, automation_id, started_at, duration_ms, ok, error, trigger_summary
       FROM automation_runs WHERE automation_id = ?
       ORDER BY started_at DESC, id DESC
       LIMIT ?`,
    )
    .all(automationId, limit) as AutomationRunRow[];
  return rows.map(rowToRun);
}
