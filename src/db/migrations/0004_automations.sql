CREATE TABLE automations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  primary_location_id INTEGER NULL REFERENCES locations(id) ON DELETE SET NULL,
  source_yaml TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('draft', 'active', 'disabled')) DEFAULT 'draft',
  generation_method TEXT NOT NULL CHECK(generation_method IN ('manual', 'visual', 'llm')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_triggered_at TEXT NULL,
  run_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX automations_state ON automations(state);
