# zighub

Single-binary Zigbee hub + automation app. One Docker image replaces Home Assistant + Zigbee2MQTT for Zigbee-only households.

Status: **pre-alpha**. The HTTP backend, SQLite schema, and migration system are in place. Device pairing, the rule engine, UI, MCP, and cloud backups are still ahead. See `project/deliverables.md` for the full checklist.

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
curl -O https://raw.githubusercontent.com/tomsenior37/zigbeeapp/main/docker-compose.yml
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

Coordinator wiring isn't implemented yet — this just documents the deploy shape.

### Configuration

All overridable via env vars. The defaults baked into the image:

| Var | Default | Purpose |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Bind interface. Override if you only want loopback inside the container. |
| `PORT` | `8282` | Web UI / HTTP port. |
| `ZIGHUB_DB_PATH` | `/data/zighub.db` | SQLite path. Stays on the `zighub-data` volume by default. |

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
