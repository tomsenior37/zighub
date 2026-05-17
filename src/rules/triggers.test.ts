import { describe, expect, it } from "vitest";
import type { ZigbeeEvent } from "../zigbee/index.js";
import { triggerMatches } from "./triggers.js";

describe("triggerMatches", () => {
  it("manual trigger never matches via events", () => {
    const event: ZigbeeEvent = { type: "deviceMessage", ieeeAddress: "aa", payload: {} };
    expect(triggerMatches({ type: "manual" }, event)).toBe(false);
  });

  it("device_event matches when device + type align", () => {
    const event: ZigbeeEvent = {
      type: "deviceMessage",
      ieeeAddress: "aa",
      payload: { state: "ON" },
    };
    const t = { type: "device_event" as const, device: "aa", event: "state" };
    expect(triggerMatches(t, event)).toBe(true);
  });

  it("device_event ignores other event types", () => {
    const t = { type: "device_event" as const, device: "aa", event: "state" };
    expect(
      triggerMatches(t, {
        type: "deviceJoined",
        device: { ieeeAddress: "aa", networkAddress: 1 },
      }),
    ).toBe(false);
    expect(triggerMatches(t, { type: "deviceLeft", ieeeAddress: "aa" })).toBe(false);
  });

  it("device_event with payload filter requires every key to match", () => {
    const event: ZigbeeEvent = {
      type: "deviceMessage",
      ieeeAddress: "aa",
      payload: { state: "ON", brightness: 200 },
    };
    expect(
      triggerMatches(
        { type: "device_event", device: "aa", event: "state", payload: { state: "ON" } },
        event,
      ),
    ).toBe(true);
    expect(
      triggerMatches(
        { type: "device_event", device: "aa", event: "state", payload: { state: "OFF" } },
        event,
      ),
    ).toBe(false);
    expect(
      triggerMatches(
        {
          type: "device_event",
          device: "aa",
          event: "state",
          payload: { state: "ON", brightness: 200 },
        },
        event,
      ),
    ).toBe(true);
  });

  it("device_event with wrong device does not match", () => {
    const event: ZigbeeEvent = { type: "deviceMessage", ieeeAddress: "aa", payload: {} };
    expect(triggerMatches({ type: "device_event", device: "bb", event: "state" }, event)).toBe(
      false,
    );
  });
});
