---
"zighub": minor
---

Add `automations` table (migration `0004_automations.sql`) and `src/domain/automations.ts` with `create` (always lands as `draft`), `list({ state?, locationId? })`, `get`, `updateYaml` (resets state to `draft`), `promote` (draft→active), `disable`, `enable`, `recordRun`, and `deleteAutomation`. State machine is enforced at the domain layer — only drafts can be promoted, only active can be disabled, only disabled can be enabled. `primary_location_id` FK uses `ON DELETE SET NULL`. YAML is stored as opaque text; format validation lives in the rule engine (deliverables §5).
