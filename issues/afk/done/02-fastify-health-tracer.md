# 02 — Fastify backend with /health endpoint (tracer)

## Goal
Tracer bullet for the HTTP layer: stand up a Fastify server bound to `localhost:8080` and expose `GET /health` returning `200 { status: "ok", version: "<package.json version>" }`. Everything from §3 onwards will hang off this.

## Acceptance criteria
- Fastify (or Express — pick one and document the choice in a `decisions/` note) installed as a runtime dep.
- `src/server.ts` starts the server, defaults to `127.0.0.1:8080`, port + host overridable via `PORT` / `HOST` env vars.
- `src/index.ts` is now the entrypoint: starts the server, handles SIGINT/SIGTERM, exits cleanly.
- `GET /health` returns 200 with `{"status":"ok","version":"<x.y.z>"}` — version read from `package.json`.
- One integration test (`supertest` or `fastify.inject`) covers the happy path.
- `npm start` runs the compiled server; `npm run dev` runs it via `tsx` watch mode.

## Deliverables ticked
- None directly — this is infrastructure that unblocks §3 wizard and §13 MCP HTTP transport. Note this in the commit message.

## Notes
- Bind to `127.0.0.1`, NOT `0.0.0.0`. LAN exposure is opt-in per scope §8 Security; that's a later issue.
- No auth on `/health`. No metrics endpoint yet.
- If 01 hasn't landed, this issue isn't ready — leave a note and skip.
