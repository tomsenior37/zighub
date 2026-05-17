# P4-07 — Trigger evaluation framework

## Goal
Decide whether a given Zigbee event matches an automation's trigger. This is the gate that decides "should we evaluate this automation right now?". Pure functions, no DB or adapter — just trigger matching logic.

## Acceptance criteria
- `src/rules/triggers.ts` exports:
  - `triggerMatches(trigger: Trigger, event: ZigbeeEvent): boolean`.
  - Handles `device_event` triggers: matches when `event.type === "deviceMessage"` AND `event.ieeeAddress === trigger.device`. If `trigger.payload` is provided, every key/value pair must match the message payload (shallow equality).
  - Handles `manual` triggers: always returns `false` (manual triggers fire only via the test-fire endpoint, not from the event stream).
- `src/rules/triggers.test.ts`:
  - device_event matches when device + message match.
  - device_event with payload filter requires the payload keys to match.
  - device_event ignores deviceJoined / deviceLeft events.
  - manual trigger never matches via events.

## Notes
- Future: more trigger types (`time_of_day`, `sun_event`, `state_change` with from→to). For v1 we cover the minimum needed to demo "switch turns on lamp".
- Friendly name vs IEEE: trigger.device is the IEEE address (per p4-06 decision). The UI will translate friendly names to IEEE before saving the YAML.
