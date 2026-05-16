# 09 — Automation table + CRUD with draft/active/disabled state

## Goal
Persistence for automations. YAML is the source of truth (scope §6.3).

## Acceptance criteria
- Migration `0004_automations.sql` creates `automations`:
  - `id INTEGER PRIMARY KEY`
  - `name TEXT NOT NULL UNIQUE`
  - `primary_location_id INTEGER NULL REFERENCES locations(id) ON DELETE SET NULL`
  - `source_yaml TEXT NOT NULL`
  - `state TEXT NOT NULL CHECK(state IN ('draft','active','disabled')) DEFAULT 'draft'`
  - `generation_method TEXT NOT NULL CHECK(generation_method IN ('manual','visual','llm'))`
  - `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
  - `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`
  - `last_triggered_at TEXT NULL`
  - `run_count INTEGER NOT NULL DEFAULT 0`
- Index on `state` (drafts view query).
- `src/domain/automations.ts`: `create` (always lands as `draft`), `list({ state?, locationId? })`, `get`, `updateYaml`, `promote` (draft→active), `disable`, `enable`, `recordRun`, `delete`.
- `updateYaml` resets state to `draft` (per scope: "Edit (creates a new draft)").
- `promote` is the **only** way to reach `active` and must not be callable from MCP — leave a TODO marker; enforcement comes when MCP lands.
- Tests cover the state machine: draft→active→disabled→active, draft→edit→still-draft, can't skip states.

## Deliverables ticked
- §1 "`Automation` table and CRUD with draft/active/disabled states"

## Notes
- YAML validation lives in the rule engine (later issue) — for now `source_yaml` is opaque text.
- `recordRun` increments `run_count` and sets `last_triggered_at`; engine calls it on every fire.
