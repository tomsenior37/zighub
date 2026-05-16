# 14 — Atomic database snapshot helper

## Goal
A function that produces a consistent point-in-time copy of `zighub.db` while the app is running. This is the foundation for `.zbk` backups (Phase 2).

## Acceptance criteria
- `src/db/snapshot.ts` exports `async snapshot(db, destPath)` that:
  - Uses `Database.backup()` from `better-sqlite3` (the SQLite Online Backup API). NOT a file copy — must work while WAL is active and writes are in flight.
  - Writes to `${destPath}.tmp` first, fsyncs, then renames to `destPath`. Atomic on POSIX.
  - Returns `{ bytes: number, durationMs: number }`.
- Concurrent-writes test: spawn a background loop inserting `audit_log` rows; call `snapshot()`; verify the snapshot file is a valid SQLite DB and has a subset of the rows.
- Snapshot of a DB with FK constraints validates clean (`PRAGMA foreign_key_check` on the snapshot).
- Failure modes covered: dest path unwritable → throws with a useful message, no `.tmp` left behind.

## Deliverables ticked
- §1 "Atomic backup of database file (consistent snapshot)"

## Notes
- This issue is purely the DB-snapshot primitive. Bundling into the `.zbk` archive (manifest + network.json + db) is a separate later issue.
- `better-sqlite3`'s `db.backup(filename)` returns a Promise (it's async via worker thread). Use that, don't roll your own.
