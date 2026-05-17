CREATE TABLE devices (
  z2m_id TEXT PRIMARY KEY,
  friendly_name TEXT NOT NULL UNIQUE,
  location_id INTEGER NULL REFERENCES locations(id) ON DELETE SET NULL,
  model TEXT NULL,
  manufacturer TEXT NULL,
  role TEXT NOT NULL CHECK(role IN ('input', 'output', 'both')) DEFAULT 'both',
  user_notes TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NULL
);

CREATE INDEX devices_location_id ON devices(location_id);
