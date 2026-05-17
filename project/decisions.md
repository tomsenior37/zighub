# Project Decisions

Locked-in answers to the open questions in `project_scope.md §11`. Update this file when decisions change; do not silently rewrite history elsewhere.

| Question | Decision | Date | Notes |
| --- | --- | --- | --- |
| Working title / project name | **zighub** | 2026-05-17 | Free on npm registry as of decision date. UI title, binary name, npm package name. Repo currently `zigbeeapp` — rename to `zighub` is a follow-up. |
| Language / runtime | **Node.js + TypeScript** | 2026-05-17 | Per scope §5 recommendation. `zigbee-herdsman` is Node-native, single-binary packaging mature, shared types across backend/frontend. |
| Desktop wrapper | **None — pure web UI** | 2026-05-17 | Backend serves a React/Vite SPA on `localhost:8282` (default; overridable via `PORT`). No Electron, no Tauri. Reconsider after v1.0 if user feedback demands a native shell. |
| Distribution format | **Docker image + pure web UI** | 2026-05-17 | One image, user mounts coordinator via `--device`. Defers native installer + code-signing work to v1.1+. Section §14 of deliverables.md is scoped accordingly. |
| Telemetry | **None in v1** | 2026-05-17 | No anonymous crash reporting or usage metrics. Logs stay local. Reconsider once a beta cohort exists. |
| Licence model | **TBD — placeholder MIT** | 2026-05-17 | Template ships with MIT in `LICENSE`. Revisit before public release. |
| MCP remote transport hosting | **Self-hosted only (v1)** | 2026-05-17 | No managed service. HTTP/SSE transport runs from the same container; user exposes it themselves if they want Claude.ai connector access. |
| HTTP framework | **Fastify** | 2026-05-17 | Picked over Express for schema-first route validation (JSON Schema/typebox baked in), built-in async/await, structured logging via pino, and active maintenance. Express 5 is still light on first-party TypeScript and validation. `fastify.inject()` also gives us zero-network integration tests without pulling in supertest. |
| Frontend stack | **Vite + React 19 + TypeScript** | 2026-05-17 | Per scope §5 recommendation. Frontend lives in `src/web/`, built to `dist/web/`. In production Fastify serves the built assets; in dev the Vite dev server proxies API calls to the backend. Sharing types between FE/BE is the key win. |
| Frontend styling | **Tailwind CSS v4, no component library** | 2026-05-17 | Keep the design surface small for v1. Picking a component kit (shadcn, mantine, etc.) before the wizard UX is sketched would just be churn. Revisit after first wizard pass. |
| Frontend routing & data | **React Router (data router) + TanStack Query** | 2026-05-17 | Standard pair for app shells with route-level loaders and server-state caching. No additional global store needed in v1. |
| zigbee-herdsman testing strategy | **Mock adapter behind a `ZigbeeAdapter` interface; no hardware in CI** | 2026-05-17 | All code that touches Zigbee goes through a `ZigbeeAdapter` seam. The real adapter wraps `zigbee-herdsman` and is gated behind `ZIGBEE_ENABLED`. The mock adapter is used in unit / integration tests. Real-coordinator smoke testing is a manual artifact outside CI. |
| Worker-thread split for zigbee | **Single-process v1; revisit if measurable** | 2026-05-17 | The cost of a worker-thread boundary (postMessage serialization, lifecycle complexity) is not justified before we have evidence of event-loop blocking under real traffic. Add metrics first; split only if data demands it. |

## Implications for deliverables.md

- §0 Project Foundation: name decided (zighub), distribution decided (Docker + web), runtime decided (Node + TS). All three checkboxes can be ticked when this file lands.
- §14 Distribution & Install: scope shrinks — no native installers, no per-OS code signing, no auto-update mechanism in v1. The Docker image build replaces those items. Update §14 when ralph reaches it.
- §16 Quality & Release: "Crash reporting (opt-in, if telemetry decision is yes)" can be removed — telemetry is no.
