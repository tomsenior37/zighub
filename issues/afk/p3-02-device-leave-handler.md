# P3-02 — Device leave / unpair event handler

## Goal
Handle the `deviceLeft` event from the `ZigbeeAdapter` and reflect the unpair in the `devices` table. For v1 we hard-delete the row (mirrors the spec's "unpair device with confirmation" flow) — soft-delete is out of scope. Audit-log the event so we can reconstruct history.

## Acceptance criteria
- Extends the `attachZigbeeBridge()` from p3-01 with a `deviceLeft` handler.
- On `deviceLeft`:
  - If the row exists, hard-delete it (`domain/devices.deleteDevice`).
  - Audit-log: `category: "zigbee"`, `event: "device-left"`, `details: { ieeeAddress, hadRow: true|false, friendlyName?: string }`. Capture the `friendlyName` from the row (if any) before delete so the audit trail is human-readable.
  - If no row existed (we never saw the join), log a warning but still write an audit entry with `hadRow: false`.
- Errors do not crash the process — log and continue.

## Tests
- Joining and then leaving the same device deletes the row.
- Leaving a device we never joined audit-logs `hadRow: false` and does not throw.
- Audit log contains friendlyName for previously-known devices.

## Deliverables ticked
- §2 "Device leave / unpair handler".

## Notes
- `domain/devices.deleteDevice` already exists. No schema change needed.
- "Unpair with confirmation" (UI flow) is a Device Management UI concern (§4); this issue is purely the event-handling side.
