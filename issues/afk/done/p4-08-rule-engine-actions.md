# P4-08 — Action primitives + executor

## Goal
Dispatch actions through the `ZigbeeAdapter`. The executor takes an action and the adapter handle, dispatches the right command (or delays, or notifies), and reports success/failure.

## Acceptance criteria
- `src/rules/actions.ts` exports `executeAction(action: Action, ctx: ExecutionContext): Promise<ActionResult>` where:
  - `ExecutionContext = { adapter: ZigbeeAdapter; logger?: { info, warn, error } }`.
  - `ActionResult = { ok: true } | { ok: false; error: string }`.
- Action handlers:
  - `toggle`: `sendCommand(device, { state: "TOGGLE" })`.
  - `set_state`: `sendCommand(device, { state })`.
  - `adjust_brightness`: clamp to [min ?? 0, max ?? 254], honour step (round to nearest), then `sendCommand(device, { brightness })`.
  - `send_notification`: for v1, just logs at `info` level with the message. Real notifications come with the notification system (out of scope).
  - `delay`: `await new Promise(r => setTimeout(r, action.ms))`.
- Errors from `sendCommand` are caught and returned as `{ ok: false, error }` — never throw out of `executeAction`.
- `src/rules/actions.test.ts`:
  - Each action type with the mock adapter — toggle/set_state/adjust_brightness produce the expected command log entries.
  - adjust_brightness clamping (above max → max, below min → min).
  - adjust_brightness step rounding (step=10, brightness=127 → 130).
  - delay actually waits (use fake timers).
  - send_notification logs.
  - Failed sendCommand returns `{ ok: false }`.

## Notes
- We deliberately skip `set_colour`, `set_colour_temp`, `run_automation` in this issue. The current herdsman adapter only supports `state` + `brightness`; adding colour support means richer cluster handling. Keep follow-up.
