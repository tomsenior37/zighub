# Project Decisions

Locked-in answers to the open questions in `project_scope.md §11`. Update this file when decisions change; do not silently rewrite history elsewhere.

| Question | Decision | Date | Notes |
| --- | --- | --- | --- |
| Working title / project name | **zighub** | 2026-05-17 | Free on npm registry as of decision date. UI title, binary name, npm package name. Repo currently `zigbeeapp` — rename to `zighub` is a follow-up. |
| Language / runtime | **Node.js + TypeScript** | 2026-05-17 | Per scope §5 recommendation. `zigbee-herdsman` is Node-native, single-binary packaging mature, shared types across backend/frontend. |
| Desktop wrapper | **None — pure web UI** | 2026-05-17 | Backend serves a React/Vite SPA on `localhost:8080`. No Electron, no Tauri. Reconsider after v1.0 if user feedback demands a native shell. |
| Distribution format | **Docker image + pure web UI** | 2026-05-17 | One image, user mounts coordinator via `--device`. Defers native installer + code-signing work to v1.1+. Section §14 of deliverables.md is scoped accordingly. |
| Telemetry | **None in v1** | 2026-05-17 | No anonymous crash reporting or usage metrics. Logs stay local. Reconsider once a beta cohort exists. |
| Licence model | **TBD — placeholder MIT** | 2026-05-17 | Template ships with MIT in `LICENSE`. Revisit before public release. |
| MCP remote transport hosting | **Self-hosted only (v1)** | 2026-05-17 | No managed service. HTTP/SSE transport runs from the same container; user exposes it themselves if they want Claude.ai connector access. |
| HTTP framework | **Fastify** | 2026-05-17 | Picked over Express for schema-first route validation (JSON Schema/typebox baked in), built-in async/await, structured logging via pino, and active maintenance. Express 5 is still light on first-party TypeScript and validation. `fastify.inject()` also gives us zero-network integration tests without pulling in supertest. |

## Implications for deliverables.md

- §0 Project Foundation: name decided (zighub), distribution decided (Docker + web), runtime decided (Node + TS). All three checkboxes can be ticked when this file lands.
- §14 Distribution & Install: scope shrinks — no native installers, no per-OS code signing, no auto-update mechanism in v1. The Docker image build replaces those items. Update §14 when ralph reaches it.
- §16 Quality & Release: "Crash reporting (opt-in, if telemetry decision is yes)" can be removed — telemetry is no.
