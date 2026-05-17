import type { ZigbeeEvent } from "../zigbee/index.js";
import type { Trigger } from "./schema.js";

export function triggerMatches(trigger: Trigger, event: ZigbeeEvent): boolean {
  if (trigger.type === "manual") {
    return false;
  }
  if (trigger.type === "device_event") {
    if (event.type !== "deviceMessage") return false;
    if (event.ieeeAddress !== trigger.device) return false;
    if (trigger.payload !== undefined) {
      for (const [key, expected] of Object.entries(trigger.payload)) {
        if (event.payload[key] !== expected) return false;
      }
    }
    return true;
  }
  return false;
}
