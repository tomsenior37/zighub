# P2-10 — Manual coordinator selection endpoint

## Goal
Let the user (or the wizard) explicitly choose a coordinator port and persist it. This is the manual fallback when auto-detection from p2-08 doesn't find a match or the user wants to override it.

## Acceptance criteria
- Endpoint `POST /api/coordinators/select`:
  - Body: `{ path: string }`. Validated via Fastify JSON schema (`path` is a non-empty string, max length 256).
  - Verifies the chosen `path` exists in the current `listSerialPorts()` result. Reject 400 with `{ error: "port_not_found" }` if not.
  - Writes `SETTINGS_KEYS.COORDINATOR_PATH` via the settings repo.
  - Returns the persisted selection as JSON: `{ path, selectedAt }`.
- Endpoint `GET /api/coordinators/selected`:
  - Returns `{ path: string; selectedAt: number } | null` (null if nothing is selected yet).
- Tests via `fastify.inject()`:
  - Selecting a valid port persists and returns it.
  - Selecting a non-existent port returns 400 with the expected code.
  - Re-selecting overwrites the previous selection and audit-logs both changes.
  - `GET .../selected` reflects the most recent selection.
- The factory from p2-06 (`createZigbeeAdapter`) is updated:
  - If `process.env.ZIGBEE_ENABLED === "1"` AND a coordinator path is stored in settings, use the herdsman adapter with that path.
  - Else, mock.
  - Add an integration test for this branching.

## Test plan
- `npm test` passes.
- Manual round-trip: `curl -XPOST -H 'Content-Type: application/json' -d '{"path":"/dev/ttyUSB0"}' http://localhost:8282/api/coordinators/select` (with a mocked port-list for the test) returns the persisted record.

## Deliverables ticked
- §2 "Manual coordinator selection fallback"

## Notes
- We are NOT (yet) restarting the zigbee adapter on selection change — that's a separate restart-coordinator workflow and belongs in a later issue. For now the user changing this setting only takes effect on the next app start. Document that limitation in the response payload's docstring.
- Validating that the port is in the current `listSerialPorts()` result is a soft check — a port could disappear between detection and selection. Treat the 400 as "best effort hint" not a hard guarantee.
