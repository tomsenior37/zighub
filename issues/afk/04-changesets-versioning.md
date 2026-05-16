# 04 — Versioning + changelog convention (changesets)

## Goal
Adopt [changesets](https://github.com/changesets/changesets) for semver bumps and a generated `CHANGELOG.md`. Every PR that changes runtime behaviour adds a changeset.

## Acceptance criteria
- `@changesets/cli` installed as devDep.
- `.changeset/config.json` exists; `baseBranch: "main"`, `access: "restricted"`, `commit: false`.
- `CHANGELOG.md` exists at repo root (can be empty / "Unreleased").
- README updated with a one-paragraph "Adding a changeset" snippet.
- A `chore: add changesets` PR demonstrates the workflow — one changeset entry that bumps to `0.1.0`.

## Deliverables ticked
- §0 "Versioning and changelog convention agreed"

## Notes
- Conventional Commits remain the rule for commit messages (per `CLAUDE.md`); changesets are orthogonal — they track *what users see in the changelog*, not commit format.
- Skip a release-bot workflow for now; merging changesets stays manual until we publish.
