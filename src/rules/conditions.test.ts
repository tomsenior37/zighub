import { describe, expect, it } from "vitest";
import { conditionsMatch } from "./conditions.js";

const noState = () => undefined;

describe("conditionsMatch", () => {
  it("empty / undefined conditions always match", () => {
    expect(conditionsMatch(undefined, new Date(), noState)).toBe(true);
    expect(conditionsMatch([], new Date(), noState)).toBe(true);
  });

  it("device_state matches when getter returns equal value", () => {
    const get = () => "ON";
    expect(
      conditionsMatch(
        [{ type: "device_state", device: "aa", property: "state", equals: "ON" }],
        new Date(),
        get,
      ),
    ).toBe(true);
    expect(
      conditionsMatch(
        [{ type: "device_state", device: "aa", property: "state", equals: "OFF" }],
        new Date(),
        get,
      ),
    ).toBe(false);
  });

  it("device_state without cache (getter returns undefined) does not match", () => {
    expect(
      conditionsMatch(
        [{ type: "device_state", device: "aa", property: "state", equals: "ON" }],
        new Date(),
        noState,
      ),
    ).toBe(false);
  });

  it("time_window over-day handles wrap-around", () => {
    const at = (h: number, m: number): Date => {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };
    // 09:00-17:00 window
    expect(
      conditionsMatch([{ type: "time_window", from: "09:00", to: "17:00" }], at(10, 0), noState),
    ).toBe(true);
    expect(
      conditionsMatch([{ type: "time_window", from: "09:00", to: "17:00" }], at(8, 0), noState),
    ).toBe(false);
    // wrapped window 22:00-06:00
    expect(
      conditionsMatch([{ type: "time_window", from: "22:00", to: "06:00" }], at(23, 0), noState),
    ).toBe(true);
    expect(
      conditionsMatch([{ type: "time_window", from: "22:00", to: "06:00" }], at(3, 0), noState),
    ).toBe(true);
    expect(
      conditionsMatch([{ type: "time_window", from: "22:00", to: "06:00" }], at(10, 0), noState),
    ).toBe(false);
  });

  it("day_of_week matches today only", () => {
    // 2026-05-18 is a Monday
    const monday = new Date("2026-05-18T10:00:00");
    expect(conditionsMatch([{ type: "day_of_week", days: ["mon"] }], monday, noState)).toBe(true);
    expect(conditionsMatch([{ type: "day_of_week", days: ["tue", "wed"] }], monday, noState)).toBe(
      false,
    );
  });

  it("all conditions must match (AND)", () => {
    const get = () => "ON";
    const monday = new Date("2026-05-18T10:00:00");
    expect(
      conditionsMatch(
        [
          { type: "device_state", device: "aa", property: "state", equals: "ON" },
          { type: "day_of_week", days: ["mon"] },
        ],
        monday,
        get,
      ),
    ).toBe(true);
    expect(
      conditionsMatch(
        [
          { type: "device_state", device: "aa", property: "state", equals: "OFF" },
          { type: "day_of_week", days: ["mon"] },
        ],
        monday,
        get,
      ),
    ).toBe(false);
  });
});
