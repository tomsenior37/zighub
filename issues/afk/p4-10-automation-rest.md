# P4-10 — Automation REST surface (CRUD + promote)

## Goal
Expose the existing `automations` table via REST so the UI (p4-12) can list, create, edit, and promote drafts. The state machine (draft / active / disabled) was scaffolded back in Phase 1 — this issue wires it to HTTP.

## Acceptance criteria
- All endpoints in a new `src/automationsRoutes.ts`. Audit-logged.
- `GET /api/automations` → array of automations (filter `?state=active|draft|disabled` optional).
- `GET /api/automations/:id` → one or 404.
- `POST /api/automations` body `{ name, description?, source_yaml }`:
  - Server parses + validates via `parseAutomation` (from p4-06). 400 on validation errors with the issue list.
  - State defaults to `draft`. Returns the created row.
- `PUT /api/automations/:id` (full update) — same body, same validation. State stays whatever it was.
- `POST /api/automations/:id/promote` — moves draft → active. 409 if not in draft. Validates the YAML again before promoting. Triggers re-load of active automations in the runner (publish via a small in-process event emitter, or just have the runner read from DB on every event — simpler for v1 — see notes).
- `POST /api/automations/:id/disable` and `.../enable` toggle active ↔ disabled. Disabled never fires.
- `DELETE /api/automations/:id` removes a draft. 409 if active (must disable first).
- Existing `domain/automations.ts` already has CRUD; this issue mainly wires routes + validation.

## Tests
- POST + validation error path (400 with issue list).
- POST + GET round trip.
- Promote draft → active works; promote on non-draft returns 409.
- Disable + enable transitions.
- DELETE active returns 409; DELETE draft succeeds.

## Notes
- For v1 the runner re-reads active automations from DB on every event (1 SQL query per event — fine at expected throughput). If that becomes a hot path, p4-11 or later can add caching.
- "Automatic backup before any approved change" (§5 last bullet) is its own issue — needs the backup pipeline (§7).
