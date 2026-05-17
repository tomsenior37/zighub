import { parse as parseYaml } from "yaml";
import {
  DAYS_OF_WEEK,
  type Action,
  type AutomationDoc,
  type Condition,
  type DayOfWeek,
  type Trigger,
  type ValidationIssue,
} from "./schema.js";

export type ParseResult =
  | { ok: true; doc: AutomationDoc }
  | { ok: false; errors: ValidationIssue[] };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function err(errors: ValidationIssue[], path: string, message: string): void {
  errors.push({ path, message });
}

function validateString(
  value: unknown,
  path: string,
  errors: ValidationIssue[],
  opts: { min?: number; max?: number } = {},
): string | null {
  if (typeof value !== "string") {
    err(errors, path, "must be a string");
    return null;
  }
  if (opts.min !== undefined && value.length < opts.min) {
    err(errors, path, `must be at least ${opts.min.toString()} characters`);
    return null;
  }
  if (opts.max !== undefined && value.length > opts.max) {
    err(errors, path, `must be at most ${opts.max.toString()} characters`);
    return null;
  }
  return value;
}

function validateInteger(
  value: unknown,
  path: string,
  errors: ValidationIssue[],
  opts: { min?: number; max?: number } = {},
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    err(errors, path, "must be an integer");
    return null;
  }
  if (opts.min !== undefined && value < opts.min) {
    err(errors, path, `must be >= ${opts.min.toString()}`);
    return null;
  }
  if (opts.max !== undefined && value > opts.max) {
    err(errors, path, `must be <= ${opts.max.toString()}`);
    return null;
  }
  return value;
}

function validateTrigger(value: unknown, path: string, errors: ValidationIssue[]): Trigger | null {
  if (!isPlainObject(value)) {
    err(errors, path, "must be an object");
    return null;
  }
  const type = value.type;
  if (type === "device_event") {
    const device = validateString(value.device, `${path}.device`, errors, { min: 1, max: 200 });
    const event = validateString(value.event, `${path}.event`, errors, { min: 1, max: 200 });
    let payload: Record<string, unknown> | undefined;
    if (value.payload !== undefined) {
      if (isPlainObject(value.payload)) {
        payload = value.payload;
      } else {
        err(errors, `${path}.payload`, "must be an object when provided");
        return null;
      }
    }
    if (device === null || event === null) return null;
    const t: Trigger = { type: "device_event", device, event };
    if (payload !== undefined) t.payload = payload;
    return t;
  }
  if (type === "manual") {
    return { type: "manual" };
  }
  err(errors, `${path}.type`, `unknown trigger type: ${JSON.stringify(type)}`);
  return null;
}

function validateCondition(
  value: unknown,
  path: string,
  errors: ValidationIssue[],
): Condition | null {
  if (!isPlainObject(value)) {
    err(errors, path, "must be an object");
    return null;
  }
  const type = value.type;
  if (type === "device_state") {
    const device = validateString(value.device, `${path}.device`, errors, { min: 1, max: 200 });
    const property = validateString(value.property, `${path}.property`, errors, {
      min: 1,
      max: 100,
    });
    if (device === null || property === null) return null;
    if (!("equals" in value)) {
      err(errors, `${path}.equals`, "is required");
      return null;
    }
    return { type: "device_state", device, property, equals: value.equals };
  }
  if (type === "time_window") {
    const from = validateString(value.from, `${path}.from`, errors);
    const to = validateString(value.to, `${path}.to`, errors);
    if (from === null || to === null) return null;
    if (!TIME_RE.test(from)) {
      err(errors, `${path}.from`, "must match HH:MM (24h)");
      return null;
    }
    if (!TIME_RE.test(to)) {
      err(errors, `${path}.to`, "must match HH:MM (24h)");
      return null;
    }
    return { type: "time_window", from, to };
  }
  if (type === "day_of_week") {
    if (!Array.isArray(value.days) || value.days.length === 0) {
      err(errors, `${path}.days`, "must be a non-empty array");
      return null;
    }
    const days: DayOfWeek[] = [];
    const rawDays = value.days as unknown[];
    for (let i = 0; i < rawDays.length; i++) {
      const d = rawDays[i];
      if (typeof d !== "string" || !(DAYS_OF_WEEK as readonly string[]).includes(d)) {
        err(errors, `${path}.days[${i.toString()}]`, `must be one of: ${DAYS_OF_WEEK.join(", ")}`);
        return null;
      }
      days.push(d as DayOfWeek);
    }
    return { type: "day_of_week", days };
  }
  err(errors, `${path}.type`, `unknown condition type: ${JSON.stringify(type)}`);
  return null;
}

