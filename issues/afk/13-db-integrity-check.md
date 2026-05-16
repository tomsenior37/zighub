# 13 — Database integrity check on startup

## Goal
Detect a corrupted or partially-written SQLite file before the app starts handling traffic. A bad DB should fail loud, not silently lose data.

## Acceptance criteria
- `src/db/integrity.ts` exports `runIntegrityCheck(db)` that runs `PRAGMA integrity_check` and `PRAGMA foreign_key_check`.
- Returns `{ ok: true }` on pass.
- On failure, returns `{ ok: false, errors: string[] }` — does not throw inside the function.
- `src/server.ts` calls it at startup, **before** binding the port. On failure: log a clear error message pointing the user at restore-from-backup, set exit code 2, exit.
- An `audit_log` entry is written via the helper from issue 12 — category `"db"`, event `"integrity-check-pass"` or `"integrity-check-fail"` — and on fail, `details` includes the errors array.
- Test: corrupting a temp DB file (write garbage to bytes 100–200) is detected.

## Deliverables ticked
- §1 "Database integrity check on startup"

## Notes
- Don't try to auto-repair. We have backups; a corrupt DB is a restore-from-backup situation.
- The `audit_log` write on a corrupt DB will likely fail too — that's why `log()` swallows errors (issue 12).
