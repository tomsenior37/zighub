# P4-11 — Automation run history + counters

## Goal
Track each automation execution: timestamp, automation id, trigger event summary, whether all actions succeeded, and any error. Update the existing `last_triggered_at` and `run_count` columns on the `automations` table.

## Acceptance criteria
- New migration `0010_automation_runs.sql`:
  ```sql
  CREATE TABLE automation_runs (
    id INTEGER PRIMARY KEY,
    automation_id INTEGER NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    duration_ms INTEGER NOT NULL,
    ok INTEGER NOT NULL,           -- 0/1
    error TEXT NULL,
    trigger_summary TEXT NOT NULL  -- short JSON, e.g. {"type":"deviceMessage","ieeeAddress":"aa:bb"}
  );
  CREATE INDEX automation_runs_automation_id_started_at
    ON automation_runs(automation_id, started_at DESC);
  ```
- `src/domain/automationRuns.ts`:
  - `record(db, {automation_id, duration_ms, ok, error?, trigger_summary})` inserts a row AND atomically updates `automations.run_count += 1` and `automations.last_triggered_at = now()`.
  - `list(db, automation_id, limit=20)` returns the most recent runs.
- The runner from p4-09 calls `record()` for every execution. Capture start time, execute actions, record the elapsed.
- `GET /api/automations/:id/runs` returns the recent runs.
- Tests:
  - Successful run inserts a row, increments run_count, updates last_triggered_at.
  - Failed run captures the error message.
  - list() returns rows in DESC order with the limit applied.

## Notes
- We don't trim history yet; retention is a follow-up. At ~1 run/min/automation this is fine for months.
- `trigger_summary` is JSON-encoded but small (just type + ieeeAddress for now) — keep it slim so the table doesn't bloat.
