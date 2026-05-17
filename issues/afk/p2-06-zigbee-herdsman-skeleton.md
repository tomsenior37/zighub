# P2-06 — zigbee-herdsman real adapter (skeleton, gated by env)

## Goal
Implement a `createHerdsmanAdapter()` that satisfies the `ZigbeeAdapter` interface using `zigbee-herdsman`. For this first slice, only `start()`, `stop()`, and `getStatus()` are required to actually call into herdsman; the other methods (`permitJoin`, `listJoinedDevices`, `onEvent`) can throw `NotImplementedError` until later issues. Gate the real adapter behind `ZIGBEE_ENABLED=1` — otherwise the app uses the mock. This keeps CI hardware-free and makes local dev opt-in.

## Acceptance criteria
- Add `zigbee-herdsman` as a runtime dependency. Pin to the current stable major.
- `src/zigbee/herdsmanAdapter.ts` exports `createHerdsmanAdapter(options: HerdsmanAdapterOptions)` returning a `ZigbeeAdapter`.
  - `HerdsmanAdapterOptions = { coordinatorPath: string; databasePath: string; backupPath?: string; }`.
  - `start()` constructs a `Controller` with sane defaults (channel 11 default, random PAN/key on first start). Wait for `start()` to resolve before returning.
  - `stop()` calls `controller.stop()` and resolves.
  - `getStatus()` returns `{ running, coordinatorPath, panId, channel }` reading current network parameters.
  - Other methods throw a typed `NotImplementedError` with the method name.
- `src/zigbee/factory.ts` exports `createZigbeeAdapter(config)`:
  - If `process.env.ZIGBEE_ENABLED === "1"` AND a coordinator path is configured, return the herdsman adapter.
  - Else, return the mock adapter.
  - This is the single entry point the rest of the app uses.
- App startup wires the adapter into a singleton, started after the Fastify server. The adapter handle is exposed via a Fastify plugin/decorator (`fastify.zigbee`).
- New endpoint `GET /api/zigbee/status` returns `getStatus()` JSON. (For now the only practical way to see the adapter is alive.)
- Tests:
  - `factory.test.ts` covers the env-gated branching (env=0 → mock, env=1+coordinator path → real, env=1 without path → mock with a warn log).
  - `herdsmanAdapter.test.ts` only tests the structural surface (instanceof, NotImplementedError for stubs) — no real coordinator. Use `vi.mock("zigbee-herdsman", ...)` to stub the `Controller` class.
  - Integration test against the Fastify app: `/api/zigbee/status` returns the mock's status when env unset.

## Test plan
- `npm install` succeeds (herdsman is added to deps).
- `npm run typecheck` passes.
- `npm test` passes (no real coordinator touched).
- Manual: with `ZIGBEE_ENABLED=1` unset, `npm run dev` starts and `/api/zigbee/status` returns `{ running: true }` from the mock.

## Deliverables ticked
- §2 "zigbee-herdsman wired in and tested with a real coordinator" — *do not tick yet*; the real-coordinator verification is its own QA artefact. Add a `[~]` note on the bullet stating the skeleton is in place.

## Notes
- zigbee-herdsman is a heavy native dep. If `npm install` requires build tools that CI doesn't have, document the workaround in the PR (e.g. pin a version with prebuilt binaries, or add to `optionalDependencies`).
- Keep the herdsman-specific knowledge contained to `herdsmanAdapter.ts`. The rest of the app should only know about the `ZigbeeAdapter` interface.
- If the herdsman API surface has changed significantly since this issue was drafted, prefer following its current docs over the spec — note the deviation in the PR.
