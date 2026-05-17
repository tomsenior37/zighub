# P2-04 — Frontend CI coverage and production build wiring

## Goal
Ensure the frontend is fully covered by the existing CI pipeline (lint, typecheck, tests, build) and that `npm run build` produces a complete, self-contained production artefact. This issue does not introduce features — it tightens the development loops so future Phase 2 work stays green.

## Acceptance criteria
- `.github/workflows/ci.yml` (or whatever the CI workflow file is named):
  - Runs `npm run lint` and confirms it covers `src/web/**`.
  - Runs `npm run typecheck` and confirms it covers `src/web/**`.
  - Runs `npm run test` and confirms FE tests run (jsdom).
  - Runs `npm run build` and uploads `dist/` as a CI artefact for sanity.
- `vitest.config.ts` configured for dual environments — backend tests use `node`, web tests use `jsdom`. Use `environmentMatchGlobs` or split into two projects.
- Coverage of `src/web/**` and `src/**/*.ts` (non-web) is reported (text summary in CI logs is enough; no codecov yet).
- `npm run build` output:
  - `dist/index.js` (backend entry).
  - `dist/migrations/*.sql` (existing).
  - `dist/web/index.html`, `dist/web/assets/*.js`, `dist/web/assets/*.css`.
- `.dockerignore` updated so `dist/` is not COPYed in (built fresh inside Docker), and `node_modules/` stays excluded.
- `Dockerfile` updated: build stage now runs `vite build` as part of `npm run build` so the runtime stage's `dist/` includes web assets.
- Docker image healthcheck unchanged; `/health` still returns JSON.

## Test plan
- `npm run typecheck` passes locally for both projects.
- `npm test` runs both backend (node env) and web (jsdom env) suites; both pass.
- `npm run build` succeeds; `dist/web/index.html` exists.
- `docker build .` succeeds; resulting image serves the SPA on `/` (verify with `curl` against built container).
- CI green on PR.

## Deliverables ticked
None — infrastructure tightening.

## Notes
- If `eslint-plugin-react` config fights with existing config, prefer scoping the React rules to `src/web/**` via flat-config `files:` instead of forcing rules globally.
- Keep CI runtime under 5 minutes for the standard PR pipeline. Multi-arch Docker builds stay in the existing `release-image.yml`, not in CI.
