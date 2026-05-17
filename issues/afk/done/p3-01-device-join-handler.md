# P3-01 — Device join event handler → persist into `devices` table

## Goal
Wire the `ZigbeeAdapter`'s `deviceJoined` event into the existing `devices` domain module so that every device joining the network lands in SQLite as a row. This is the first step in making the Zigbee event stream "real" for the rest of the app.

## Acceptance criteria
- New module `src/zigbeeBridge.ts` exports `attachZigbeeBridge(deps)` taking `{ adapter, db, logger? }` and returning a `detach()` unsubscribe function.
- On `deviceJoined`:
  - Upsert the device into `devices` using `domain/devices.create` semantics:
    - `z2m_id`: the IEEE address.
    - `friendly_name`: defaults to `device_<short>` where `<short>` is the last 6 hex chars of the IEEE address (lowercase, no colons). On `UNIQUE` collision (re-pair of a previously deleted device with same name), append `-N` until unique.
    - `model`: from `device.modelId` (if known on join).
    - `manufacturer`: from `device.manufacturerName` (if known on join).
    - `location_id`: `null`.
  - If the device already exists (same `z2m_id`), update `model`, `manufacturer`, and `last_seen_at = now` (do not change `friendly_name` or `location_id` — they're user-owned).
  - Audit-log every join and every re-join: `category: "zigbee"`, `event: "device-joined"` or `"device-rejoined"`, `details: { ieeeAddress, modelId, manufacturerName }`.
- Bridge is attached in `src/index.ts` after the adapter starts; `detach()` is called during shutdown.
- Errors inside the handler never crash the process — log and continue.

## Implementation notes
- Don't add a new column yet — `last_seen_at` already exists. `capabilities` (full `exposes` JSON) belongs to p3-04.
- The mock adapter's `simulateDeviceJoin` already exists from p2-05 — use it in tests.
- The friendly-name collision retry should be bounded (e.g. give up after 50 attempts with a warning).

## Tests
- New `src/zigbeeBridge.test.ts`:
  - Joining a fresh device inserts a row with the expected default friendly_name (`device_<6 hex>`).
  - Re-joining (same z2m_id) updates `model`/`manufacturer`/`last_seen_at` but preserves user-set `friendly_name` and `location_id`.
  - Audit log entries are written.
  - `detach()` stops the handler — subsequent simulateDeviceJoin events do not touch the DB.
  - Friendly-name collision is resolved by suffixing `-2`, `-3`, etc.

## Deliverables ticked
- §2 "Device join event handler — store in DB with model lookup".

## Notes
- A real herdsman device has more metadata available than the mock currently emits (network address, type, interview state). For now the mock-shaped fields are enough; richer metadata lands as it becomes available from the herdsman adapter.
- Future events (deviceLeft, deviceMessage) will be wired in p3-02 and p3-03 — keep the bridge module structured so adding them is a small edit, not a rewrite.
