# P2-05 — `ZigbeeAdapter` interface + in-memory mock

## Goal
Define the seam between zighub's application code and the underlying Zigbee stack. Everything app-level — coordinator detection, network creation, permit-join, device events, manual commands — goes through a `ZigbeeAdapter` interface. Ship the interface and a deterministic in-memory mock implementation. This unblocks Phase 2 by letting us build features against the seam before the real zigbee-herdsman wiring is in.

## Acceptance criteria
- `src/zigbee/adapter.ts` exports the `ZigbeeAdapter` interface. Methods (initial set — additions will follow in later issues):
  - `start(): Promise<void>`
  - `stop(): Promise<void>`
  - `getStatus(): { running: boolean; coordinatorPath?: string; panId?: number; channel?: number }`
  - `permitJoin(durationSec: number): Promise<void>` (durationSec=0 stops permit-join)
  - `getJoinStatus(): { active: boolean; remainingSec: number }`
  - `listJoinedDevices(): Promise<ZigbeeJoinedDevice[]>` where `ZigbeeJoinedDevice = { ieeeAddress: string; modelId?: string; manufacturerName?: string; networkAddress: number; lastSeen?: number }`
  - `onEvent(handler: (event: ZigbeeEvent) => void): () => void` returns an unsubscribe function. `ZigbeeEvent` is a discriminated union: `{ type: "deviceJoined"; device: ZigbeeJoinedDevice }`, `{ type: "deviceLeft"; ieeeAddress: string }`, `{ type: "deviceMessage"; ieeeAddress: string; payload: Record<string, unknown> }`.
- `src/zigbee/mockAdapter.ts` exports a `createMockAdapter()` factory implementing the interface. The mock:
  - Starts/stops cleanly; multiple start calls reject if already started.
  - Supports a `simulateDeviceJoin(...)` test helper that emits a `deviceJoined` event and adds the device to the joined list.
  - Supports a `simulateDeviceLeave(ieeeAddress)` test helper.
  - Supports a `simulateMessage(ieeeAddress, payload)` test helper.
  - Permit-join countdown advances in test-controllable time (inject a `now()` clock function).
- `src/zigbee/index.ts` re-exports the interface, the types, and the mock factory.
- Unit tests (`src/zigbee/mockAdapter.test.ts`) cover:
  - Lifecycle start/stop.
  - Permit-join enables and expires correctly with a fake clock.
  - `simulateDeviceJoin` fires `deviceJoined` and shows up in `listJoinedDevices`.
  - Multiple handlers receive events; unsubscribe stops a specific handler without affecting others.
- TypeScript strict: no `any`, no `unknown` leaks (payload from `deviceMessage` is `Record<string, unknown>` — that is fine and intentional).

## Test plan
- `npm run typecheck` passes.
- `npm test src/zigbee` runs the new tests and passes.
- The interface is small enough that the entire mock implementation is < 200 lines.

## Deliverables ticked
None directly — this is the seam for §2 ("Zigbee Stack Integration"). Specific deliverable items get ticked as the real adapter lands them in p2-06 onwards.

## Notes
- Do NOT install zigbee-herdsman yet. This issue is interface-only — pulling the heavy native dep belongs in p2-06.
- The mock will become the basis for integration tests of the wizard, device list, and rule engine — keep the API ergonomic for that purpose.
- Future issues will add `createNetwork`, `selectCoordinator`, `sendCommand`, etc. Keep the interface evolution additive.
