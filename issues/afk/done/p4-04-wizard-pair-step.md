# P4-04 — Wizard pair-devices step (inline PairDrawer)

## Goal
Real Pair-devices step: open the permit-join window, show the live joiner list, let the user rename joined devices inline, and provide "Done — pair more later" + "Continue" CTAs. Reuses the same hooks as the `PairDrawer` (p3-10) but renders inline (no drawer chrome).

## Acceptance criteria
- `src/web/wizard/steps/PairStep.tsx`:
  - Snapshots baseline devices on mount (same approach as PairDrawer).
  - Auto-opens permit-join for 120s. Shows countdown + Stop button.
  - Live list of session joiners with the inline rename affordance from p3-09 (reuse `DeviceCard`'s edit form or a slimmer variant).
  - "Re-open window" button when window expires.
  - "Continue" advances the wizard. "Skip — I'll pair later" also advances (this step is `canSkip: true`).
- On unmount (wizard advances away), the permit-join window is closed.
- Reuses `usePermitJoinStatus`, `useStartPermitJoin`, `useDevices`.

## Tests
- RTL: opens the window on mount; mocked SSE/fetched joiner appears in the list; clicking Continue advances; unmounting calls POST with `durationSec: 0`.

## Notes
- The actual "identification" UX (blink-or-listen) from §3.6 is a separate issue — for this step we just list joiners and let the user rename. Per-device control (blink) comes later.
