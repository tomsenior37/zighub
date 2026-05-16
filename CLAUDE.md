# CLAUDE.md

Project-level instructions for Claude Code sessions in this repo.

## Workflow

This project uses the `ralph/` runner for autonomous task execution.
- See `ralph/prompt.md` for the per-iteration prompt.
- AFK tasks: `issues/afk/*.md` — autonomous execution allowed.
- HITL tasks: `issues/hitl/*.md` — human-driven; do not pick these up in AFK runs.
- Completed AFK tasks archive to `issues/afk/done/`.

## Conventions

- Feature branches only — never commit to `main`/`master`.
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:` — imperative mood, lowercase first word.
- TDD: red → green → refactor.
- Stack-aware feedback loops:
  - Node: `npm run test`, `npm run typecheck`
  - Python: `uv run pytest`, plus whichever type/lint tool is configured in `pyproject.toml`
- Draft PRs via `gh pr create --draft`, body references the issue file path.

## When unsure

Ask before doing anything destructive (rm, force-push, drop table, delete branch).
