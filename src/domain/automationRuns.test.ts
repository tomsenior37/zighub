import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "../db/migrate.js";
import { create, get } from "./automations.js";
import { list, record } from "./automationRuns.js";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  migrate(db);
});

afterEach(() => {
  db.close();
});

function makeAutomation(name: string) {
  return create(db, { name, source_yaml: "version: 1", generation_method: "manual" });
}

describe("automationRuns.record", () => {
  it("inserts a run and increments the counters atomically", () => {
    const a = makeAutomation("a");
    const run = record(db, {
      automation_id: a.id,
      duration_ms: 42,
      ok: true,
      trigger_summary: { type: "deviceMessage", ieeeAddress: "aa" },
    });

    expect(run.ok).toBe(true);
    expect(run.error).toBeNull();
    expect(run.trigger_summary).toEqual({ type: "deviceMessage", ieeeAddress: "aa" });

    const updated = get(db, a.id);
    expect(updated?.run_count).toBe(1);
    expect(updated?.last_triggered_at).not.toBeNull();
  });

  it("captures error for failed runs", () => {
    const a = makeAutomation("a");
    const run = record(db, {
      automation_id: a.id,
      duration_ms: 7,
      ok: false,
      error: "boom",
      trigger_summary: { type: "manual" },
    });
    expect(run.ok).toBe(false);
    expect(run.error).toBe("boom");
  });
});

describe("automationRuns.list", () => {
  it("returns rows in DESC order capped by limit", () => {
    const a = makeAutomation("a");
    for (let i = 0; i < 5; i++) {
      record(db, {
        automation_id: a.id,
        duration_ms: i,
        ok: true,
        trigger_summary: { i },
      });
    }
    const rows = list(db, a.id, 3);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.duration_ms).toBe(4);
    expect(rows[2]?.duration_ms).toBe(2);
  });

  it("returns empty for an automation with no runs", () => {
    const a = makeAutomation("a");
    expect(list(db, a.id)).toEqual([]);
  });
});
