# P2-07 — USB serial port enumeration

## Goal
List the USB serial devices currently attached to the host so the user (or auto-detection in p2-08) can pick a Zigbee coordinator. Expose this via a backend endpoint and a typed module.

## Acceptance criteria
- Add `serialport` as a runtime dependency (use `@serialport/bindings-cpp` or whatever the current Node 22 stable surface recommends).
- `src/coordinator/serialPorts.ts`:
  - Exports `listSerialPorts(): Promise<SerialPortInfo[]>`.
  - `SerialPortInfo = { path: string; manufacturer?: string; serialNumber?: string; vendorId?: string; productId?: string; pnpId?: string; }`.
  - Wraps `SerialPort.list()` and normalises vendor/product IDs to lowercase hex strings without `0x` prefix (so they match the VID/PID table from p2-08 cleanly).
- Endpoint `GET /api/coordinators/ports` returns `SerialPortInfo[]` as JSON.
- Tests:
  - Unit test for the lowercase-hex normalisation (mock `SerialPort.list` to return uppercase/with-prefix values, assert clean output).
  - Integration test via `fastify.inject()` hitting `/api/coordinators/ports` (mock the SerialPort module to return a fixture).

## Test plan
- `npm install` succeeds.
- `npm run typecheck` passes.
- `npm test` passes.
- Manual: `curl http://localhost:8282/api/coordinators/ports` returns an array on a host with no Zigbee devices.

## Deliverables ticked
- §2 "USB serial port enumeration"

## Notes
- `serialport` is another native dep — same caveats as herdsman about prebuilt binaries. Document any CI workarounds in the PR.
- This endpoint is read-only and safe to call without auth — it just lists hardware. Auth comes later.
