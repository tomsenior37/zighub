# 01 — Bootstrap Node + TypeScript scaffold

## Goal
Initialise the `zighub` Node + TypeScript project so the rest of the work has a working dev loop: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format`.

Run `/ts-bootstrap` (or its equivalent steps) to scaffold the project. The repo currently has no `package.json`.

## Acceptance criteria
- `package.json` exists at repo root with `name: "zighub"`, `private: true`, `type: "module"`, Node ≥ 20 in `engines`.
- TypeScript compiles cleanly (`strict: true`, `noUncheckedIndexedAccess: true`).
- Vitest configured; an example smoke test passes (`expect(true).toBe(true)`).
- ESLint + Prettier configured, agreeing with each other.
- Scripts: `test`, `test:watch`, `typecheck`, `lint`, `lint:fix`, `format`.
- `src/` directory created with a placeholder `index.ts` exporting a `VERSION` constant read from `package.json`.
- `node_modules`, `dist`, `coverage` added to `.gitignore`.
- Lockfile committed (`pnpm-lock.yaml` or `package-lock.json` — whichever the `/ts-bootstrap` skill emits).

## Deliverables ticked
- §0 "Node + TypeScript scaffold"
- §0 "Linter, formatter, and pre-commit hooks configured" (pre-commit hooks land in 05; ESLint+Prettier portion lands here)

## Notes
- Use `pnpm` if `/ts-bootstrap` defaults to it; otherwise `npm`. Either is fine, pick one and stick with it.
- Do **not** add Fastify, React, or any runtime deps in this issue — just dev tooling. The HTTP tracer is issue 02.
- Decision context: see `project/decisions.md`. Node + TS is locked.
