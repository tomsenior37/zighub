# P2-09 — `Setting` table for coordinator + first-run config

## Goal
Persist the coordinator selection (and other small bits of app config: first-run completion, default channel, etc.) in a key/value `Setting` table. This is the durable backing store for "I picked port `/dev/ttyUSB0`" and "first-run wizard is done".

## Acceptance criteria
- New migration `0007_settings.sql` (or next sequential number):
  - Creates `settings` table with `key TEXT PRIMARY KEY`, `value TEXT NOT NULL` (JSON-encoded), `updated_at INTEGER NOT NULL` (epoch ms).
  - No FK references (it's a flat KV store).
- `src/domain/settings.ts`:
  - Exports a `createSettingsRepo(db)` factory matching the style of other domain modules.
  - Methods: `get<T>(key: string): T | null`, `set<T>(key: string, value: T): void`, `delete(key: string): void`, `list(): Array<{ key: string; value: unknown; updatedAt: number }>`.
  - JSON-encodes on write, JSON-decodes on read. Errors on malformed JSON read with a typed error.
  - Every `set` and `delete` writes a corresponding `AuditLog` entry via the existing audit-log helper.
- `src/domain/settings.test.ts`:
  - Set/get round-trips primitives, objects, arrays.
  - `get` of unknown key returns `null`.
  - `set` followed by `get` returns the new value.
  - `delete` removes the row and audit-logs it.
  - Malformed JSON in the DB throws a typed error from `get`.
- Reserve a small set of known keys with constants (`SETTINGS_KEYS.COORDINATOR_PATH`, `SETTINGS_KEYS.FIRST_RUN_COMPLETE`, etc.) exported from `src/domain/settings.ts`. Document each constant.

## Test plan
- `npm test src/domain/settings.test.ts` passes.
- `npm run db:migrate` applies the new migration cleanly on a fresh DB.
- Existing tests still pass (no domain regressions).

## Deliverables ticked
None — this is infrastructure used by p2-10 (network creation persists settings) and the wizard later.

## Notes
- A flat KV table is intentionally simple. If we later need a settings UI we can build on top of `list()`. Don't model individual columns per setting — that's overfitting.
- Audit-logging every write is intentional: it gives us "who/what changed the coordinator path" for free.
