# Example: add a /health endpoint

> Delete this file before kicking off real work — it's here to show the issue format.

## Goal
Expose a `/health` endpoint returning `200 OK` with `{"status": "ok"}` so deploys can be probed by uptime checks.

## Acceptance criteria
- `GET /health` returns 200 with `{"status": "ok"}`
- No auth required for this endpoint
- One integration test covers the happy path

## Notes
- Tracer bullet for the API layer — keep scope tight, no metrics or version info yet.
- If the project has no HTTP framework yet, this issue isn't ready — leave a note in the file and move on.
