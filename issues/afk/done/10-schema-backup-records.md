# 10 — BackupRecord table + CRUD

## Goal
Index of backups created locally and their cloud upload status. The `.zbk` archive format itself is a later issue.

## Acceptance criteria
- Migration `0005_backup_records.sql` creates `backup_records`:
  - `id INTEGER PRIMARY KEY`
  - `filename TEXT NOT NULL UNIQUE`
  - `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
  - `size_bytes INTEGER NOT NULL`
  - `type TEXT NOT NULL CHECK(type IN ('auto','scheduled','manual'))`
  - `trigger_reason TEXT NULL` (e.g. `"device-paired:0x00124b00..."`, `"daily-3am"`)
  - `local_path TEXT NULL` (NULL once locally deleted but cloud copy still exists)
  - `cloud_uploads TEXT NOT NULL DEFAULT '[]'` (JSON array per scope §7)
- Index on `created_at DESC`.
- `src/domain/backupRecords.ts`: `create`, `list({ limit?, offset? })` (newest first), `get`, `recordCloudUpload(id, { provider, status, remoteId })`, `markLocalDeleted(id)`, `delete`.
- `cloud_uploads` parsed/serialised at the boundary — callers see `Array<{ provider, status, remoteId, uploadedAt }>`.
- Tests cover JSON column round-trips and the cloud-upload append semantics (no duplicates per provider — replaces existing entry).

## Deliverables ticked
- §1 "`BackupRecord` table and CRUD"

## Notes
- The `.zbk` writer is a separate issue (Phase 2). This table is the index only.
- Retention policy enforcement is also separate (Phase 2 — §7.1 of deliverables).
