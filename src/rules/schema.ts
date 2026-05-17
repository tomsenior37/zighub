export interface ValidationIssue {
  path: string;
  message: string;
}

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type Trigger =
  | {
      type: "device_event";
      device: string;
      event: string;
      payload?: Record<string, unknown>;
    }
  | { type: "manual" };

export type Condition =
  | {
      type: "device_state";
      device: string;
      property: string;
      equals: unknown;
    }
  | { type: "time_window"; from: string; to: string }
  | { type: "day_of_week"; days: DayOfWeek[] };

export type Action =
  | { type: "toggle"; device: string }
  | { type: "set_state"; device: string; state: "ON" | "OFF" }
  | {
      type: "adjust_brightness";
      device: string;
      brightness: number;
      min?: number;
      max?: number;
      step?: number;
    }
  | { type: "send_notification"; message: string }
  | { type: "delay"; ms: number };

export interface AutomationDoc {
  version: 1;
  name: string;
  description?: string;
  trigger: Trigger;
  conditions?: Condition[];
  actions: Action[];
}

export const DAYS_OF_WEEK: readonly DayOfWeek[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
