import type { ZigbeeAdapter } from "../zigbee/index.js";
import type { Action } from "./schema.js";

export interface ActionLogger {
  info: (obj: Record<string, unknown>, msg?: string) => void;
  warn?: (obj: Record<string, unknown>, msg?: string) => void;
  error?: (obj: Record<string, unknown>, msg?: string) => void;
}

export interface ExecutionContext {
  adapter: ZigbeeAdapter;
  logger?: ActionLogger;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

function clampAndRound(value: number, min: number, max: number, step?: number): number {
  let v = Math.max(min, Math.min(max, value));
  if (step !== undefined && step > 0) {
    v = Math.round(v / step) * step;
  }
  return v;
}

export async function executeAction(action: Action, ctx: ExecutionContext): Promise<ActionResult> {
  try {
    switch (action.type) {
      case "toggle":
        await ctx.adapter.sendCommand(action.device, { state: "TOGGLE" });
        return { ok: true };

      case "set_state":
        await ctx.adapter.sendCommand(action.device, { state: action.state });
        return { ok: true };

      case "adjust_brightness": {
        const min = action.min ?? 0;
        const max = action.max ?? 254;
        const brightness = clampAndRound(action.brightness, min, max, action.step);
        await ctx.adapter.sendCommand(action.device, { brightness });
        return { ok: true };
      }

      case "send_notification":
        ctx.logger?.info({ message: action.message }, "notification");
        return { ok: true };

      case "delay":
        if (action.ms > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, action.ms));
        }
        return { ok: true };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export const __testing = { clampAndRound };
