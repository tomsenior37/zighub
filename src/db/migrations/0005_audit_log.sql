CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  category TEXT NOT NULL,
  event TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX audit_log_category_timestamp ON audit_log(category, timestamp DESC);
