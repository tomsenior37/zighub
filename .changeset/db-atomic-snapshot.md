---
"zighub": minor
---

Add `src/db/snapshot.ts` exporting `async snapshot(db, destPath)` — the foundation primitive for `.zbk` backups. Uses better-sqlite3's online backup API (NOT a file copy) so it produces a consistent point-in-time snapshot while WAL is active and writes are in flight. Writes to `${destPath}.tmp`, fsyncs the file, then renames to `destPath` for POSIX-atomic publication. Returns `{ bytes, durationMs }`. On failure, the `.tmp` is cleaned up and a wrapped error with a useful message is thrown. No HTTP wiring yet — pure primitive.
