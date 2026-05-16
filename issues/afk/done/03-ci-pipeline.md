# 03 — CI pipeline (lint, typecheck, test on PR)

## Goal
GitHub Actions workflow that runs lint, typecheck, and tests on every PR and every push to `main`. Failing CI blocks merge.

## Acceptance criteria
- `.github/workflows/ci.yml` exists.
- Triggers: `pull_request` and `push` to `main`.
- Jobs run on `ubuntu-latest`, Node 20.x and 22.x matrix.
- Steps: checkout, setup-node with cache, install deps, `npm run lint`, `npm run typecheck`, `npm run test`.
- Each job step uses `actions/checkout@v4` and `actions/setup-node@v4` pinned.
- A pull request opened against this branch shows the workflow running and passing.

## Deliverables ticked
- §0 "CI pipeline (lint, typecheck, tests) on every PR"

## Notes
- Use `pnpm/action-setup` if the project uses pnpm (check the lockfile committed by 01).
- Don't add publish, release, or deploy jobs yet — that's later.
- Cache the package-manager store, not `node_modules`.
