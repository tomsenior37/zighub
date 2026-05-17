---
"zighub": minor
---

Add `devices` table (migration `0003_devices.sql`) and `src/domain/devices.ts` with `create`, `list({ locationId? })` returning devices grouped by location, `get`, `rename`, `setLocation`, `setNotes`, `touchLastSeen`, and `deleteDevice`. `location_id` FK uses `ON DELETE SET NULL` so deleting a location un-assigns its devices rather than cascading. Promotes `ValidationError` to a shared `src/domain/errors.ts` module re-exported from both `locations.ts` and `devices.ts`.
