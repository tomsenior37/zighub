# P2-12 — Permit-join window management

## Goal
Open and close the "permit join" window on the coordinator so users can pair new devices, with a server-side countdown that auto-closes after the requested duration. This is the gate for the wizard's device-pairing step.

## Acceptance criteria
- `ZigbeeAdapter.permitJoin(durationSec)` and `getJoinStatus()` (already in the interface from p2-05) are now expected to actually function on the mock adapter.
  - Mock implementation:
    - `permitJoin(60)` sets `active: true`, `remainingSec: 60`. A scheduler (using the injected `now()` clock) decrements remaining and flips active to false when it hits 0.
    - `permitJoin(0)` immediately stops the window.
    - Calling `permitJoin(n)` while already active resets the countdown to `n`.
    - Maximum allowed duration is 255 seconds (Zigbee spec). Larger values reject with a typed error.
- Herdsman adapter implements `permitJoin` by calling `controller.permitJoin(time)` (or current API equivalent) and `getJoinStatus` from the controller state. The countdown source of truth on the real adapter is herdsman's own state; the mock simulates it.
- Endpoints:
  - `POST /api/network/permit-join` body `{ durationSec: number }`. Validates 0 ≤ durationSec ≤ 255.
  - `GET /api/network/permit-join` returns `{ active, remainingSec }`.
- Audit log entries for every permit-join open/close, with duration captured.
- Tests:
  - Mock adapter with fake clock: open for 60s → after 30s tick, remaining=30; after 60s tick, active=false.
  - Re-opening resets the timer.
  - `permitJoin(0)` closes immediately.
  - `permitJoin(300)` rejects with `INVALID_DURATION`.
  - Endpoint round-trip via `fastify.inject()`.

## Test plan
- `npm test` passes.
- Manual: `curl -XPOST -H 'Content-Type: application/json' -d '{"durationSec":60}' http://localhost:8282/api/network/permit-join`; `GET .../permit-join` shows decreasing `remainingSec`.

## Deliverables ticked
- §2 "Permit-join window management (enable, disable, countdown)"

## Notes
- The 255-second cap is a Zigbee spec limit. If the wizard needs longer windows it should re-open the window — don't try to work around the spec.
- The mock's clock is `() => Date.now()` by default; tests inject a controllable function. Keep the production code path simple.
- Do not actually trigger `deviceJoined` events from the mock during permit-join unless explicitly told via `simulateDeviceJoin` (from p2-05). The window being open doesn't manufacture devices.
