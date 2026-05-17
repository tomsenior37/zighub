import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "../db/migrate.js";
import {
  type BackupRecord,
  type CloudUpload,
  type CreateBackupRecordInput,
  create,
  deleteBackupRecord,
  get,
  list,
  markLocalDeleted,
  recordCloudUpload,
  ValidationError,
} from "./backupRecords.js";

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

const BASE_INPUT: CreateBackupRecordInput = {
  filename: "zighub-2026-05-17-0300.zbk",
  size_bytes: 12345,
  type: "scheduled",
  trigger_reason: "daily-3am",
  local_path: "/var/lib/zighub/backups/zighub-2026-05-17-0300.zbk",
};

describe("backupRecords.create", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("inserts a record with all fields set", () => {
    const r = create(db, BASE_INPUT);
    expect(r.id).toBeGreaterThan(0);
    expect(r.filename).toBe(BASE_INPUT.filename);
    expect(r.size_bytes).toBe(12345);
    expect(r.type).toBe("scheduled");
    expect(r.trigger_reason).toBe("daily-3am");
    expect(r.local_path).toBe(BASE_INPUT.local_path);
    expect(r.cloud_uploads).toEqual([]);
    expect(r.created_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("defaults trigger_reason and local_path to null when omitted", () => {
    const r = create(db, {
      filename: "backup-1.zbk",
      size_bytes: 100,
      type: "manual",
    });
    expect(r.trigger_reason).toBeNull();
    expect(r.local_path).toBeNull();
    expect(r.cloud_uploads).toEqual([]);
  });

  it("accepts each valid type", () => {
    for (const t of ["auto", "scheduled", "manual"] as const) {
      const r = create(db, { filename: `b-${t}.zbk`, size_bytes: 1, type: t });
      expect(r.type).toBe(t);
    }
  });

  it("rejects empty filename", () => {
    expect(() => create(db, { ...BASE_INPUT, filename: "" })).toThrow(ValidationError);
  });

  it("rejects whitespace-only filename", () => {
    expect(() => create(db, { ...BASE_INPUT, filename: "   " })).toThrow(ValidationError);
  });

  it("trims filename", () => {
    const r = create(db, { ...BASE_INPUT, filename: "  trimmed.zbk  " });
    expect(r.filename).toBe("trimmed.zbk");
  });

  it("rejects negative size_bytes", () => {
    expect(() => create(db, { ...BASE_INPUT, size_bytes: -1 })).toThrow(ValidationError);
  });

  it("rejects non-integer size_bytes", () => {
    expect(() => create(db, { ...BASE_INPUT, size_bytes: 3.14 })).toThrow(ValidationError);
  });

  it("accepts size_bytes of 0", () => {
    const r = create(db, { ...BASE_INPUT, filename: "empty.zbk", size_bytes: 0 });
    expect(r.size_bytes).toBe(0);
  });

  it("rejects an invalid type", () => {
    expect(() => create(db, { ...BASE_INPUT, type: "rogue" as unknown as "manual" })).toThrow(
      ValidationError,
    );
  });

  it("rejects duplicate filename", () => {
    create(db, BASE_INPUT);
    expect(() => create(db, BASE_INPUT)).toThrow(ValidationError);
  });
});

describe("backupRecords.get", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns the record by id", () => {
    const created = create(db, BASE_INPUT);
    const got = get(db, created.id);
    expect(got).toEqual(created);
  });

  it("returns undefined when id is unknown", () => {
    expect(get(db, 9999)).toBeUndefined();
  });
});

describe("backupRecords.list", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns an empty array when no records exist", () => {
    expect(list(db)).toEqual([]);
  });

  it("orders newest first by created_at then id", () => {
    create(db, { filename: "a.zbk", size_bytes: 1, type: "manual" });
    create(db, { filename: "b.zbk", size_bytes: 1, type: "manual" });
    create(db, { filename: "c.zbk", size_bytes: 1, type: "manual" });
    const filenames = list(db).map((r) => r.filename);
    expect(filenames).toEqual(["c.zbk", "b.zbk", "a.zbk"]);
  });

  it("breaks created_at ties with id DESC", () => {
    // datetime('now') has 1s resolution so multiple inserts in the same second
    // share a timestamp — id DESC must give a stable newest-first ordering.
    db.prepare(
      "INSERT INTO backup_records (filename, created_at, size_bytes, type) VALUES (?, ?, ?, ?)",
    ).run("tie-1.zbk", "2026-05-17 12:00:00", 1, "manual");
    db.prepare(
      "INSERT INTO backup_records (filename, created_at, size_bytes, type) VALUES (?, ?, ?, ?)",
    ).run("tie-2.zbk", "2026-05-17 12:00:00", 1, "manual");
    db.prepare(
      "INSERT INTO backup_records (filename, created_at, size_bytes, type) VALUES (?, ?, ?, ?)",
    ).run("tie-3.zbk", "2026-05-17 12:00:00", 1, "manual");
    expect(list(db).map((r) => r.filename)).toEqual(["tie-3.zbk", "tie-2.zbk", "tie-1.zbk"]);
  });

  it("applies a default limit of 100", () => {
    const stmt = db.prepare(
      "INSERT INTO backup_records (filename, size_bytes, type) VALUES (?, ?, ?)",
    );
    for (let i = 0; i < 150; i++) {
      stmt.run(`b-${i}.zbk`, 1, "manual");
    }
    expect(list(db)).toHaveLength(100);
  });

  it("honours a custom limit", () => {
    create(db, { filename: "a.zbk", size_bytes: 1, type: "manual" });
    create(db, { filename: "b.zbk", size_bytes: 1, type: "manual" });
    create(db, { filename: "c.zbk", size_bytes: 1, type: "manual" });
    expect(list(db, { limit: 2 }).map((r) => r.filename)).toEqual(["c.zbk", "b.zbk"]);
  });

  it("honours an offset for pagination", () => {
    create(db, { filename: "a.zbk", size_bytes: 1, type: "manual" });
    create(db, { filename: "b.zbk", size_bytes: 1, type: "manual" });
    create(db, { filename: "c.zbk", size_bytes: 1, type: "manual" });
    expect(list(db, { limit: 1, offset: 1 }).map((r) => r.filename)).toEqual(["b.zbk"]);
  });

  it("parses cloud_uploads back into objects", () => {
    const r = create(db, BASE_INPUT);
    recordCloudUpload(db, r.id, { provider: "drive", status: "success", remoteId: "abc123" });
    const fetched = list(db);
    expect(fetched).toHaveLength(1);
    expect(fetched[0]!.cloud_uploads).toHaveLength(1);
    expect(fetched[0]!.cloud_uploads[0]!.provider).toBe("drive");
    expect(fetched[0]!.cloud_uploads[0]!.status).toBe("success");
    expect(fetched[0]!.cloud_uploads[0]!.remoteId).toBe("abc123");
  });

  it("returns cloud_uploads as [] when the column is corrupted", () => {
    db.prepare(
      "INSERT INTO backup_records (filename, size_bytes, type, cloud_uploads) VALUES (?, ?, ?, ?)",
    ).run("corrupted.zbk", 1, "manual", "not json[");
    const fetched = list(db);
    expect(fetched).toHaveLength(1);
    expect(fetched[0]!.cloud_uploads).toEqual([]);
  });
});

