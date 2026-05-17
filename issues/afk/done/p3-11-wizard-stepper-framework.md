# P3-11 — Multi-step wizard stepper component

## Goal
Replace the placeholder `/wizard` route with a real multi-step component: progress indicator, next/back navigation, skip support per step, and a state machine that knows which step is current and which are complete. Step contents are still placeholders in this PR — each step's real implementation is a follow-up issue (p3-12 starts with Welcome).

## Acceptance criteria
- `src/web/wizard/`:
  - `WizardShell.tsx`: layout — progress bar at top, step content in the middle, navigation buttons at the bottom.
  - `WizardStepper.tsx`: visual progress (numbered circles + connector lines) showing pending / current / complete states.
  - `useWizard.ts`: hook returning `{ stepIndex, steps, current, next, back, skip, jumpTo, isFirst, isLast, markComplete }`. Backed by a reducer (no external state lib).
  - `steps.tsx`: declares the 5-step list:
    1. `welcome` — "Welcome" (path selection — fresh / restore-local / restore-cloud)
    2. `coordinator` — "Coordinator"
    3. `network` — "Network"
    4. `devices` — "Pair devices"
    5. `complete` — "All done"
  - Each step is a component object: `{ id, title, canSkip: boolean, Component: React.FC<WizardStepProps> }`. For this PR, all step `Component` values are placeholders that just render their title and a "Next" button.
- The `/wizard` route renders `<WizardShell />`. Step navigation updates the URL hash (`#welcome`, `#coordinator`, etc.) so refreshes preserve position.
- Skip is hidden for steps where `canSkip === false` (welcome and complete should NOT be skippable).
- Tailwind styling: same look-and-feel as p2-03 base.

## Tests
- RTL: renders welcome by default; clicking "Next" advances; clicking "Back" returns; "Skip" appears only on skippable steps; URL hash updates.
- Stepper visually marks completed steps after `markComplete()`.

## Deliverables ticked
- §3.1 "Multi-step wizard component with progress indicator" → `[x]` (replaces the partial `[~]`).
- §3.1 "Skip-and-return-later support where appropriate" → `[x]`.

## Notes
- "First-run detection" (§3.1 third bullet) is its own thing — needs DB-backed state from the settings table (`SETTINGS_KEYS.FIRST_RUN_COMPLETE`). That belongs in a follow-up; keep the placeholder `useFirstRun()` for now and add a TODO comment in the file pointing at that future issue.
- Step components live in their own files but are wired only in `steps.tsx` for now. Real implementations land step-by-step.
