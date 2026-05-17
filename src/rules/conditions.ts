import { DAYS_OF_WEEK, type Condition, type DayOfWeek } from "./schema.js";

export type DeviceStateGetter = (ieeeAddress: string, property: string) => unknown;

function inTimeWindow(now: Date, from: string, to: string): boolean {
  const [fh, fm] = from.split(":").map((s) => Number.parseInt(s, 10));
  const [th, tm] = to.split(":").map((s) => Number.parseInt(s, 10));
  if (fh === undefined || fm === undefined || th === undefined || tm === undefined) {
    return false;
  }
  const minutes = now.getHours() * 60 + now.getMinutes();
  const fromMin = fh * 60 + fm;
  const toMin = th * 60 + tm;
  if (fromMin <= toMin) {
    return minutes >= fromMin && minutes < toMin;
  }
  return minutes >= fromMin || minutes < toMin;
}

function todayOfWeek(now: Date): DayOfWeek {
  return DAYS_OF_WEEK[(now.getDay() + 6) % 7] ?? "mon";
}

export function conditionsMatch(
  conditions: Condition[] | undefined,
  now: Date,
  getDeviceState: DeviceStateGetter,
): boolean {
  if (!conditions || conditions.length === 0) return true;
  for (const c of conditions) {
    if (c.type === "device_state") {
      const value = getDeviceState(c.device, c.property);
      if (value !== c.equals) return false;
    } else if (c.type === "time_window") {
      if (!inTimeWindow(now, c.from, c.to)) return false;
    } else if (c.type === "day_of_week") {
      if (!c.days.includes(todayOfWeek(now))) return false;
    }
  }
  return true;
}
