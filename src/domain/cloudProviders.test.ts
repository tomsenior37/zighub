import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "../db/migrate.js";
import {
  type CloudProvider,
  type CreateCloudProviderInput,
  create,
  deleteCloudProvider,
  get,
  list,
  recordError,
  recordSuccess,
  setEnabled,
  ValidationError,
} from "./cloudProviders.js";

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

const BASE_INPUT: CreateCloudProviderInput = {
  type: "drive",
  display_name: "Tom's Google Drive",
};

describe("cloudProviders.create", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("inserts a provider with defaults", () => {
    const p = create(db, BASE_INPUT);
    expect(p.id).toBeGreaterThan(0);
    expect(p.type).toBe("drive");
    expect(p.display_name).toBe("Tom's Google Drive");
    expect(p.enabled).toBe(true);
    expect(p.last_successful_backup_at).toBeNull();
    expect(p.last_error).toBeNull();
    expect(p.connected_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("accepts each valid type", () => {
    for (const t of ["drive", "dropbox", "rclone"] as const) {
      const p = create(db, { type: t, display_name: `provider-${t}` });
      expect(p.type).toBe(t);
    }
  });

  it("trims display_name", () => {
    const p = create(db, { type: "drive", display_name: "  Trimmed  " });
    expect(p.display_name).toBe("Trimmed");
  });

  it("rejects empty display_name", () => {
    expect(() => create(db, { type: "drive", display_name: "" })).toThrow(ValidationError);
  });

  it("rejects whitespace-only display_name", () => {
    expect(() => create(db, { type: "drive", display_name: "   " })).toThrow(ValidationError);
  });

  it("rejects an invalid type", () => {
    expect(() =>
      create(db, {
        type: "icloud" as unknown as "drive",
        display_name: "iCloud",
      }),
    ).toThrow(ValidationError);
  });

  it("allows two providers of the same type with different display_names", () => {
    const a = create(db, { type: "drive", display_name: "Tom's Drive" });
    const b = create(db, { type: "drive", display_name: "Work Drive" });
    expect(a.id).not.toBe(b.id);
    expect(a.type).toBe("drive");
    expect(b.type).toBe("drive");
  });

  it("rejects a duplicate (type, display_name) pair", () => {
    create(db, BASE_INPUT);
    expect(() => create(db, BASE_INPUT)).toThrow(ValidationError);
  });

  it("allows the same display_name across different types", () => {
    create(db, { type: "drive", display_name: "Primary" });
    expect(() => create(db, { type: "dropbox", display_name: "Primary" })).not.toThrow();
  });
});

describe("cloudProviders.get", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns the provider by id", () => {
    const created = create(db, BASE_INPUT);
    const got = get(db, created.id);
    expect(got).toEqual(created);
  });

  it("returns undefined when id is unknown", () => {
    expect(get(db, 9999)).toBeUndefined();
  });
});

describe("cloudProviders.list", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns an empty array when no providers exist", () => {
    expect(list(db)).toEqual([]);
  });

  it("returns providers in insertion order (id ASC)", () => {
    const a = create(db, { type: "drive", display_name: "A" });
    const b = create(db, { type: "dropbox", display_name: "B" });
    const c = create(db, { type: "rclone", display_name: "C" });
    expect(list(db).map((p: CloudProvider) => p.id)).toEqual([a.id, b.id, c.id]);
  });

  it("returns all providers when enabledOnly is omitted", () => {
    const a = create(db, { type: "drive", display_name: "A" });
    create(db, { type: "dropbox", display_name: "B" });
    setEnabled(db, a.id, false);
    expect(list(db)).toHaveLength(2);
  });

  it("filters to enabled when enabledOnly is true", () => {
    const a = create(db, { type: "drive", display_name: "A" });
    const b = create(db, { type: "dropbox", display_name: "B" });
    setEnabled(db, a.id, false);
    const onlyEnabled = list(db, { enabledOnly: true });
    expect(onlyEnabled).toHaveLength(1);
    expect(onlyEnabled[0]!.id).toBe(b.id);
  });

  it("returns all providers when enabledOnly is false", () => {
    const a = create(db, { type: "drive", display_name: "A" });
    create(db, { type: "dropbox", display_name: "B" });
    setEnabled(db, a.id, false);
    expect(list(db, { enabledOnly: false })).toHaveLength(2);
  });

  it("coerces stored 0/1 back into boolean enabled", () => {
    const a = create(db, BASE_INPUT);
    setEnabled(db, a.id, false);
    const fetched = list(db);
    expect(fetched[0]!.enabled).toBe(false);
    setEnabled(db, a.id, true);
    expect(list(db)[0]!.enabled).toBe(true);
  });
});

