# P3-05 — Manual command dispatch (set state, brightness, colour)

## Goal
Let the UI (and tests) send commands to a paired device — toggle a relay, dim a bulb, set colour, etc. — without knowing the underlying Zigbee cluster details. The app speaks the same "set" payload shape that zigbee-herdsman-converters expose (`{ state: "ON", brightness: 128 }`), and the adapter handles the cluster translation.

## Acceptance criteria
- `ZigbeeAdapter` interface gains `sendCommand(ieeeAddress: string, payload: Record<string, unknown>): Promise<{ accepted: boolean; result?: unknown }>`. The payload is the zigbee-herdsman-converters "set" shape, mostly: `{state?: "ON"|"OFF"|"TOGGLE"; brightness?: number; color?: {x,y}|{hex}; color_temp?: number}` plus arbitrary extras passed through.
- Mock adapter: `sendCommand` records every call (exposed via a new `getCommandLog(): Array<{ieeeAddress, payload}>` test helper) and returns `{accepted: true}`.
- Herdsman adapter: looks up the device via `controller.getDeviceByIeeeAddr`. If absent, throws `ZigbeeAdapterError("UNKNOWN_DEVICE", ...)`. Otherwise picks the first non-default endpoint (or the device's `getEndpoint(1)` per herdsman convention) and uses the converters' `toZigbee[i].convertSet(...)` API to push the payload. Errors from herdsman wrap as `ZigbeeAdapterError("COMMAND_FAILED", ...)`.
- New endpoint `POST /api/devices/:ieeeAddress/command`:
  - Body: arbitrary JSON object (schema: `type: object`, `additionalProperties: true`, max 16 keys, max body size 8KB).
  - Returns 200 with `{ accepted, result? }` on success.
  - 404 on `UNKNOWN_DEVICE`, 502 on `COMMAND_FAILED` with `{ error, message }`, 400 on payload too big.
- Audit-log every dispatch: `category: "zigbee"`, `event: "device-command"`, `details: { ieeeAddress, payload }`.

## Tests
- Mock adapter: `sendCommand` returns accepted, `getCommandLog` records the call, the endpoint returns 200.
- 404 when the IEEE address isn't in the devices table.
- 502 when adapter throws COMMAND_FAILED (use a custom mock or a vi.spy).
- Audit log entry appears with the right details.

## Deliverables ticked
- §2 "Manual command dispatch (set state, brightness, colour, etc.)".

## Notes
- We do NOT validate the payload shape against the device's capabilities here — that's a UI-side concern. The backend forwards whatever the caller sends.
- Real-coordinator validation (does the bulb actually turn on?) is out of scope for CI. This is QA.
- If the herdsman-converters API has shifted versions, prefer the current docs; document any deviation in the PR.