function validateAction(value: unknown, path: string, errors: ValidationIssue[]): Action | null {
  if (!isPlainObject(value)) {
    err(errors, path, "must be an object");
    return null;
  }
  const type = value.type;
  if (type === "toggle") {
    const device = validateString(value.device, `${path}.device`, errors, { min: 1, max: 200 });
    if (device === null) return null;
    return { type: "toggle", device };
  }
  if (type === "set_state") {
    const device = validateString(value.device, `${path}.device`, errors, { min: 1, max: 200 });
    if (device === null) return null;
    if (value.state !== "ON" && value.state !== "OFF") {
      err(errors, `${path}.state`, 'must be "ON" or "OFF"');
      return null;
    }
    return { type: "set_state", device, state: value.state };
  }
  if (type === "adjust_brightness") {
    const device = validateString(value.device, `${path}.device`, errors, { min: 1, max: 200 });
    const brightness = validateInteger(value.brightness, `${path}.brightness`, errors, {
      min: 0,
      max: 254,
    });
    if (device === null || brightness === null) return null;
    const action: Action = { type: "adjust_brightness", device, brightness };
    if (value.min !== undefined) {
      const min = validateInteger(value.min, `${path}.min`, errors, { min: 0, max: 254 });
      if (min === null) return null;
      action.min = min;
    }
    if (value.max !== undefined) {
      const max = validateInteger(value.max, `${path}.max`, errors, { min: 0, max: 254 });
      if (max === null) return null;
      action.max = max;
    }
    if (value.step !== undefined) {
      const step = validateInteger(value.step, `${path}.step`, errors, { min: 1, max: 254 });
      if (step === null) return null;
      action.step = step;
    }
    return action;
  }
  if (type === "send_notification") {
    const message = validateString(value.message, `${path}.message`, errors, { min: 1, max: 2000 });
    if (message === null) return null;
    return { type: "send_notification", message };
  }
  if (type === "delay") {
    const ms = validateInteger(value.ms, `${path}.ms`, errors, { min: 0, max: 3_600_000 });
    if (ms === null) return null;
    return { type: "delay", ms };
  }
  err(errors, `${path}.type`, `unknown action type: ${JSON.stringify(type)}`);
  return null;
}

export function parseAutomation(yamlText: string): ParseResult {
  const errors: ValidationIssue[] = [];
  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch (e) {
    return {
      ok: false,
      errors: [
        { path: "", message: `invalid YAML: ${e instanceof Error ? e.message : String(e)}` },
      ],
    };
  }

  if (!isPlainObject(raw)) {
    return { ok: false, errors: [{ path: "", message: "top-level value must be an object" }] };
  }

  if (raw.version !== 1) {
    err(errors, "version", "must be 1");
  }

  const name = validateString(raw.name, "name", errors, { min: 1, max: 200 });

  let description: string | undefined;
  if (raw.description !== undefined) {
    const desc = validateString(raw.description, "description", errors, { max: 2000 });
    if (desc !== null) description = desc;
  }

  const trigger = validateTrigger(raw.trigger, "trigger", errors);

  let conditions: Condition[] | undefined;
  if (raw.conditions !== undefined) {
    if (!Array.isArray(raw.conditions)) {
      err(errors, "conditions", "must be an array when provided");
    } else {
      const parsed: Condition[] = [];
      for (let i = 0; i < raw.conditions.length; i++) {
        const c = validateCondition(raw.conditions[i], `conditions[${i.toString()}]`, errors);
        if (c !== null) parsed.push(c);
      }
      if (parsed.length === raw.conditions.length) conditions = parsed;
    }
  }

  let actions: Action[] = [];
  if (!Array.isArray(raw.actions) || raw.actions.length === 0) {
    err(errors, "actions", "must be a non-empty array");
  } else {
    const parsed: Action[] = [];
    for (let i = 0; i < raw.actions.length; i++) {
      const a = validateAction(raw.actions[i], `actions[${i.toString()}]`, errors);
      if (a !== null) parsed.push(a);
    }
    if (parsed.length !== raw.actions.length) {
      // a sub-issue already reported the failures
    } else {
      actions = parsed;
    }
  }

  if (errors.length > 0 || name === null || trigger === null || actions.length === 0) {
    return {
      ok: false,
      errors: errors.length > 0 ? errors : [{ path: "", message: "unknown error" }],
    };
  }

  const doc: AutomationDoc = {
    version: 1,
    name,
    trigger,
    actions,
  };
  if (description !== undefined) doc.description = description;
  if (conditions !== undefined) doc.conditions = conditions;
  return { ok: true, doc };
}
