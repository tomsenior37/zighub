# P4-01 — First-run detection (settings-driven, auto-redirect)

## Goal
Replace the hardcoded `useFirstRun()` placeholder with real detection backed by the `settings` table. When `SETTINGS_KEYS.FIRST_RUN_COMPLETE` is unset / false, `/` redirects to `/wizard` and the wizard link is visible in the nav; once set, redirects go to `/devices` and the wizard link disappears.

## Acceptance criteria
- New endpoint `GET /api/setup-state` returns `{ firstRunComplete: boolean }` from the settings repo.
- New frontend hook `useFirstRun()` (rewrite the existing placeholder) uses `useQuery` against `/api/setup-state`. Loading state returns `firstRunComplete: false` (safer default — show wizard when uncertain).
- `Layout.tsx` reads from the new hook and hides the wizard nav link once `firstRunComplete` is true.
- `routes.tsx` loader for `/` uses a `useQuery`-friendly check (since loaders can't easily access hooks, expose a small `isFirstRun()` async function that calls `getJson<{firstRunComplete: boolean}>("/api/setup-state")` and use it from the loader).
- Tests:
  - Backend: `GET /api/setup-state` returns false on fresh DB, true after `settings.set(FIRST_RUN_COMPLETE, true)`.
  - Frontend RTL: with fetch returning `{firstRunComplete: false}`, nav shows the wizard link and `/` redirects to `/wizard`; with `{firstRunComplete: true}`, nav hides it and `/` redirects to `/devices`.

## Notes
- `FIRST_RUN_COMPLETE` is set by the wizard's final step (p4-05) — this issue just exposes the read side.
- Cached query key `["setup-state"]` so other parts of the app can invalidate it when the wizard completes.
