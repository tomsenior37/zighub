import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "../db/migrate.js";
import { create, promote, type Automation } from "../domain/automations.js";
import { createMockAdapter } from "../zigbee/mockAdapter.js";
import { attachRuleEngine } from "./runner.js";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  migrate(db);
});

afterEach(() => {
  db.close();
});

function makeAutomation(name: string, yaml: string): Automation {
  const created = create(db, { name, source_yaml: yaml, generation_method: "manual" });
  return promote(db, created.id);
}

const SWITCH = "00:11:22:33:44:55:66:77";
const LAMP = "aa:bb:cc:dd:ee:ff:00:01";

const SWITCH_TURNS_LAMP_ON_YAML = `
version: 1
name: Switch turns lamp on
trigger:
  type: device_event
  device: "${SWITCH}"
  event: state
  payload:
    state: ON
actions:
  - type: set_state
    device: "${LAMP}"
    state: ON
`;

describe("rule engine runner", () => {
  it("fires the action when a matching event arrives", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    makeAutomation("switch->lamp", SWITCH_TURNS_LAMP_ON_YAML);

    const engine = attachRuleEngine({ adapter, db });

    adapter.simulateMessage(SWITCH, { state: "ON" });
    // Let microtasks settle
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(adapter.getCommandLog()).toEqual([{ ieeeAddress: LAMP, payload: { state: "ON" } }]);
    engine.detach();
    await adapter.stop();
  });

  it("does not fire disabled automations", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    const created = makeAutomation("disabled", SWITCH_TURNS_LAMP_ON_YAML);
    // Disable it
    db.prepare("UPDATE automations SET state = 'disabled' WHERE id = ?").run(created.id);

    const engine = attachRuleEngine({ adapter, db });
    adapter.simulateMessage(SWITCH, { state: "ON" });
    await new Promise((r) => setImmediate(r));

    expect(adapter.getCommandLog()).toEqual([]);
    engine.detach();
    await adapter.stop();
  });

  it("payload filter prevents firing on unrelated messages", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    makeAutomation("switch->lamp", SWITCH_TURNS_LAMP_ON_YAML);

    const engine = attachRuleEngine({ adapter, db });
    adapter.simulateMessage(SWITCH, { state: "OFF" });
    await new Promise((r) => setImmediate(r));

    expect(adapter.getCommandLog()).toEqual([]);
    engine.detach();
    await adapter.stop();
  });

  it("conditions block execution", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    const yaml = `
version: 1
name: gated
trigger:
  type: manual
conditions:
  - type: device_state
    device: "${SWITCH}"
    property: state
    equals: ON
actions:
  - type: set_state
    device: "${LAMP}"
    state: ON
`;
    const created = makeAutomation("gated", yaml);
    const engine = attachRuleEngine({ adapter, db, getDeviceState: () => "OFF" });
    await engine.fireAutomation(created.id);
    expect(adapter.getCommandLog()).toEqual([]);

    engine.detach();
    await adapter.stop();
  });

  it("manual fire dispatches even without an event", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    const yaml = `
version: 1
name: manual
trigger:
  type: manual
actions:
  - type: toggle
    device: "${LAMP}"
`;
    const created = makeAutomation("manual", yaml);
    const engine = attachRuleEngine({ adapter, db });
    await engine.fireAutomation(created.id);

    expect(adapter.getCommandLog()).toEqual([{ ieeeAddress: LAMP, payload: { state: "TOGGLE" } }]);

    engine.detach();
    await adapter.stop();
  });
});
