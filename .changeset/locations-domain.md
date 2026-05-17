---
"zighub": minor
---

Add `locations` table (migration `0002_locations.sql`) and `src/domain/locations.ts` with `create`, `list`, `get`, `update`, and `delete`. First domain table — first-class per scope §6.2. `ON DELETE SET NULL` on `parent_id` means deleting a parent un-nests its children rather than cascading.