describe("backupRecords.recordCloudUpload", () => {
  let db: Database.Database;
  let record: BackupRecord;
  beforeEach(() => {
    db = freshDb();
    record = create(db, BASE_INPUT);
  });

  it("appends a cloud upload to an empty array", () => {
    recordCloudUpload(db, record.id, {
      provider: "drive",
      status: "success",
      remoteId: "drive-id-1",
    });
    const r = get(db, record.id);
    expect(r?.cloud_uploads).toHaveLength(1);
    const entry = r!.cloud_uploads[0]!;
    expect(entry.provider).toBe("drive");
    expect(entry.status).toBe("success");
    expect(entry.remoteId).toBe("drive-id-1");
    expect(entry.uploadedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("accumulates uploads from different providers", () => {
    recordCloudUpload(db, record.id, {
      provider: "drive",
      status: "success",
      remoteId: "drive-id-1",
    });
    recordCloudUpload(db, record.id, {
      provider: "dropbox",
      status: "success",
      remoteId: "dbx-id-1",
    });
    const r = get(db, record.id);
    expect(r?.cloud_uploads.map((u: CloudUpload) => u.provider).sort()).toEqual([
      "drive",
      "dropbox",
    ]);
  });

  it("replaces (does not duplicate) an existing entry for the same provider", () => {
    recordCloudUpload(db, record.id, {
      provider: "drive",
      status: "failed",
      remoteId: null,
    });
    recordCloudUpload(db, record.id, {
      provider: "drive",
      status: "success",
      remoteId: "drive-id-1",
    });
    const r = get(db, record.id);
    expect(r?.cloud_uploads).toHaveLength(1);
    expect(r?.cloud_uploads[0]!.status).toBe("success");
    expect(r?.cloud_uploads[0]!.remoteId).toBe("drive-id-1");
  });

  it("accepts remoteId as null (e.g. for failed uploads)", () => {
    recordCloudUpload(db, record.id, {
      provider: "dropbox",
      status: "failed",
      remoteId: null,
    });
    const r = get(db, record.id);
    expect(r?.cloud_uploads[0]!.remoteId).toBeNull();
    expect(r?.cloud_uploads[0]!.status).toBe("failed");
  });

  it("rejects an invalid status", () => {
    expect(() =>
      recordCloudUpload(db, record.id, {
        provider: "drive",
        status: "weird" as unknown as "success",
        remoteId: "x",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects an empty provider", () => {
    expect(() =>
      recordCloudUpload(db, record.id, { provider: "", status: "success", remoteId: "x" }),
    ).toThrow(ValidationError);
  });

  it("rejects an unknown backup id", () => {
    expect(() =>
      recordCloudUpload(db, 9999, { provider: "drive", status: "success", remoteId: "x" }),
    ).toThrow(ValidationError);
  });
});

describe("backupRecords.markLocalDeleted", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("sets local_path to null", () => {
    const r = create(db, BASE_INPUT);
    expect(r.local_path).not.toBeNull();
    markLocalDeleted(db, r.id);
    const after = get(db, r.id);
    expect(after?.local_path).toBeNull();
  });

  it("preserves cloud_uploads when marking local deleted", () => {
    const r = create(db, BASE_INPUT);
    recordCloudUpload(db, r.id, { provider: "drive", status: "success", remoteId: "rid" });
    markLocalDeleted(db, r.id);
    const after = get(db, r.id);
    expect(after?.cloud_uploads).toHaveLength(1);
    expect(after?.cloud_uploads[0]!.provider).toBe("drive");
  });

  it("rejects an unknown id", () => {
    expect(() => markLocalDeleted(db, 9999)).toThrow(ValidationError);
  });
});

describe("backupRecords.delete", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("removes the row", () => {
    const r = create(db, BASE_INPUT);
    deleteBackupRecord(db, r.id);
    expect(get(db, r.id)).toBeUndefined();
  });

  it("is a no-op for an unknown id", () => {
    expect(() => deleteBackupRecord(db, 9999)).not.toThrow();
  });
});
