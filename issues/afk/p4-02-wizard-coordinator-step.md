# P4-02 — Wizard coordinator step (detect + select)

## Goal
Replace the placeholder Coordinator wizard step with a real one: hit `GET /api/coordinators/detect`, render the ranked candidates, let the user select one (or pick a manual port from the full list), and POST `/api/coordinators/select`. On success, `wizard.markComplete("coordinator")` + `wizard.next()`.

## Acceptance criteria
- `src/web/wizard/steps/CoordinatorStep.tsx`:
  - On mount, fetches detect + ports in parallel via TanStack Query.
  - Renders detected candidates as a list, sorted by confidence (high first), with a "Use this one" button per row. Manufacturer + path shown clearly. Confidence badge ("Recommended" for high, "Best guess" for medium, "Manufacturer match only" for low).
  - "Don't see your coordinator?" expander reveals the full ports list with a "Use" button per port.
  - "Refresh" button refetches both queries.
  - Empty state ("No coordinators found") with a help link.
  - On select success, advances the wizard. On failure, inline error.
- `useDetectedCoordinators()` and `usePorts()` hooks in `src/web/hooks/`.
- The existing `CoordinatorStep` placeholder in `steps/index.tsx` is replaced by an import of the new component.

## Tests
- RTL: with detect returning a high-confidence Sonoff and a low manufacturer-match, both render with the right badges; clicking "Use this one" calls POST `/select` and advances.
- Refresh button triggers a refetch.
- Empty state when both queries return `[]`.

## Notes
- The endpoints (`/api/coordinators/detect`, `/api/coordinators/ports`, `/api/coordinators/select`) all exist from Phase 2. No backend changes.
- Manual override should be possible (any port from the ports list can be selected, even if not in the detect list).
