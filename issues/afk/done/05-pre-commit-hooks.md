# 05 — Pre-commit hooks (husky + lint-staged)

## Goal
Block commits that would fail CI. Run ESLint + Prettier on staged files, run typecheck on the whole project.

## Acceptance criteria
- `husky` and `lint-staged` installed as devDeps.
- `.husky/pre-commit` runs `npx lint-staged && npm run typecheck`.
- `lint-staged` config in `package.json`: `*.{ts,tsx}` → `eslint --fix` + `prettier --write`; `*.{json,md,yml,yaml}` → `prettier --write`.
- `husky install` runs via `prepare` script.
- Demonstrated: a commit with an ESLint error is blocked; fixing it allows the commit.

## Deliverables ticked
- §0 "Linter, formatter, and pre-commit hooks configured" (pre-commit portion — ESLint/Prettier already landed in 01)

## Notes
- Do not use `--no-verify` anywhere in scripts or docs.
- Typecheck on whole project is slow but correct — incremental TS gets us most of the way.
