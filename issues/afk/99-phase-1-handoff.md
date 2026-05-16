# 99 — Phase 1 handoff (STOP — do not implement)

## Goal
This is a sentinel issue. When it's the **only** remaining AFK issue, Phase 1 (foundation + DB schema) is complete and ralph should stop so the human can:

1. Review the merged PRs and the state of `deliverables.md`.
2. Make architectural calls that Phase 2 depends on:
   - HTTP framework choice (if not already locked in issue 02).
   - Frontend scaffold approach (separate Vite app vs. served from backend; React vs. preact; design system / Tailwind / shadcn / nothing).
   - zigbee-herdsman testing strategy (mocked coordinator? CI hardware-in-loop? skip in CI?).
   - Whether to introduce a worker-thread split for the zigbee event loop.
3. Generate Phase 2 issues covering deliverables §2 (Zigbee Stack), §3 (Setup Wizard), and §4 (Device Management).

## Acceptance criteria
Ralph must NOT attempt to implement this issue. When it's encountered as the next-up task, the iteration ends with `<promise>NO MORE TASKS</promise>` and the issue file stays in `issues/afk/` (do NOT move to `done/`).

## Notes
- The numbering (`99-`) is deliberate — comes after all numbered Phase 1 work.
- If there's still other Phase 1 work pending, pick that first and ignore this file.
