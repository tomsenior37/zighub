# zighub

Single-binary Zigbee hub + automation app. One Docker image replaces Home Assistant + Zigbee2MQTT for Zigbee-only households.

Status: **pre-alpha**. The HTTP backend, SQLite schema, Zigbee adapter abstraction, device pairing flow, device list, and initial automation engine are in place. Real Zigbee coordinator support is still incomplete, MCP and cloud backups are still ahead, and some UI flows are draft-quality. See `project/deliverables.md` for the full checklist.

## Works today

- Run the backend and React UI from one Node process or one Docker container.
- Store app data in SQLite with migrations and startup integrity checks.
- Detect USB serial ports and known Zigbee coordinator VID/PID pairs.
- Select a coordinator path through the setup wizard or API.
- Use mock Zigbee mode for pairing, device list, permit-join, network setup, manual commands, and rule-engine development.
- Create, validate, approve, enable, disable, edit, and run early YAML automations against the adapter abstraction.

## Mock/demo only

By default zighub runs with the in-memory mock Zigbee adapter. The API exposes this at `GET /api/zigbee/status` as `adapterMode: "mock"` and the UI header shows `Mock adapter` so demo mode is visible.

Mock mode is useful for tests and UI development, but it does not control real hardware. If `ZIGBEE_ENABLED=1` is set without a selected coordinator path or database path, zighub falls back to mock mode and reports the fallback reason in `/api/zigbee/status`.

## Requires real coordinator

Real hardware control requires a supported USB Zigbee coordinator, a mounted serial device, and `ZIGBEE_ENABLED=1`. The real adapter uses `zigbee-herdsman`; this path is still pre-alpha and needs manual smoke testing with a coordinator before being treated as reliable.

Manual QA checklist for real coordinator changes:

1. Start with `ZIGBEE_ENABLED=1` and `ZIGHUB_COORDINATOR_PATH=/dev/ttyUSB0` or your actual device path.
2. Confirm `GET /api/zigbee/status` reports `adapterMode: "herdsman"`.
3. Confirm the UI header shows `Herdsman adapter`.
4. Open and close permit-join from the wizard or devices page.
5. Pair a test device, confirm it appears in Devices, then unpair it from a separate trusted tool if zighub does not yet support that exact flow.

## Quick start (Docker)

```sh
docker pull ghcr.io/tomsenior37/zighub:edge

docker run --rm \
  -p 8282:8282 \
  -v zighub-data:/data \
  --name zighub \
  ghcr.io/tomsenior37/zighub:edge
```

Then open <http://localhost:8282/health> — you should see `{"status":"ok","version":"..."}`.

Or with compose:

```sh
curl -O https://raw.githubusercontent.com/tomsenior37/zighub/main/docker-compose.yml
docker compose up -d
```

### Zigbee coordinator passthrough

Pass your USB dongle through with `--device`:

```sh
docker run --rm \
  -p 8282:8282 \
  -v zighub-data:/data \
  --device /dev/ttyUSB0 \
  ghcr.io/tomsenior37/zighub:edge
```

The device path varies by host — typically `/dev/ttyUSB0` (CP210x-style adapters) or `/dev/ttyACM0` (CDC ACM, e.g. ConBee). On Linux the calling user generally needs to be in the `dialout` group; that's a host-side concern, not the container's.

Set `ZIGBEE_ENABLED=1` when you want to use the real `zigbee-herdsman` adapter. Without it, zighub intentionally stays in mock mode.

### Configuration

All overridable via env vars. The defaults baked into the image:

| Var | Default | Purpose |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Bind interface. Override if you only want loopback inside the container. |
| `PORT` | `8282` | Web UI / HTTP port. |
| `ZIGHUB_DB_PATH` | `/data/zighub.db` | SQLite path. Stays on the `zighub-data` volume by default. |
| `ZIGBEE_ENABLED` | unset | Set to `1` to use the real `zigbee-herdsman` adapter. Otherwise mock mode is used. |
| `ZIGHUB_COORDINATOR_PATH` | unset | Optional serial path such as `/dev/ttyUSB0`; the wizard can also store the selected path. |

### Image tags

| Tag | When it moves |
| --- | --- |
| `:edge` | Every push to `main`. |
| `:vX.Y.Z`, `:X.Y`, `:X` | Pushed on `v*` git tags. |
| `:latest` | Most recent tagged release. |
| `:sha-<short>` | Per-commit immutable. |

Built multi-arch (`linux/amd64`, `linux/arm64`) by `.github/workflows/release-image.yml`.

## Development

Workflow lives in this repo's `ralph/` runner and AFK/HITL issue queues — see `CLAUDE.md` for project-level instructions. Stack: Node 22 + TypeScript, Fastify, better-sqlite3, Vitest, Vite + React 19 for the web UI. ESLint + Prettier + husky pre-commit. Changesets for versioning.

```sh
npm ci                # install
npm run dev           # backend (tsx watch) + Vite dev server in parallel
npm run dev:api       # backend only (port 8282)
npm run dev:web       # Vite dev server only (port 5173, proxies /health + /api to 8282)
npm run build         # compile backend, copy migrations, build web SPA
npm start             # run the compiled server (serves SPA when NODE_ENV=production)
npm run db:migrate    # apply pending migrations to the configured DB
npm test              # vitest run (node + jsdom projects)
npm run typecheck     # tsc --noEmit for backend + src/web
npm run lint          # eslint . --max-warnings=0
```

In development, open <http://localhost:5173> for the UI (Vite serves React and proxies API/health requests to the backend on 8282). In production the compiled backend serves the built SPA from `dist/web/` directly on its own port — set `ZIGHUB_SERVE_WEB=1` to force this in non-production too.

### Build the image locally

```sh
docker build -t zighub:local .
docker run --rm -p 8282:8282 -v zighub-data:/data zighub:local
```

### Ralph runner

- `./ralph/once.sh` — one supervised iteration against `issues/afk/`.
- `./ralph/afk.sh 5` — up to 5 autonomous iterations, exits at `<promise>NO MORE TASKS</promise>`.

### Adding a changeset

Every PR that changes runtime behaviour adds a [changeset](https://github.com/changesets/changesets). `npx changeset`, pick a bump level, write a short user-facing summary. On release, `npx changeset version` consumes those files to bump `package.json` and regenerate `CHANGELOG.md`.

## Project docs

- `project/project_scope.md` — full scope and architecture.
- `project/decisions.md` — locked technical decisions.
- `project/deliverables.md` — v1 checklist.
