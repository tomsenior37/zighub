import type Database from "better-sqlite3";
import { ValidationError } from "./errors.js";

export { ValidationError };

export type CloudProviderType = "drive" | "dropbox" | "rclone";
const CLOUD_PROVIDER_TYPES: readonly CloudProviderType[] = ["drive", "dropbox", "rclone"];

export interface CloudProvider {
  id: number;
  type: CloudProviderType;
  display_name: string;
  connected_at: string;
  last_successful_backup_at: string | null;
  last_error: string | null;
  enabled: boolean;
}

export interface CreateCloudProviderInput {
  type: CloudProviderType;
  display_name: string;
}

export interface ListCloudProvidersOptions {
  enabledOnly?: boolean;
}

interface CloudProviderRow {
  id: number;
  type: CloudProviderType;
  display_name: string;
  connected_at: string;
  last_successful_backup_at: string | null;
  last_error: string | null;
  enabled: number;
}

const COLUMNS =
  "id, type, display_name, connected_at, last_successful_backup_at, last_error, enabled";

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

function assertType(type: CloudProviderType): void {
  if (!CLOUD_PROVIDER_TYPES.includes(type)) {
    throw new ValidationError(`type must be one of ${CLOUD_PROVIDER_TYPES.join(", ")}`);
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("UNIQUE constraint failed: cloud_providers");
}

function rowToProvider(row: CloudProviderRow): CloudProvider {
  return {
    id: row.id,
    type: row.type,
    display_name: row.display_name,
    connected_at: row.connected_at,
    last_successful_backup_at: row.last_successful_backup_at,
    last_error: row.last_error,
    enabled: row.enabled === 1,
  };
}

export function create(db: Database.Database, input: CreateCloudProviderInput): CloudProvider {
  assertType(input.type);
  const display_name = normaliseRequired(input.display_name, "display_name");

  let id: number;
  try {
    const info = db
      .prepare("INSERT INTO cloud_providers (type, display_name) VALUES (?, ?)")
      .run(input.type, display_name);
    id = Number(info.lastInsertRowid);
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new ValidationError(
        `cloud_provider with type "${input.type}" and display_name "${display_name}" already exists`,
      );
    }
    throw err;
  }

  const row = get(db, id);
  if (!row) {
    throw new Error("failed to load cloud_provider after insert");
  }
  return row;
}

export function get(db: Database.Database, id: number): CloudProvider | undefined {
  const row = db.prepare(`SELECT ${COLUMNS} FROM cloud_providers WHERE id = ?`).get(id) as
    | CloudProviderRow
    | undefined;
  return row ? rowToProvider(row) : undefined;
}

function requireCloudProvider(db: Database.Database, id: number): CloudProvider {
  const provider = get(db, id);
  if (!provider) {
    throw new ValidationError(`cloud_provider ${id} not found`);
  }
  return provider;
}

export function list(
  db: Database.Database,
  options: ListCloudProvidersOptions = {},
): CloudProvider[] {
  const where = options.enabledOnly === true ? "WHERE enabled = 1" : "";
  const rows = db
    .prepare(`SELECT ${COLUMNS} FROM cloud_providers ${where} ORDER BY id ASC`)
    .all() as CloudProviderRow[];
  return rows.map(rowToProvider);
}

export function setEnabled(db: Database.Database, id: number, enabled: boolean): CloudProvider {
  requireCloudProvider(db, id);
  db.prepare("UPDATE cloud_providers SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
  return requireCloudProvider(db, id);
}

export function recordSuccess(db: Database.Database, id: number): CloudProvider {
  requireCloudProvider(db, id);
  db.prepare(
    `UPDATE cloud_providers
     SET last_successful_backup_at = datetime('now'),
         last_error = NULL
     WHERE id = ?`,
  ).run(id);
  return requireCloudProvider(db, id);
}

export function recordError(db: Database.Database, id: number, message: string): CloudProvider {
  const trimmed = normaliseRequired(message, "message");
  requireCloudProvider(db, id);
  db.prepare("UPDATE cloud_providers SET last_error = ? WHERE id = ?").run(trimmed, id);
  return requireCloudProvider(db, id);
}

export function deleteCloudProvider(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM cloud_providers WHERE id = ?").run(id);
}
