# P3-06 — Device reachability tracking + ping endpoint

## Goal
Show users which devices are alive. Update `last_seen_at` on every inbound event for a device, expose an active "ping" endpoint that asks the coordinator to talk to the device, and add a derived "online" flag to the device list based on a configurable stale threshold.

## Acceptance criteria
- The bridge (from p3-01/p3-02) updates `devices.last_seen_at` on every `deviceJoined` and `deviceMessage` event using `domain/devices.touchLastSeen` (already exists).
- `ZigbeeAdapter` gains `pingDevice(ieeeAddress: string): Promise<{ ok: boolean; latencyMs?: number }>`:
  - Mock: returns `{ ok: true, latencyMs: 1 }` for known devices (after `simulateDeviceJoin`), `{ ok: false }` otherwise.
  - Herdsman: calls `controller.getDeviceByIeeeAddr(addr)?.ping()` (or the endpoint-level equivalent if `device.ping` is gone in the current version). Wraps errors as `{ ok: false }`. Returns measured latencyMs on success.
- New endpoint `GET /api/devices/:ieeeAddress/ping` returns the result. 404 if device not in DB.
- `domain/devices` adds a derived helper `isOnline(device, staleAfterMs = 5 * 60_000): boolean` returning `true` when `last_seen_at` is within the threshold of now. `list()` results gain an `online: boolean` field.
- Stale threshold is configurable via `ZIGHUB_DEVICE_STALE_MS` env var (default 5 min). Surfaced in the device list response.

## Tests
- After a simulated join, the row's `last_seen_at` is non-null.
- After a simulated message, `last_seen_at` advances.
- `pingDevice` mock returns ok for known IEEE, not-ok for unknown.
- `/api/devices/:addr/ping` returns the result; 404 for unknown.
- `isOnline` true within threshold, false outside.

## Deliverables ticked
- §2 "Device reachability check (ping/last_seen tracking)".

## Notes
- "Ping" in Zigbee is a `genBasic` cluster read; herdsman exposes it. If the SDK version no longer has `Device.ping`, an `endpoint.read('genBasic', ['zclVersion'])` equivalent works.
- The stale threshold is intentionally simple — not all devices send heartbeats. Future work can add per-device override.
