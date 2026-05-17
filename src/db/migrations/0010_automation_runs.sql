CREATE TABLE automation_runs (
  id INTEGER PRIMARY KEY,
  automation_id INTEGER NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  duration_ms INTEGER NOT NULL,
  ok INTEGER NOT NULL CHECK(ok IN (0, 1)),
  error TEXT NULL,
  trigger_summary TEXT NOT NULL
);

CREATE INDEX automation_runs_automation_id_started_at
  ON automation_runs(automation_id, started_at DESC);
