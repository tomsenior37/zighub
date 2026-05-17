# P3-12 — Wizard Welcome step (path selection)

## Goal
Replace the placeholder Welcome step in the wizard with the real path-selection screen described in `project/project_scope.md §6.1`: three big choices — fresh setup, restore from local backup, restore from cloud. Only "Fresh setup" actually proceeds in this PR; the restore paths display a "Coming soon" placeholder and let the user back out.

## Acceptance criteria
- `src/web/wizard/steps/WelcomeStep.tsx`:
  - Heading + short paragraph explaining what the wizard does.
  - Three large card-buttons (`<button>`s styled as cards): "Set up a new network", "Restore from local backup", "Restore from a cloud backup".
  - Each card has a one-line description.
  - Clicking "Set up a new network" calls `wizard.markComplete("welcome")` + `wizard.next()`.
  - Clicking either restore option opens an inline "Coming soon" callout in place of the cards, with a "Back to options" button — no navigation away.
- Welcome step is marked `canSkip: false` in `steps.tsx` (already locked in p3-11).
- Help links to the (still-to-be-built) docs: `/help/setup`, `/help/restore` — these are placeholder anchors with `aria-disabled="true"` and a tooltip "Coming soon" for now. Add a comment referencing the future docs issue.

## Tests
- RTL: three cards render; clicking "fresh" advances; clicking "restore local" shows the inline callout, not navigation; "Back to options" returns; "fresh" path eventually advances the wizard.

## Deliverables ticked
- §3.2 "Three paths offered: fresh, restore from local, restore from cloud" (UI scaffolding — restore is stubbed).
- §3.2 "Help links / explanations of each path" (cards have descriptions; doc links stubbed).

## Notes
- The restore flows are NOT functional in this PR — they're stubs. The full restore flow needs the backup/restore backend (§7), which is post-Phase-3 work.
- Keep this step purely presentational. Wizard state transitions go through the `useWizard` hook from p3-11.
