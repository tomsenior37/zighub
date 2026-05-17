import type Database from "better-sqlite3";
import { ValidationError } from "./errors.js";

export { ValidationError };

export type BackupType = "auto" | "scheduled" | "manual";
const BACKUP_TYPES: readonly BackupType[] = ["auto", "scheduled", "manual"];

export type CloudUploadStatus = "success" | "failed";
const CLOUD_UPLOAD_STATUSES: readonly CloudUploadStatus[] = ["success", "failed"];

export interface CloudUpload {
  provider: string;
  status: CloudUploadStatus;
  remoteId: string | null;
  uploadedAt: string;
}

export interface BackupRecord {
  id: number;
  filename: string;
  created_at: string;
  size_bytes: number;
  type: BackupType;
  trigger_reason: string | null;
  local_path: string | null;
  cloud_uploads: CloudUpload[];
}

export interface CreateBackupRecordInput {
  filename: string;
  size_bytes: number;
  type: BackupType;
  trigger_reason?: string | null;
  local_path?: string | null;
}

export interface ListBackupRecordsOptions {
  limit?: number;
  offset?: number;
}

export interface RecordCloudUploadInput {
  provider: string;
  status: CloudUploadStatus;
  remoteId: string | null;
}

interface BackupRow {
  id: number;
  filename: string;
  created_at: string;
  size_bytes: number;
  type: BackupType;
  trigger_reason: string | null;
  local_path: string | null;
  cloud_uploads: string;
}

const COLUMNS =
  "id, filename, created_at, size_bytes, type, trigger_reason, local_path, cloud_uploads";

const DEFAULT_LIMIT = 100;

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

function assertType(type: BackupType): void {
  if (!BACKUP_TYPES.includes(type)) {
    throw new ValidationError(`type must be one of ${BACKUP_TYPES.join(", ")}`);
  }
}

function assertStatus(status: CloudUploadStatus): void {
  if (!CLOUD_UPLOAD_STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of ${CLOUD_UPLOAD_STATUSES.join(", ")}`);
  }
}

function assertSizeBytes(value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError("size_bytes must be a non-negative integer");
  }
}

function isUniqueConstraintError(err: unknown, column: string): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return msg.includes("UNIQUE constraint failed") && msg.includes(`backup_records.${column}`);
}

function parseCloudUploads(raw: string): CloudUpload[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const result: CloudUpload[] = [];
  for (const entry of parsed) {
    if (entry === null || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.provider !== "string") continue;
    if (typeof e.status !== "string") continue;
    if (!CLOUD_UPLOAD_STATUSES.includes(e.status as CloudUploadStatus)) continue;
    if (e.remoteId !== null && typeof e.remoteId !== "string") continue;
    if (typeof e.uploadedAt !== "string") continue;
    result.push({
      provider: e.provider,
      status: e.status as CloudUploadStatus,
      remoteId: e.remoteId,
      uploadedAt: e.uploadedAt,
    });
  }
  return result;
}

function rowToRecord(row: BackupRow): BackupRecord {
  return {
    id: row.id,
    filename: row.filename,
    created_at: row.created_at,
    size_bytes: row.size_bytes,
    type: row.type,
    trigger_reason: row.trigger_reason,
    local_path: row.local_path,
    cloud_uploads: parseCloudUploads(row.cloud_uploads),
  };
}

export function create(db: Database.Database, input: CreateBackupRecordInput): BackupRecord {
  const filename = normaliseRequired(input.filename, "filename");
  assertType(input.type);
  assertSizeBytes(input.size_bytes);

  let id: number;
  try {
    const info = db
      .prepare(
        `INSERT INTO backup_records (filename, size_bytes, type, trigger_reason, local_path)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        filename,
        input.size_bytes,
        input.type,
        input.trigger_reason ?? null,
        input.local_path ?? null,
      );
    id = Number(info.lastInsertRowid);
  } catch (err) {
    if (isUniqueConstraintError(err, "filename")) {
      throw new ValidationError(`filename "${filename}" is already in use`);
    }
    throw err;
  }

  const row = get(db, id);
  if (!row) {
    throw new Error("failed to load backup_record after insert");
  }
  return row;
}

export function get(db: Database.Database, id: number): BackupRecord | undefined {
  const row = db.prepare(`SELECT ${COLUMNS} FROM backup_records WHERE id = ?`).get(id) as
    | BackupRow
    | undefined;
  return row ? rowToRecord(row) : undefined;
}

function requireBackupRecord(db: Database.Database, id: number): BackupRecord {
  const row = get(db, id);
  if (!row) {
    throw new ValidationError(`backup_record ${id} not found`);
  }
  return row;
}

export function list(
  db: Database.Database,
  options: ListBackupRecordsOptions = {},
): BackupRecord[] {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const offset = options.offset ?? 0;
  const rows = db
    .prepare(
      `SELECT ${COLUMNS} FROM backup_records
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as BackupRow[];
  return rows.map(rowToRecord);
}

export function recordCloudUpload(
  db: Database.Database,
  id: number,
  input: RecordCloudUploadInput,
): BackupRecord {
  const provider = normaliseRequired(input.provider, "provider");
  assertStatus(input.status);
  if (input.remoteId !== null && typeof input.remoteId !== "string") {
    throw new ValidationError("remoteId must be a string or null");
  }
  const current = requireBackupRecord(db, id);

  const filtered = current.cloud_uploads.filter((u) => u.provider !== provider);
  const next: CloudUpload[] = [
    ...filtered,
    {
      provider,
      status: input.status,
      remoteId: input.remoteId,
      uploadedAt: nowIso(db),
    },
  ];

  db.prepare("UPDATE backup_records SET cloud_uploads = ? WHERE id = ?").run(
    JSON.stringify(next),
    id,
  );
  return requireBackupRecord(db, id);
}

export function markLocalDeleted(db: Database.Database, id: number): BackupRecord {
  requireBackupRecord(db, id);
  db.prepare("UPDATE backup_records SET local_path = NULL WHERE id = ?").run(id);
  return requireBackupRecord(db, id);
}

export function deleteBackupRecord(db: Database.Database, id: number): void {
  db.prepare("DELETE FROM backup_records WHERE id = ?").run(id);
}

function nowIso(db: Database.Database): string {
  const row = db.prepare("SELECT datetime('now') AS now").get() as { now: string };
  return row.now;
}
