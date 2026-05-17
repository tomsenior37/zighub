CREATE TABLE cloud_providers (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('drive', 'dropbox', 'rclone')),
  display_name TEXT NOT NULL,
  connected_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_successful_backup_at TEXT NULL,
  last_error TEXT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  UNIQUE(type, display_name)
);
