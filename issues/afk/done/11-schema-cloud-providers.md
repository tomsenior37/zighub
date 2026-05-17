# 11 — CloudProvider table + CRUD

## Goal
Persistence for connected cloud backup providers. Tokens live in OS keychain, never here (scope §8).

## Acceptance criteria
- Migration `0006_cloud_providers.sql` creates `cloud_providers`:
  - `id INTEGER PRIMARY KEY`
  - `type TEXT NOT NULL CHECK(type IN ('drive','dropbox','rclone'))`
  - `display_name TEXT NOT NULL` (user-friendly, e.g. "Tom's Google Drive")
  - `connected_at TEXT NOT NULL DEFAULT (datetime('now'))`
  - `last_successful_backup_at TEXT NULL`
  - `last_error TEXT NULL`
  - `enabled INTEGER NOT NULL DEFAULT 1` (boolean as 0/1)
  - `UNIQUE(type, display_name)`
- `src/domain/cloudProviders.ts`: `create`, `list({ enabledOnly? })`, `get`, `setEnabled`, `recordSuccess`, `recordError(id, message)`, `delete`.
- `delete` is a domain delete only — caller is responsible for revoking the OAuth token from the keychain.
- Tests cover enable/disable, multiple providers of same type (e.g. two Drive accounts), error-then-success flow clears `last_error`.

## Deliverables ticked
- §1 "`CloudProvider` table and CRUD"

## Notes
- No token columns. Period. Tokens are keychain-only.
- `last_error` is the most recent error message; we don't keep a history here — that's `audit_log` (issue 12).
