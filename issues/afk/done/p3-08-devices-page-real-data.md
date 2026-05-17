# P3-08 — Devices page rendering real data

## Goal
Replace the placeholder Devices page with a real view that fetches `GET /api/devices` via TanStack Query, renders groups by location with device cards, and shows a sensible empty state when no devices are paired yet.

## Acceptance criteria
- `src/web/pages/DevicesPage.tsx`:
  - Uses `useQuery` (TanStack) keyed on `["devices"]` to fetch `/api/devices`.
  - Loading state: simple "Loading devices…" placeholder.
  - Error state: a "Could not load devices. Retry" with a retry button (triggers `refetch`).
  - Empty state (no devices yet): friendly call-to-action pointing to the wizard or the (still-to-be-built) "Pair new device" button.
  - Populated state: one `<section>` per location with `<h2>` for the location name (or "Unassigned" for the `null` group). Inside, a list of device cards.
  - Device card shows: friendly name (h3), `model` and `manufacturer` (small text), `online` badge (green/grey), last-seen relative time (e.g. "2m ago" — use a tiny inline helper, no `date-fns` dep).
- New hook `src/web/hooks/useDevices.ts` wraps the query for reuse. Exports `useDevices()` and a `Device` / `DeviceGroup` type (shared with the backend if practical, or hand-rolled).
- Components live in `src/web/components/devices/`: `DeviceCard.tsx`, `LocationGroup.tsx`, `EmptyDevices.tsx`.
- Network requests use a single `fetcher.ts` helper (`getJson<T>(path)`) so future requests don't duplicate fetch logic. Throws on non-2xx with a typed `ApiError`.

## Tests
- RTL test: render `DevicesPage` with a mocked fetch returning two groups → asserts both location headings + four device cards.
- Empty fetch result → empty state heading.
- Failing fetch → error state with retry button.
- Test setup wires a `QueryClient` per test to avoid cross-test cache leaks.

## Deliverables ticked
- §4 "Devices list grouped by location" (UI portion — backend ticked in p3-07).
- §4 "Per-device card showing state, capabilities, last-seen" — partial (state + capabilities preview comes when interactive controls land in a follow-up).

## Notes
- No interactive controls (toggle / dim / unpair) in this PR — those are p3-09 (rename + location) and follow-ups for toggle / dim.
- Keep the layout boring: vertical scroll, single column on narrow screens, two columns over 720px via Tailwind. Don't pull in a UI kit.
- Relative-time formatter: a 30-line helper is enough for "Xs/m/h/d ago" — skip date-fns for now.
