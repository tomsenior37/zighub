CREATE TABLE locations (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id INTEGER NULL REFERENCES locations(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(name, parent_id)
);

-- SQLite treats NULLs as distinct in UNIQUE constraints, so the table-level
-- UNIQUE(name, parent_id) above does not block two top-level locations with
-- the same name. This partial index closes that gap.
CREATE UNIQUE INDEX locations_top_level_name_unique
  ON locations(name)
  WHERE parent_id IS NULL;
