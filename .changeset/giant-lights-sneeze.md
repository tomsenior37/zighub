---
"zighub": minor
---

Introduce the `ZigbeeAdapter` seam: a typed interface (`start`, `stop`, `getStatus`, `permitJoin`, `getJoinStatus`, `listJoinedDevices`, `onEvent`) plus an in-memory mock implementation with test helpers (`simulateDeviceJoin`/`Leave`/`Message`). Permit-join uses an injectable `now()` clock so tests can advance time deterministically. This is the seam every feature that touches Zigbee will sit behind, so we can build wizard + device-list flows against the mock before the real `zigbee-herdsman` adapter lands.
