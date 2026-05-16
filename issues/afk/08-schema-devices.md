# 08 — Device table + CRUD

## Goal
Persistence for paired Zigbee devices.

## Acceptance criteria
- Migration `0003_devices.sql` creates `devices`:
  - `z2m_id TEXT PRIMARY KEY` (IEEE address, e.g. `0x00124b001234abcd`)
  - `friendly_name TEXT NOT NULL UNIQUE`
  - `location_id INTEGER NULL REFERENCES locations(id) ON DELETE SET NULL`
  - `model TEXT NULL`
  - `manufacturer TEXT NULL`
  - `role TEXT NOT NULL CHECK(role IN ('input','output','both')) DEFAULT 'both'`
  - `user_notes TEXT NULL`
  - `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
  - `last_seen_at TEXT NULL`
- Index on `location_id`.
- `src/domain/devices.ts`: `create`, `list({ locationId? })`, `get`, `rename`, `setLocation`, `setNotes`, `touchLastSeen`, `delete`.
- `list` returns devices grouped by location (shape: `Array<{ location: Location | null, devices: Device[] }>`), alphabetical within.
- Tests cover all CRUD ops plus: rename collision → `ValidationError`; setLocation with bad id → `ValidationError`; `touchLastSeen` updates timestamp.

## Deliverables ticked
- §1 "`Device` table and CRUD"

## Notes
- `role` is set by the user during pairing wizard (issue from §3) — defaults to `both` for safety.
- Don't model device state here; live state stays in herdsman + memory, not the DB.
