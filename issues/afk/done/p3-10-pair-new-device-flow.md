# P3-10 — "Pair new device" flow on the Devices page

## Goal
A button on the Devices page opens a drawer that:
1. Calls `POST /api/network/permit-join` with `durationSec: 120` (default; user-overrideable via a small dropdown).
2. Shows a live countdown driven by `GET /api/network/permit-join` polling at 1 Hz (or via SSE from p3-03 if landed first).
3. Lists newly joined devices as they appear (via SSE subscription to `/api/events`, filtering on `deviceJoined`).
4. On user "Done" or window expiry, closes the drawer and refetches `/api/devices`.

## Acceptance criteria
- `src/web/components/pair/PairDrawer.tsx`:
  - Triggered by a "Pair new device" button on `DevicesPage`.
  - Right-side drawer (Tailwind: fixed, slide-in, click-outside or X to close).
  - Top: countdown ("Pairing window: 1m 53s remaining") + "Stop" button (calls `permit-join` with 0).
  - Middle: live list of joined devices (friendly_name, model, "Rename") — newest first. Empty state: "Waiting for a device — put it in pairing mode now."
  - Bottom: "Done" closes the drawer.
- `src/web/hooks/usePairingSession.ts` orchestrates: opens the window, subscribes to `/api/events`, tracks an in-memory list of devices joined during *this* session, and closes/stops on unmount.
- Closing the drawer stops the SSE subscription cleanly.
- Window auto-closes the drawer when the backend reports `active: false`.
- The "Rename" affordance reuses the inline-edit code from p3-09.

## Tests
- RTL: open the drawer, assert the POST to `permit-join` fires with the default duration. Use `vi.useFakeTimers` to advance the countdown.
- Simulate an SSE `deviceJoined` event → list updates (mock `EventSource` in jsdom or wrap in a thin abstraction the test can swap).
- "Stop" calls `permit-join` with 0 and closes.
- Drawer unmount unsubscribes (no stale handlers).

## Deliverables ticked
- §3.5 "Permit-join toggle with countdown".
- §3.5 "Live list of newly joined devices in a tray".
- §4 "Pairing mode button accessible outside the wizard".

## Notes
- `EventSource` in jsdom doesn't always work cleanly — use a small wrapper (`createEventStream(url): { on, close }`) so tests can swap implementations. Don't import a polyfill into prod code if jsdom is the only issue.
- Auto-fetch of model name from device DB is already on the backend side (p3-04) — this flow just reads what's there.
- Identification (blink/listen) is its own issue, not in this PR.
