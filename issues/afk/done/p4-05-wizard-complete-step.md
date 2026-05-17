# P4-05 — Wizard completion step (summary + persist first-run)

## Goal
Real Complete step: show a summary of what was set up (coordinator path, network params, device count, location count), persist `SETTINGS_KEYS.FIRST_RUN_COMPLETE = true`, and CTA the user to either "Create your first automation" or "Go to dashboard". After this step, the wizard nav link disappears (p4-01 wires this).

## Acceptance criteria
- `src/web/wizard/steps/CompleteStep.tsx`:
  - Pre-loads `GET /api/coordinators/selected`, `GET /api/network`, `GET /api/devices`, `GET /api/locations` in parallel.
  - Renders a summary block:
    - Coordinator: friendly name + path
    - Network: pan ID hex + channel
    - X devices paired across Y locations
  - "Finish setup" CTA POSTs to a new endpoint `POST /api/setup-state` with `{ firstRunComplete: true }`. On success: invalidate `["setup-state"]`, navigate to `/devices`.
- New backend endpoint `POST /api/setup-state` body `{ firstRunComplete: boolean }`. Persists via the settings repo, audit-logged.
- Existing `GET /api/setup-state` from p4-01 reflects the new state.

## Tests
- Backend: POST sets the flag, audit-logged; GET returns true after.
- RTL: summary shows the mocked-fetched values; "Finish setup" POSTs and navigates (use `useNavigate` mocked).

## Notes
- Don't try to validate "did the user actually complete everything" — trust them. If they skipped pair-devices, the summary just shows "0 devices paired" with friendly copy ("You can pair devices any time from the Devices page").
