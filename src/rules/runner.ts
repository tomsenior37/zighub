import type Database from "better-sqlite3";
import { list as listAutomations, type Automation } from "../domain/automations.js";
import { record as recordRun } from "../domain/automationRuns.js";
import type { ZigbeeAdapter, ZigbeeEvent } from "../zigbee/index.js";
import { executeAction, type ActionLogger } from "./actions.js";
import { conditionsMatch, type DeviceStateGetter } from "./conditions.js";
import { parseAutomation } from "./parser.js";
import { triggerMatches } from "./triggers.js";

function summariseEvent(event: ZigbeeEvent | "manual"): Record<string, unknown> {
  if (event === "manual") return { type: "manual" };
  if (event.type === "deviceMessage") {
    return { type: "deviceMessage", ieeeAddress: event.ieeeAddress };
  }
  if (event.type === "deviceJoined") {
    return { type: "deviceJoined", ieeeAddress: event.device.ieeeAddress };
  }
  return { type: "deviceLeft", ieeeAddress: event.ieeeAddress };
}

export interface RuleEngineDeps {
  adapter: ZigbeeAdapter;
  db: Database.Database;
  logger?: ActionLogger & {
    error?: (obj: Record<string, unknown>, msg?: string) => void;
    warn?: (obj: Record<string, unknown>, msg?: string) => void;
  };
  getDeviceState?: DeviceStateGetter;
  now?: () => Date;
}

export interface RuleEngine {
  detach(): void;
  fireAutomation(automationId: number): Promise<void>;
}

export function attachRuleEngine(deps: RuleEngineDeps): RuleEngine {
  const { adapter, db, logger } = deps;
  const getDeviceState = deps.getDeviceState ?? (() => undefined);
  const now = deps.now ?? (() => new Date());
  const inflight = new Map<number, Promise<void>>();

  async function runAutomation(
    automation: Automation,
    event: ZigbeeEvent | "manual",
  ): Promise<void> {
    const parsed = parseAutomation(automation.source_yaml);
    if (!parsed.ok) {
      logger?.warn?.(
        { automationId: automation.id, errors: parsed.errors },
        "automation YAML failed to parse",
      );
      return;
    }
    if (event !== "manual" && !triggerMatches(parsed.doc.trigger, event)) return;
    if (!conditionsMatch(parsed.doc.conditions, now(), getDeviceState)) return;

    const startedMs = Date.now();
    let ok = true;
    let error: string | null = null;

    for (const action of parsed.doc.actions) {
      const result = await executeAction(action, { adapter, ...(logger ? { logger } : {}) });
      if (!result.ok) {
        ok = false;
        error = result.error;
        logger?.warn?.(
          { automationId: automation.id, action: action.type, error: result.error },
          "automation action failed",
        );
        break;
      }
    }

    try {
      const input: Parameters<typeof recordRun>[1] = {
        automation_id: automation.id,
        duration_ms: Date.now() - startedMs,
        ok,
        trigger_summary: summariseEvent(event),
      };
      if (error !== null) input.error = error;
      recordRun(db, input);
    } catch (err) {
      logger?.error?.({ automationId: automation.id, err }, "failed to record run");
    }
  }

  function scheduleRun(automation: Automation, event: ZigbeeEvent | "manual"): Promise<void> {
    const existing = inflight.get(automation.id);
    const next = (existing ?? Promise.resolve()).then(() => runAutomation(automation, event));
    inflight.set(automation.id, next);
    void next.finally(() => {
      if (inflight.get(automation.id) === next) {
        inflight.delete(automation.id);
      }
    });
    return next;
  }

  const handler = (event: ZigbeeEvent): void => {
    try {
      const active = listAutomations(db, { state: "active" });
      for (const a of active) {
        void scheduleRun(a, event).catch((err: unknown) => {
          logger?.error?.({ automationId: a.id, err }, "runner failed");
        });
      }
    } catch (err) {
      logger?.error?.({ err }, "rule engine handler failed");
    }
  };

  const unsubscribe = adapter.onEvent(handler);

  return {
    detach() {
      unsubscribe();
    },
    async fireAutomation(automationId: number): Promise<void> {
      const all = listAutomations(db, {});
      const target = all.find((a) => a.id === automationId);
      if (!target) return;
      await scheduleRun(target, "manual");
    },
  };
}
