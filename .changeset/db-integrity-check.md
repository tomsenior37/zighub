---
"zighub": minor
---

Add `src/db/integrity.ts` exporting `runIntegrityCheck(db)` which runs `PRAGMA integrity_check` and `PRAGMA foreign_key_check` and returns either `{ ok: true }` or `{ ok: false, errors: string[] }`. It never throws — any underlying SQLite error is captured into the errors array. Wired into `src/index.ts`: at startup, before `app.listen()`, the entrypoint opens the DB, runs the check, writes an `audit_log` entry (`category: "db"`, `event: "integrity-check-pass"` or `"integrity-check-fail"`), and on failure prints a clear restore-from-backup message and exits with code 2. A severely corrupt file that throws on `getDb()` (e.g. PRAGMA `journal_mode = WAL` trips immediately) is caught with the same exit-2 path, so the user never sees a raw stack trace.
