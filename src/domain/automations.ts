import type Database from "better-sqlite3";
import { ValidationError } from "./errors.js";

export { ValidationError };

export type AutomationState = "draft" | "active" | "disabled";
const AUTOMATION_STATES: readonly AutomationState[] = ["draft", "active", "disabled"];

export type GenerationMethod = "manual" | "visual" | "llm";
const GENERATION_METHODS: readonly GenerationMethod[] = ["manual", "visual", "llm"];

export interface Automation {
  id: number;
  name: string;
  primary_location_id: number | null;
  source_yaml: string;
  state: AutomationState;
  generation_method: GenerationMethod;
  created_at: string;
  updated_at: string;
  last_triggered_at: string | null;
  run_count: number;
}

export interface CreateAutomationInput {
  name: string;
  source_yaml: string;
  generation_method: GenerationMethod;
  primary_location_id?: number | null;
}

export interface ListAutomationsOptions {
  state?: AutomationState;
  locationId?: number | null;
}

const COLUMNS =
  "id, name, primary_location_id, source_yaml, state, generation_method, created_at, updated_at, last_triggered_at, run_count";

function normaliseRequired(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(`${field} must not be empty`);
  }
  return trimmed;
}

function assertGenerationMethod(method: GenerationMethod): void {
  if (!GENERATION_METHODS.includes(method)) {
    throw new ValidationError(`generation_method must be one of ${GENERATION_METHODS.join(", ")}`);
  }
}

function assertState(state: AutomationState): void {
  if (!AUTOMATION_STATES.includes(state)) {
    throw new ValidationError(`state must be one of ${AUTOMATION_STATES.join(", ")}`);
  }
}

function assertLocationExists(db: Database.Database, locationId: number): void {
  const row = db.prepare("SELECT id FROM locations WHERE id = ?").get(locationId);
  if (!row) {
    throw new ValidationError(`location ${locationId} not found`);
  }
}

function isUniqueConstraintError(err: unknown, column: string): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return msg.includes("UNIQUE constraint failed") && msg.includes(`automations.${column}`);
}

export function create(db: Database.Database, input: CreateAutomationInput): Automation {
  const name = normaliseRequired(input.name, "name");
  // source_yaml is opaque text — only validated for non-empty here. Real YAML
  // validation lives in the rule engine (deliverables §5).
  const sourceYaml = normaliseRequired(input.source_yaml, "source_yaml");
  assertGenerationMethod(input.generation_method);

  const locationId = input.primary_location_id ?? null;
  if (locationId !== null) {
    assertLocationExists(db, locationId);
  }

  let id: number;
  try {
    // state column intentionally omitted from INSERT — DB default 'draft' applies.
    // create() always lands as draft regardless of what callers might pass.
    const info = db
      .prepare(
        `INSERT INTO automations (name, primary_location_id, source_yaml, generation_method)
         VALUES (?, ?, ?, ?)`,
      )
      .run(name, locationId, sourceYaml, input.generation_method);
    id = Number(info.lastInsertRowid);
  } catch (err) {
    if (isUniqueConstraintError(err, "name")) {
      throw new ValidationError(`name "${name}" is already in use`);
    }
    throw err;
  }

  const row = get(db, id);
  if (!row) {
    throw new Error("failed to load automation after insert");
  }
  return row;
}

export function get(db: Database.Database, id: number): Automation | undefined {
  return db.prepare(`SELECT ${COLUMNS} FROM automations WHERE id = ?`).get(id) as
    | Automation
    | undefined;
}

function requireAutomation(db: Database.Database, id: number): Automation {
  const row = get(db, id);
  if (!row) {
    throw new ValidationError(`automation ${id} not found`);
  }
  return row;
}

export function list(db: Database.Database, options: ListAutomationsOptions = {}): Automation[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (options.state !== undefined) {
    assertState(options.state);
    clauses.push("state = ?");
    params.push(options.state);
  }

  if (options.locationId !== undefined) {
    if (options.locationId === null) {
      clauses.push("primary_location_id IS NULL");
    } else {
      assertLocationExists(db, options.locationId);
      clauses.push("primary_location_id = ?");
      params.push(options.locationId);
    }
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(`SELECT ${COLUMNS} FROM automations ${where} ORDER BY name COLLATE NOCASE ASC`)
    .all(...params) as Automation[];
}

export function updateYaml(db: Database.Database, id: number, sourceYaml: string): Automation {
  const trimmed = normaliseRequired(sourceYaml, "source_yaml");
  requireAutomation(db, id);
  // Per scope §6.3 "Edit (creates a new draft)" — any edit drops the automation
  // back to draft. The user must re-promote to put it live again.
  db.prepare(
    `UPDATE automations
     SET source_yaml = ?, state = 'draft', updated_at = datetime('now')
     WHERE id = ?`,
  ).run(trimmed, id);
  return requireAutomation(db, id);
}

// TODO: when MCP transport lands (issues 13+), enforce that promote() is not
// callable via MCP tools. Promotion to 'active' must require explicit user
// confirmation in the UI — never a model-initiated action.
export function promote(db: Database.Database, id: number): Automation {
  const current = requireAutomation(db, id);
  if (current.state !== "draft") {
    throw new ValidationError(
      `cannot promote automation in state '${current.state}'; only drafts may be promoted`,
    );
  }
  db.prepare(
    `UPDATE automations SET state = 'active', updated_at = datetime('now') WHERE id = ?`,
  ).run(id);
  return requireAutomation(db, id);
}

export function disable(db: Database.Database, id: number): Automation {
  const current = requireAutomation(db, id);
  if (current.state !== "active") {
    throw new ValidationError(
      `cannot disable automation in state '${current.state}'; only active automations may be disabled`,
    );
  }
  db.prepare(
    `UPDATE automations SET state = 'disabled', updated_at = datetime('now') WHERE id = ?`,
  ).run(id);
  return requireAutomation(db, id);
}

export function enable(db: Database.Database, id: number): Automation {
  const current = requireAutomation(db, id);
  if (current.state !== "disabled") {
    throw new ValidationError(
      `cannot enable automation in state '${current.state}'; only disabled automations may be enabled`,
    );
  }
  db.prepare(
    `UPDATE automations SET state = 'active', updated_at = datetime('now') WHERE id = ?`,
  ).run(id);
  return requireAutomation(db, id);
}

export function recordRun(db: Database.Database, id: number): Automation {
  requireAutomation(db, id);
  db.prepare(
    `UPDATE automations
     SET run_count = run_count + 1, last_triggered_at = datetime('now')
     WHERE id = ?`,
  ).run(id);
  return requireAutomation(db, id);
}

export function deleteAutomation(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM automations WHERE id = ?").run(id);
}
