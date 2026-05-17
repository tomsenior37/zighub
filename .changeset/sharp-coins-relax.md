---
"zighub": minor
---

Wire the real `zigbee-herdsman` adapter in behind the `ZigbeeAdapter` seam. The skeleton implements `start`/`stop`/`getStatus` (with cached network parameters); `permitJoin`, `getJoinStatus`, `listJoinedDevices`, and `onEvent` throw `NOT_IMPLEMENTED` until later issues land them. `createZigbeeAdapter(config)` picks the real adapter when `ZIGBEE_ENABLED=1` and a coordinator path + database path are configured; otherwise it falls back to the mock with a warning. Fastify gains a `fastify.zigbee` decorator and a `GET /api/zigbee/status` endpoint that returns the adapter status.