describe("cloudProviders.setEnabled", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("disables an enabled provider", () => {
    const p = create(db, BASE_INPUT);
    const updated = setEnabled(db, p.id, false);
    expect(updated.enabled).toBe(false);
    expect(get(db, p.id)?.enabled).toBe(false);
  });

  it("re-enables a disabled provider", () => {
    const p = create(db, BASE_INPUT);
    setEnabled(db, p.id, false);
    const updated = setEnabled(db, p.id, true);
    expect(updated.enabled).toBe(true);
  });

  it("is idempotent for the same value", () => {
    const p = create(db, BASE_INPUT);
    const first = setEnabled(db, p.id, true);
    const second = setEnabled(db, p.id, true);
    expect(first.enabled).toBe(true);
    expect(second.enabled).toBe(true);
  });

  it("does not touch last_successful_backup_at or last_error", () => {
    const p = create(db, BASE_INPUT);
    recordError(db, p.id, "boom");
    recordSuccess(db, p.id);
    const before = get(db, p.id)!;
    setEnabled(db, p.id, false);
    const after = get(db, p.id)!;
    expect(after.last_successful_backup_at).toBe(before.last_successful_backup_at);
    expect(after.last_error).toBe(before.last_error);
  });

  it("rejects an unknown id", () => {
    expect(() => setEnabled(db, 9999, true)).toThrow(ValidationError);
  });
});

describe("cloudProviders.recordSuccess", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("sets last_successful_backup_at", () => {
    const p = create(db, BASE_INPUT);
    expect(p.last_successful_backup_at).toBeNull();
    const updated = recordSuccess(db, p.id);
    expect(updated.last_successful_backup_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("clears last_error from a previous failure", () => {
    const p = create(db, BASE_INPUT);
    recordError(db, p.id, "transient network blip");
    expect(get(db, p.id)?.last_error).toBe("transient network blip");
    const updated = recordSuccess(db, p.id);
    expect(updated.last_error).toBeNull();
    expect(updated.last_successful_backup_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("does not change enabled flag", () => {
    const p = create(db, BASE_INPUT);
    setEnabled(db, p.id, false);
    const updated = recordSuccess(db, p.id);
    expect(updated.enabled).toBe(false);
  });

  it("rejects an unknown id", () => {
    expect(() => recordSuccess(db, 9999)).toThrow(ValidationError);
  });
});

describe("cloudProviders.recordError", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("sets last_error to the given message", () => {
    const p = create(db, BASE_INPUT);
    const updated = recordError(db, p.id, "auth token expired");
    expect(updated.last_error).toBe("auth token expired");
    expect(get(db, p.id)?.last_error).toBe("auth token expired");
  });

  it("preserves last_successful_backup_at from prior successes", () => {
    const p = create(db, BASE_INPUT);
    const afterSuccess = recordSuccess(db, p.id);
    const afterError = recordError(db, p.id, "quota exceeded");
    expect(afterError.last_successful_backup_at).toBe(afterSuccess.last_successful_backup_at);
    expect(afterError.last_error).toBe("quota exceeded");
  });

  it("replaces the previous error message", () => {
    const p = create(db, BASE_INPUT);
    recordError(db, p.id, "first");
    const updated = recordError(db, p.id, "second");
    expect(updated.last_error).toBe("second");
  });

  it("rejects an empty message", () => {
    const p = create(db, BASE_INPUT);
    expect(() => recordError(db, p.id, "")).toThrow(ValidationError);
  });

  it("rejects a whitespace-only message", () => {
    const p = create(db, BASE_INPUT);
    expect(() => recordError(db, p.id, "   ")).toThrow(ValidationError);
  });

  it("trims the message", () => {
    const p = create(db, BASE_INPUT);
    const updated = recordError(db, p.id, "  padded  ");
    expect(updated.last_error).toBe("padded");
  });

  it("rejects an unknown id", () => {
    expect(() => recordError(db, 9999, "boom")).toThrow(ValidationError);
  });
});

describe("cloudProviders.delete", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("removes the row", () => {
    const p = create(db, BASE_INPUT);
    deleteCloudProvider(db, p.id);
    expect(get(db, p.id)).toBeUndefined();
  });

  it("is a no-op for an unknown id", () => {
    expect(() => deleteCloudProvider(db, 9999)).not.toThrow();
  });

  it("does not affect siblings", () => {
    const a = create(db, { type: "drive", display_name: "A" });
    const b = create(db, { type: "dropbox", display_name: "B" });
    deleteCloudProvider(db, a.id);
    expect(get(db, a.id)).toBeUndefined();
    expect(get(db, b.id)).toBeDefined();
  });
});
