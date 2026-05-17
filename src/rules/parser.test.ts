import { describe, expect, it } from "vitest";
import { parseAutomation } from "./parser.js";

describe("parseAutomation", () => {
  it("parses a minimal manual+toggle doc", () => {
    const result = parseAutomation(`
version: 1
name: Kitchen toggle
trigger:
  type: manual
actions:
  - type: toggle
    device: "00:11:22:33:44:55:66:77"
`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.name).toBe("Kitchen toggle");
      expect(result.doc.trigger.type).toBe("manual");
      expect(result.doc.actions).toHaveLength(1);
    }
  });

  it("parses a device_event trigger + set_state action", () => {
    const result = parseAutomation(`
version: 1
name: Hallway on when switch ON
trigger:
  type: device_event
  device: "aa:bb"
  event: state
  payload:
    state: ON
actions:
  - type: set_state
    device: "cc:dd"
    state: ON
`);
    expect(result.ok).toBe(true);
    if (result.ok && result.doc.trigger.type === "device_event") {
      expect(result.doc.trigger.device).toBe("aa:bb");
      expect(result.doc.trigger.payload).toEqual({ state: "ON" });
    }
  });

  it("rejects missing trigger", () => {
    const result = parseAutomation(`
version: 1
name: X
actions:
  - type: toggle
    device: "aa"
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === "trigger")).toBe(true);
    }
  });

  it("rejects unknown action type", () => {
    const result = parseAutomation(`
version: 1
name: X
trigger:
  type: manual
actions:
  - type: explode
    device: "aa"
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.message).toContain("unknown action type");
    }
  });

  it("rejects brightness above 254", () => {
    const result = parseAutomation(`
version: 1
name: X
trigger:
  type: manual
actions:
  - type: adjust_brightness
    device: "aa"
    brightness: 300
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const issue = result.errors.find((e) => e.path === "actions[0].brightness");
      expect(issue?.message).toContain("<= 254");
    }
  });

  it("rejects malformed time_window", () => {
    const result = parseAutomation(`
version: 1
name: X
trigger:
  type: manual
conditions:
  - type: time_window
    from: 25:00
    to: "10:00"
actions:
  - type: toggle
    device: "aa"
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === "conditions[0].from")).toBe(true);
    }
  });

  it("rejects day_of_week with invalid day", () => {
    const result = parseAutomation(`
version: 1
name: X
trigger:
  type: manual
conditions:
  - type: day_of_week
    days: [mon, funday]
actions:
  - type: toggle
    device: "aa"
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === "conditions[0].days[1]")).toBe(true);
    }
  });

  it("rejects empty actions array", () => {
    const result = parseAutomation(`
version: 1
name: X
trigger:
  type: manual
actions: []
`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === "actions")).toBe(true);
    }
  });

  it("rejects invalid YAML with a parse error", () => {
    const result = parseAutomation("not: : valid");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.message).toContain("invalid YAML");
    }
  });
});
