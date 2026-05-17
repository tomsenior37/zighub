---
"zighub": minor
---

Add `audit_log` table (migration `0005_audit_log.sql`) and `src/domain/auditLog.ts` with `log`, `list`, and `purgeOlderThan`. `log()` is append-only and swallows errors to `console.error` so a logging failure can never break the calling flow. `details` is stored as opaque JSON and round-tripped to a plain object at the boundary; a corrupted/non-JSON value parses to `{}` rather than throwing. `list({ category?, since?, limit? = 100 })` filters by exact category and inclusive lower-bound timestamp; results are ordered newest-first by `(timestamp DESC, id DESC)` with the composite `(category, timestamp DESC)` index covering category-filtered queries. `purgeOlderThan(days)` returns the row count it deleted.
