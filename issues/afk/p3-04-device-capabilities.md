# P3-04 — Device capability extraction from `definition.exposes`

## Goal
When a device joins, pull its capability descriptor (`definition.exposes` from the herdsman device database) and persist it on the device row so the UI can render the right controls (toggle for relays, dimmer slider for bulbs, colour picker for colour bulbs, read-only state for sensors).

## Acceptance criteria
- New migration `0009_device_capabilities.sql` adds a `capabilities TEXT NULL` column to `devices` (JSON-encoded blob — `null` until the device is identified).
- `domain/devices.ts`:
  - `Device` type gains `capabilities: Record<string, unknown>[] | null` (decoded on read).
  - New helper `setCapabilities(db, z2mId, capabilities | null)` writes the JSON.
  - Existing `create`, `get`, `list` return the parsed value.
- `ZigbeeAdapter` interface gains `getDeviceDefinition(ieeeAddress: string): Promise<DeviceDefinition | null>` where `DeviceDefinition = { modelId?: string; manufacturerName?: string; exposes: Record<string, unknown>[] }`. Mock returns whatever was passed via a new `simulateDefinition(ieeeAddress, def)` helper (default `null`). Herdsman adapter wraps `controller.getDeviceByIeeeAddr(addr)?.definition`.
- `zigbeeBridge` (from p3-01): on `deviceJoined` (or re-join), after upserting the row, call `getDeviceDefinition()` and call `setCapabilities()` with the result. Failures are logged but never block the event.

## Tests
- Mock adapter: `simulateDefinition` then `simulateDeviceJoin` → row's `capabilities` matches the simulated `exposes`.
- Reading the device back via `domain.devices.get` returns the parsed `capabilities` array.
- `setCapabilities(z2mId, null)` clears the column.
- Herdsman adapter test: `getDeviceDefinition` calls `getDeviceByIeeeAddr` and returns the `definition` field; `null` when the device is unknown.

## Deliverables ticked
- §2 "Device capability extraction from `definition.exposes`".

## Notes
- `definition.exposes` is an opaque JSON shape from herdsman's device database (`zigbee-herdsman-converters`). For v1 we store it verbatim; the UI in §4 will parse and render. Don't try to normalise here.
- Adding `getDeviceDefinition` to the interface affects the mock too — the mock adapter gets a tiny new helper.
