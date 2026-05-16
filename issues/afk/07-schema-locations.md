# 07 — Location table + CRUD

## Goal
First domain table. Locations are first-class per scope §6.2.

## Acceptance criteria
- Migration `0002_locations.sql` creates `locations` table per scope §7:
  - `id INTEGER PRIMARY KEY`
  - `name TEXT NOT NULL`
  - `parent_id INTEGER NULL REFERENCES locations(id) ON DELETE SET NULL`
  - `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
  - `UNIQUE(name, parent_id)` (siblings can't share a name)
- `src/domain/locations.ts` exports `create`, `list`, `get`, `update`, `delete` taking a `Database` arg (no module-level globals — easier to test).
- Vitest suite covers: create, list (alphabetical), get-by-id (returns undefined for missing), update name, delete (children get parent_id nulled, not cascaded).
- Tests use an in-memory SQLite (`new Database(":memory:")`) and run the migrator against it — same code path as prod.

## Deliverables ticked
- §1 "`Location` table and CRUD"

## Notes
- Don't expose these via HTTP yet — wiring routes is a later issue.
- Validation lives in the domain layer, not the HTTP layer. Empty name → throw `ValidationError`.
