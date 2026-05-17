# P3-07 — Devices list + single-device endpoints

## Goal
Expose the populated `devices` table to the web UI via JSON endpoints, grouped by location to match the UI's intended layout. This is the bridge between the backend pipeline (p3-01 through p3-06) and the Devices page in p3-08.

## Acceptance criteria
- `GET /api/devices`:
  - Returns an array of location groups: `Array<{ location: { id, name } | null; devices: Device[] }>`.
  - Groups are sorted by `location.name COLLATE NOCASE ASC`, with the `null` ("unassigned") group last.
  - Devices within a group are sorted by `friendly_name COLLATE NOCASE ASC`.
  - Each device object includes the parsed `capabilities` from p3-04 and the derived `online` flag from p3-06.
- `GET /api/devices/:ieeeAddress`:
  - Returns the single device object, including `capabilities` and `online`.
  - 404 with `{ error: "device_not_found", ieeeAddress }` if not in the table.
- New `src/devicesRoutes.ts` exports `registerDevicesRoutes(app, { db })`. Wired into `buildServer` when `opts.db` is present.
- The existing `domain/devices.list` already returns grouped data (`DeviceGroup[]`) — reuse and extend with the `online` field rather than re-implementing.

## Tests
- Empty DB → `[]`.
- Two devices in two locations → two groups with the expected names and ordering.
- Unassigned device → trailing group with `location: null`.
- Single-device endpoint returns 200 for known, 404 for unknown.
- `online` flag uses `ZIGHUB_DEVICE_STALE_MS` correctly (test by setting env in the test).

## Deliverables ticked
- §4 "Devices list grouped by location".

## Notes
- Pagination: skipped for v1 — Zigbee networks are bounded (max ~200 devices) and the JSON payload stays manageable. Add when we have data to argue for it.
- `online` is derived, not stored — recomputed every request from `last_seen_at` and the threshold.
