# 06 — SQLite + migrations system

## Goal
Embed `better-sqlite3` and a forward-only migrations runner. All subsequent schema work (issues 07–12) lands as a numbered migration file.

## Acceptance criteria
- `better-sqlite3` installed as runtime dep.
- `src/db/connection.ts` exports a single `getDb()` returning a configured `Database` instance. WAL mode on. `foreign_keys = ON`. `synchronous = NORMAL`. `journal_mode = WAL`.
- `src/db/migrate.ts` runs all `.sql` files in `src/db/migrations/` in lexical order, tracking applied migrations in a `_migrations` table (`id`, `name`, `applied_at`).
- `src/db/migrations/0001_init.sql` exists — creates the `_migrations` table only. No domain tables yet.
- `npm run db:migrate` script wired up.
- Tests cover: fresh DB applies all migrations; re-running is a no-op; out-of-order failure is detected.
- DB path defaults to `./data/zighub.db`, overridable via `ZIGHUB_DB_PATH` env var.

## Deliverables ticked
- §1 "SQLite schema migrations system in place"

## Notes
- Forward-only — no `down` migrations. Rollbacks happen via backup restore.
- Use raw SQL files, not an ORM. Drizzle/Prisma add weight we don't need for a single-process embedded DB.
