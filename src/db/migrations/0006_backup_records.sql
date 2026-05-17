CREATE TABLE backup_records (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  size_bytes INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('auto', 'scheduled', 'manual')),
  trigger_reason TEXT NULL,
  local_path TEXT NULL,
  cloud_uploads TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX backup_records_created_at ON backup_records(created_at DESC);
