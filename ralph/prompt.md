ISSUES
Local issue files from issues/afk/ are provided at the start of context. Parse them to understand the open AFK tasks.

You will work on AFK issues only. HITL issues live in issues/hitl/ and are handled by a human — ignore them.

You've also been passed a file containing the last few commits. Review these to understand what work has been done.

If all AFK tasks are complete, output <promise>NO MORE TASKS</promise> and stop.

TASK SELECTION
Pick the next task. Prioritize in this order:

1. Critical bugfixes
2. Development infrastructure
   Tests, types, and dev scripts are precursors to building features. Get them green first.
3. Tracer bullets for new features
   Build a tiny, end-to-end slice of the feature first, then expand it out. This validates the architecture before significant investment.
4. Polish and quick wins
5. Refactors

EXPLORATION
Explore the repo before touching anything.

STACK DETECTION
Detect the project's stack(s) before running feedback loops:
- `package.json` present → TypeScript/Node. Tests: `npm run test`. Types: `npm run typecheck`.
- `pyproject.toml` present → Python. Tests: `uv run pytest`. Types/lint: read pyproject.toml for the configured tool (mypy, pyright, ruff) and run via `uv run`.
- Both present → mixed repo, run both sets of loops.
- Neither present → skip the feedback loops and note this in the commit message.

BRANCH
Before making changes, ensure you are on a feature branch (never commit directly to main/master).
- Branch name: kebab-case, prefixed by task type — `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, or `test/`.
- If currently on main/master, create a new branch named after the task.

IMPLEMENTATION
Use /tdd to complete the task.

FEEDBACK LOOPS
Before committing, run the stack-appropriate feedback loops detected above.
Do not commit if tests or types are failing — fix them first.

DELIVERABLES TICK
Before committing, update `project/deliverables.md`:
- Read the "Deliverables ticked" section of the issue file you just completed.
- Change each matching `- [ ]` to `- [x]` in `deliverables.md`.
- If an issue ticks something partially (e.g. "ESLint+Prettier portion") add a parenthetical note on the bullet rather than ticking it fully.
- Stage `deliverables.md` as part of the same commit.

If an issue file says "STOP — do not implement" or is marked as a sentinel/handoff, do NOT implement it, do NOT tick anything for it, and do NOT move it to `done/`. End the iteration with `<promise>NO MORE TASKS</promise>`.

COMMIT
Make a git commit. The commit message must:
- Follow conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Use imperative mood, lowercase first word after the type
- Include key decisions made
- Include files changed
- Note blockers or considerations for the next iteration

PULL REQUEST
Open a draft PR with `gh pr create --draft`:
- Title: short, conventional-commit style
- Body must include:
  - Summary of what changed and why
  - Reference to the issue file path (e.g. `Closes issues/afk/your-task.md`)
  - Test plan as a markdown checklist
- If `gh` is unavailable or auth fails (common in sandboxed runs), note this in the issue file and skip the PR step. The human will open the PR later.

THE ISSUE
If the task is complete, move the issue file to issues/afk/done/.
If the task is not complete, add a note to the issue file describing what was done and what remains.

FINAL RULES
ONLY WORK ON A SINGLE TASK.
