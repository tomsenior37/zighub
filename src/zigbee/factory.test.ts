import { describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { createZigbeeAdapter } from "./factory.js";
import { migrate } from "../db/migrate.js";
import { createSettingsRepo, SETTINGS_KEYS } from "../domain/settings.js";

describe("createZigbeeAdapter", () => {
  it("returns the mock when ZIGBEE_ENABLED is unset", () => {
    const result = createZigbeeAdapter(
      { coordinatorPath: "/dev/ttyUSB0", databasePath: "/tmp/x" },
      { env: {} },
    );
    expect(result.kind).toBe("mock");
  });

  it("returns the mock when ZIGBEE_ENABLED is '0'", () => {
    const result = createZigbeeAdapter(
      { coordinatorPath: "/dev/ttyUSB0", databasePath: "/tmp/x" },
      { env: { ZIGBEE_ENABLED: "0" } },
    );
    expect(result.kind).toBe("mock");
  });

  it("returns the herdsman adapter when ZIGBEE_ENABLED=1 and paths configured", () => {
    const result = createZigbeeAdapter(
      { coordinatorPath: "/dev/ttyUSB0", databasePath: "/tmp/x" },
      { env: { ZIGBEE_ENABLED: "1" } },
    );
    expect(result.kind).toBe("herdsman");
  });

  it("falls back to mock when ZIGBEE_ENABLED=1 but coordinatorPath is missing, and warns", () => {
    const warn = vi.fn();
    const result = createZigbeeAdapter(
      { databasePath: "/tmp/x" },
      { env: { ZIGBEE_ENABLED: "1" }, logger: { warn } },
    );
    expect(result.kind).toBe("mock");
    expect(result.reason).toContain("missing");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("falls back to mock when ZIGBEE_ENABLED=1 but databasePath is missing", () => {
    const result = createZigbeeAdapter(
      { coordinatorPath: "/dev/ttyUSB0" },
      { env: { ZIGBEE_ENABLED: "1" } },
    );
    expect(result.kind).toBe("mock");
  });

  it("falls back to mock with warning when ZIGBEE_ENABLED=1 but no settings + no config coordinator path", () => {
    const warn = vi.fn();
    const result = createZigbeeAdapter(
      { databasePath: "/tmp/x" },
      { env: { ZIGBEE_ENABLED: "1" }, logger: { warn } },
    );
    expect(result.kind).toBe("mock");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("uses the settings-stored coordinator path when config.coordinatorPath is absent", () => {
    const db = new Database(":memory:");
    migrate(db);
    const settings = createSettingsRepo(db);
    settings.set(SETTINGS_KEYS.COORDINATOR_PATH, {
      path: "/dev/ttyACM0",
      selectedAt: Date.now(),
    });

    const result = createZigbeeAdapter(
      { databasePath: "/tmp/x" },
      { env: { ZIGBEE_ENABLED: "1" }, settings },
    );
    expect(result.kind).toBe("herdsman");

    db.close();
  });
});
