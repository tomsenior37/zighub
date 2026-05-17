# P3-03 — Live event stream subscription (Server-Sent Events)

## Goal
Expose the adapter's `onEvent` stream to the web UI so the pairing flow, dashboards, and future automations engine can react to device events live. Use Server-Sent Events (SSE) — one-way, simple, no extra deps, works through corporate proxies, and `EventSource` is built into every browser.

## Acceptance criteria
- New endpoint `GET /api/events`:
  - Sets headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`.
  - Writes a `:` comment heartbeat every 15s to keep proxies from killing the connection.
  - Subscribes to the adapter via `adapter.onEvent` on connect, unsubscribes on socket close.
  - Each `ZigbeeEvent` is emitted as an SSE event with `event: zigbee` and `data: <json>` lines. JSON shape mirrors `ZigbeeEvent` (`type`, plus payload fields).
- `src/eventsStream.ts` exports the route registrar and a small `eventStreamFor(adapter)` helper that returns a Node `Readable` for testing.
- Endpoint is registered in `buildServer` when `zigbeeAdapter` is present.
- Concurrency: each connection gets its own handler; closing one client does not affect others.

## Tests
- Connect with `fastify.inject()` using `payloadAsStream: true` (or similar). Trigger `simulateDeviceJoin` on the mock and assert the bytes contain `event: zigbee` and the expected JSON payload.
- Multiple simulated subscribers receive their own copy.
- Disconnect cleanly unsubscribes (subsequent events don't accumulate in a dropped listener — assert via `vi.fn()` and event count after disconnect).

## Deliverables ticked
- §2 "Live event stream subscription (messages, state changes)".

## Notes
- WebSockets are tempting (`@fastify/websocket`) but SSE is simpler and one-way is fine for the device event stream. If we later need client-to-server (e.g. acknowledgements), we can revisit.
- Do NOT broadcast `deviceMessage` payloads that look like raw bytes — for v1 only forward what the adapter emits; future filtering belongs in a separate issue.
- Heartbeat: 15s is conservative for typical proxies; we can tune later.
