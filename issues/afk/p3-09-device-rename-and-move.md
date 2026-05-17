# P3-09 — Device rename + move-to-location (PATCH endpoint + UI)

## Goal
Let the user rename a device or move it between locations. Backend gets a single `PATCH /api/devices/:ieeeAddress` endpoint, frontend gets an inline-edit affordance on each device card.

## Acceptance criteria
- `PATCH /api/devices/:ieeeAddress`:
  - Body schema: `{ friendly_name?: string (1..64); location_id?: number | null }`. At least one field required. Additional properties rejected.
  - Validates `friendly_name` doesn't collide with another device (uses the existing UNIQUE constraint; 409 on conflict with `{ error: "name_collision" }`).
  - Validates `location_id` exists in `locations` (or is null); 400 on missing reference.
  - Audit-logged: `category: "devices"`, `event: "renamed"` or `"location-changed"`, `details: { ieeeAddress, ... }`.
  - 404 with `{ error: "device_not_found" }` when the IEEE address is unknown.
- Backend uses existing `domain/devices.rename` and `domain/devices.setLocation` (no new domain code).
- Frontend (`src/web/components/devices/DeviceCard.tsx`):
  - Pencil icon (text "Edit" is fine — no icon library) opens an inline edit form: friendly name input + location dropdown (populated from a new `GET /api/locations` endpoint if it doesn't already exist, otherwise from existing).
  - Save calls `useMutation` from TanStack Query; on success invalidates the `["devices"]` query so the list refreshes.
  - Error messages: "Another device already uses that name" for 409; generic "Could not save" otherwise.
- If `GET /api/locations` doesn't already exist, add it returning `Location[]` from `domain/locations.list`. (Check current state first — `domain/locations` is already in place.)

## Tests
- PATCH rename succeeds, persists, audit-logs.
- PATCH name collision returns 409.
- PATCH location-change persists.
- PATCH with neither field returns 400.
- PATCH for unknown ieeeAddress returns 404.
- RTL: inline edit form opens, submits, invalidates query (assert refetch).

## Deliverables ticked
- §4 "Rename device".
- §4 "Move device to different location".

## Notes
- Adding location editing might need an existing `/api/locations` GET — verify first; if missing, add it inline in this PR with a short note.
- Inline edit (not modal) keeps the UX simple. If we need a modal later, the same mutation hook is reusable.
