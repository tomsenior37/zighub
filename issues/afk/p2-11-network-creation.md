# P2-11 — Network creation (random PAN ID + network key)

## Goal
Allow the user (or wizard) to create a fresh Zigbee network on the selected coordinator. This means generating a random PAN ID, channel, and network key, then handing them to the adapter. For now the mock adapter is the primary target — the real herdsman adapter accepts the same call but only fully validates the parameters; the actual coordinator-side `createNetwork` call lands in a follow-up if zigbee-herdsman doesn't already do this on `start()`.

## Acceptance criteria
- Extend `ZigbeeAdapter` interface (from p2-05) with:
  - `createNetwork(opts: { channel?: number; panId?: number; networkKey?: Uint8Array }): Promise<NetworkInfo>`
  - `getNetworkInfo(): NetworkInfo | null`
  - `NetworkInfo = { panId: number; channel: number; extendedPanId: string; networkKeyHash: string; createdAt: number }`
  - `networkKeyHash` is a SHA-256 hex digest of the raw key — the raw key itself never leaves the adapter for safety.
- Mock adapter implements both methods, with auto-generated random PAN ID and key when not provided.
- Herdsman adapter:
  - `createNetwork` validates `channel` (11-26) and `panId` (1-0xfffe) and stores the params for use on next `start()` (real network creation is driven by herdsman's `Controller` settings, which means we may need to stop+restart with new params — that's fine, document it in a TODO and leave the actual restart to a follow-up).
- Endpoint `POST /api/network/create` accepts `{ channel?: number; panId?: number }` (no raw key over the wire — always generated server-side) and returns `NetworkInfo`.
- Endpoint `GET /api/network` returns the current `NetworkInfo | null`.
- Network info is persisted via the settings repo under `SETTINGS_KEYS.NETWORK_INFO`. On app start, if a network exists in settings, `getNetworkInfo()` reflects it.
- Tests:
  - Mock adapter: createNetwork → returns NetworkInfo with random PAN ID in valid range, random 16-byte key (asserted via the hash being a 64-char hex string), persists.
  - Mock adapter: createNetwork with explicit channel/panId → returns those exact values.
  - Endpoint: validates channel/panId ranges; rejects 400 on out-of-range.
  - Endpoint: `GET /api/network` returns null before creation, the NetworkInfo after.

## Test plan
- `npm test` passes.
- Manual: with the mock adapter, `curl -X POST http://localhost:8282/api/network/create -H 'Content-Type: application/json' -d '{}'` returns a NetworkInfo; subsequent `GET /api/network` returns the same.

## Deliverables ticked
- §2 "Network creation (new random PAN ID, network key)"

## Notes
- Use Node's `crypto.randomBytes(16)` for the network key, and `crypto.randomInt` for PAN ID. Default channel = 15 (good 2.4GHz channel away from common WiFi).
- The real network creation against actual hardware is gated by herdsman's behaviour on `start()` — the herdsman adapter `createNetwork` may just buffer the params. Document this clearly so the wizard knows when the network actually exists on the coordinator.
- Never log the raw network key. Only the hash.
