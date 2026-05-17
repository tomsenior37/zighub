# P2-08 — Coordinator auto-detection by USB VID/PID

## Goal
Given the list of serial ports from p2-07, identify which (if any) are known Zigbee coordinators by USB VID/PID. Return a ranked list of candidates so the wizard can offer "Found X on port Y — use this?" with a sensible default.

## Acceptance criteria
- `src/coordinator/knownCoordinators.ts`:
  - Exports `KNOWN_COORDINATORS: KnownCoordinator[]`.
  - `KnownCoordinator = { vendorId: string; productId: string; displayName: string; family: string; }` (`family` groups variants of the same physical product).
  - Includes at least:
    - Sonoff ZBDongle-E (Silabs EFR32MG21, VID `10c4`, PID `ea60`).
    - Sonoff ZBDongle-P (CC2652P, VID `1a86`, PID `55d4`).
    - ConBee II (VID `1cf1`, PID `0030`).
    - ConBee III (VID `1cf1`, PID `0033`).
    - Slaeshs CC2652RB stick (VID `10c4`, PID `ea60`) — overlaps with ZBDongle-E; rely on `manufacturer` to disambiguate where possible.
  - VIDs/PIDs stored lowercase, no prefix, matching the normalisation from p2-07.
- `src/coordinator/detect.ts`:
  - Exports `detectCoordinators(ports: SerialPortInfo[]): DetectedCoordinator[]` and `detectCoordinators()` overload that calls `listSerialPorts()` internally.
  - `DetectedCoordinator = SerialPortInfo & { match: KnownCoordinator | null; confidence: "high" | "medium" | "low" }`.
  - Confidence: VID+PID match = `high`; VID match with unknown PID = `medium`; only manufacturer string heuristic match = `low`.
  - Filters out clearly non-coordinator devices (Bluetooth dongles, printers, mice) by an explicit blocklist of `(vid, pid)` pairs — keep it short, document each entry.
  - Output is sorted by confidence descending, then by `path` ascending.
- Endpoint `GET /api/coordinators/detect` returns `DetectedCoordinator[]`.
- Tests:
  - Fixture-driven: given a list of ports, assert the expected matches (Sonoff E → high, unknown VID → null + filtered/empty).
  - Edge cases: empty ports list → empty array; blocklisted device → filtered out.

## Test plan
- `npm test` passes.
- Manual: with a Sonoff dongle plugged in (if available), `/api/coordinators/detect` returns one entry with `confidence: "high"`.

## Deliverables ticked
- §2 "Coordinator auto-detection by USB VID/PID (Sonoff Dongle-E, ConBee II/III, Slaeshs CC2652, others)"

## Notes
- The VID/PID list is intentionally seed-level. New coordinators can be added in future issues without changing the detection algorithm.
- Do NOT try to probe the device with serial commands here — VID/PID is enough for v1 auto-detect. Probing belongs to coordinator selection / network creation later.
