# P4-12 — Automations page UI: list + YAML editor + promote

## Goal
Replace the placeholder Automations page with a real one: list automations grouped by state (draft / active / disabled), a "+ New automation" CTA that opens a YAML editor modal, and per-row promote / disable / delete actions. After this issue the user can write a YAML, save it as a draft, promote it, watch it fire on the next matching event, and see the run history.

## Acceptance criteria
- `src/web/pages/AutomationsPage.tsx`:
  - Three sections (Drafts / Active / Disabled), each rendering a list of automation cards.
  - Each card shows name, plain-English summary (derive from parsed YAML — fall back to "Could not summarise" on parse error), state badge, `last_triggered_at` (when present), and run_count.
  - Per-card actions:
    - Drafts: Edit / Promote / Delete (with confirm)
    - Active: View / Disable / Edit (creates a new draft of the same automation — for v1 just opens the editor with the source pre-filled)
    - Disabled: Enable / Edit / Delete
  - "+ New automation" button opens the editor modal in create mode.
- `src/web/components/automations/AutomationEditor.tsx`:
  - Modal (Tailwind-only) with name input, description textarea, YAML textarea (monospace font, large). Inline "Save as draft" + "Cancel".
  - On save, POST or PUT; on validation error, display the issue list under the YAML field.
- `src/web/components/automations/RunHistoryDrawer.tsx`:
  - Per-row "History" button opens a right-side drawer with the last 20 runs (timestamp, ok/error, duration).
- New hooks: `useAutomations`, `useAutomation(id)`, `useCreateAutomation`, `useUpdateAutomation`, `usePromote`, `useDisable`, `useEnable`, `useDeleteAutomation`, `useAutomationRuns`.
- Tests:
  - RTL: list renders three sections; clicking "+ New" opens the editor; submitting valid YAML adds a draft.
  - 400 from the backend renders the issue list inline (don't close the modal).
  - Promote moves a draft to active (mock + assert refetch invalidations).

## Notes
- No syntax highlighting on the YAML editor for v1 — plain `<textarea>` is fine. Adding a code editor (codemirror, monaco) is a follow-up.
- Plain-English summary: a small renderer in `src/web/lib/summariseAutomation.ts` that takes the parsed doc and returns something like "When kitchen-switch sends state ON, toggle hallway-lamp." Best-effort; full localisation is out of scope.
- The visual builder (§6.1) is a *separate* future feature — this PR ships the manual YAML path.
