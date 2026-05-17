# P4-06 — Automation YAML schema, parser, and validator

## Goal
Define the YAML schema for automations and a strict parser/validator. Every later piece of the rule engine consumes this — no engine without a schema.

## Acceptance criteria
- New dep: `yaml` (eemeli/yaml, ~32KB, zero deps, well-maintained).
- `src/rules/schema.ts` defines TypeScript types matching the spec from `project/project_scope.md §6.3`:

  ```ts
  interface AutomationDoc {
    version: 1;
    name: string;                 // 1..200
    description?: string;         // <=2000
    trigger: Trigger;             // single trigger for v1; or-of-many later
    conditions?: Condition[];     // ANDed; optional
    actions: Action[];            // non-empty
  }

  type Trigger =
    | { type: "device_event"; device: string; event: string; payload?: Record<string, unknown> }
    | { type: "manual" };

  type Condition =
    | { type: "device_state"; device: string; property: string; equals: unknown }
    | { type: "time_window"; from: string /* HH:MM */; to: string /* HH:MM */ }
    | { type: "day_of_week"; days: Array<"mon"|"tue"|"wed"|"thu"|"fri"|"sat"|"sun"> };

  type Action =
    | { type: "toggle"; device: string }
    | { type: "set_state"; device: string; state: "ON"|"OFF" }
    | { type: "adjust_brightness"; device: string; brightness: number; min?: number; max?: number; step?: number }
    | { type: "send_notification"; message: string }
    | { type: "delay"; ms: number };
  ```

  More action types (set_colour, set_colour_temp, run_automation) come in follow-ups.

- `src/rules/parser.ts` exports:
  - `parseAutomation(yamlText: string): { ok: true; doc: AutomationDoc } | { ok: false; errors: ValidationIssue[] }`.
  - `ValidationIssue = { path: string; message: string }`.
  - Validation is hand-rolled (small enough to avoid ajv for v1). Covers every required field, range checks (brightness 0-254, ms 0-3_600_000), enum checks, regex for `HH:MM`.
- `src/rules/parser.test.ts`:
  - Round-trips a minimal valid doc (manual trigger + toggle action).
  - A handful of failure cases (missing trigger, unknown action type, brightness out of range, malformed time, day_of_week with invalid day).
  - Error messages include a JSONPath-like `path` (`actions[0].brightness`, etc.).

## Notes
- YAML over JSON because the spec dictates user-readable storage.
- `device` is the IEEE address (or friendly name — TBD; v1 use IEEE, since friendly names can change). Document this in the issue's README excerpt.
- `version: 1` is non-negotiable — future schema changes bump this and the parser carries migrators.
