# 12 — AuditLog table + write helper

## Goal
Append-only event log surfaced in the Settings UI later. Used by backup, cloud, restore, and (later) automation flows.

## Acceptance criteria
- Migration `0007_audit_log.sql` creates `audit_log`:
  - `id INTEGER PRIMARY KEY`
  - `timestamp TEXT NOT NULL DEFAULT (datetime('now'))`
  - `category TEXT NOT NULL` (free text, e.g. `"backup"`, `"cloud"`, `"automation"`, `"pairing"`)
  - `event TEXT NOT NULL` (short slug, e.g. `"backup-created"`, `"cloud-upload-failed"`)
  - `details TEXT NOT NULL DEFAULT '{}'` (JSON)
- Index on `(category, timestamp DESC)`.
- `src/domain/auditLog.ts`:
  - `log(db, { category, event, details? })` — writes a row; never throws (errors swallowed + console.error so logging can't break a flow).
  - `list(db, { category?, since?, limit? = 100 })`
  - `purgeOlderThan(db, days)` — for retention; not wired to a scheduler yet.
- Tests cover writes, filtering, JSON round-trip, and the swallow-errors guarantee.

## Deliverables ticked
- §1 "`AuditLog` table and write helper"

## Notes
- Append-only. No `update`, no `delete` of individual rows (only `purgeOlderThan` for bulk).
- Keep `details` schemaless on purpose — callers decide what's useful per event.
