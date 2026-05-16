# claude-code-template

Project template for [Claude Code](https://claude.com/claude-code) with a structured AFK/HITL workflow and an autonomous task runner.

## What's in here

```
ralph/                  # autonomous task runner
  prompt.md             # iteration prompt Claude follows each loop
  once.sh               # single supervised pass
  afk.sh <N>            # sandboxed loop, exits early when no AFK tasks remain
issues/
  afk/                  # tasks safe for autonomous execution
  afk/done/             # archive of completed AFK tasks
  hitl/                 # tasks requiring a human — ralph ignores these
CLAUDE.md               # project-level instructions for Claude
```

## Quick start

1. Click **Use this template** on GitHub to create a new repo, then clone it.
2. Bootstrap your stack inside Claude Code:
   - Python → `/python-bootstrap`
   - TypeScript/Node → `/ts-bootstrap`
3. Draft a PRD with `/write-a-prd`, then `/prd-to-issues` to populate `issues/afk/`.
4. Run the runner:
   - `./ralph/once.sh` — one supervised iteration
   - `./ralph/afk.sh 5` — up to 5 autonomous iterations, exits at `<promise>NO MORE TASKS</promise>`

## What ralph does per iteration

1. Reads `issues/afk/*.md` + last 5 commits + `ralph/prompt.md`.
2. Picks the next task by priority: bugfixes → dev infra → tracer bullets → polish → refactors.
3. Detects the stack (`package.json` and/or `pyproject.toml`).
4. Creates a feature branch (`feat/`, `fix/`, `chore/`, etc.).
5. Implements via TDD.
6. Runs the stack-appropriate tests + typecheck.
7. Commits with conventional-commit format.
8. Opens a draft PR (skips gracefully if `gh` isn't available).
9. Moves the issue file to `issues/afk/done/`.

## AFK vs HITL

- **AFK** issues live in `issues/afk/`. They are well-scoped, low-risk, and safe for the runner to pick up without supervision.
- **HITL** issues live in `issues/hitl/`. They need a human in the loop — design decisions, ambiguous scope, sensitive changes. Ralph ignores them.

## Requirements

- [Claude Code](https://claude.com/claude-code) CLI on `PATH`
- `git`, `jq` (for `afk.sh`), and optionally `gh` for PR creation
- `afk.sh` expects a `docker sandbox` command — adjust to your sandbox setup if different
