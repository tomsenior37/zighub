# P4-03 — Wizard network step (create or keep)

## Goal
Real Network step: if a network already exists (GET `/api/network` returns non-null), offer "Keep existing" + "Wipe & create new". If not, "Create new network" is the only path. Calling `POST /api/network/create` creates and persists; on success advance.

## Acceptance criteria
- `src/web/wizard/steps/NetworkStep.tsx`:
  - Pre-loads `GET /api/network`. Shows pan ID, channel, and "Created at" relative time if present.
  - Two CTAs when network exists: "Keep this network" (skip to next) and "Wipe & create a new one" (calls `/api/network/create` with confirmation modal).
  - One CTA when none exists: "Create a fresh network" (defaults: channel 15, random PAN). Plus an "Advanced" expander to pick a channel (11-26) or PAN ID (hex input, 1-fffe).
  - On success, advance wizard. Inline error on failure.
- `useNetworkInfo()` and `useCreateNetwork()` hooks.
- Confirmation modal: simple inline shadcn-free dialog (Tailwind only), focused trap not required for v1 — just an overlay + Confirm/Cancel buttons.

## Tests
- RTL: when network exists, both keep/wipe CTAs render; wipe shows confirm + advances on accept.
- When network doesn't exist, the create CTA shows; clicking it calls POST and advances.
- Advanced expander reveals channel + panId inputs that route through to the POST body.

## Notes
- The "wipe existing" path doesn't actually wipe the coordinator's state — herdsman would need a re-start with new params. Backend already documents this caveat; the UI just persists the new info.
