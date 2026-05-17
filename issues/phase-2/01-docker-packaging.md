# P2-01 — Docker packaging (testable image on port 8282)

## Goal
Produce a multi-arch Docker image (`linux/amd64`, `linux/arm64`) that a user can pull and run to test zighub end-to-end. The container exposes the web UI on port 8282 by default. This is the first user-touchable distribution artefact.

## Acceptance criteria
- `Dockerfile` at repo root, multi-stage:
  - Build stage: Node 22 alpine, `npm ci`, `npm run build`, prune dev deps.
  - Runtime stage: distroless or alpine, non-root user, only production deps and built `dist/`.
- Image starts the Fastify server on `0.0.0.0:8282` (so it's reachable from the host with `-p 8282:8282`).
- `HEALTHCHECK` calls `/health`; container reports healthy within 10s.
- USB coordinator support documented — `docker run --device /dev/ttyUSB0 ...` reaches the serial port from inside.
- SQLite database persisted via volume mount (`-v zighub-data:/data`), and `DATABASE_PATH` env var defaults to `/data/zighub.sqlite`.
- `docker-compose.yml` example committed showing the typical setup (port, device, volume).
- GitHub Actions workflow `release-image.yml`:
  - Builds + pushes to `ghcr.io/tomsenior37/zighub` on tag push (`v*`) and on `main` (as `:edge`).
  - Multi-arch via buildx + QEMU.
  - Uses `GITHUB_TOKEN` for ghcr auth (no extra secrets).
- README "Quick start" section: one `docker pull` + one `docker run` command, then open `http://localhost:8282`.
- Image size budget: < 200 MB compressed (target; flag in PR if exceeded with reason).

## Test plan
- `docker build -t zighub:test .` succeeds locally.
- `docker run --rm -p 8282:8282 zighub:test` starts cleanly.
- `curl http://localhost:8282/health` returns `200 {"status":"ok","version":"..."}`.
- Container restarts cleanly (`docker restart`) without losing the SQLite DB.
- Image runs on both amd64 and arm64 (verify in CI).

## Deliverables ticked
- §14 "Docker image build pipeline (multi-arch)"
- §14 "Image published to ghcr.io/tomsenior37/zighub"
- §14 "Web UI default `localhost:8282`"
- §14 "Coordinator USB device mount documented"
- §14 "First-run experience tested via `docker pull` + `docker run`"
- §14 "docker-compose.yml example"

## Notes
- This issue assumes the Fastify server (issue 02 / PR #8) has landed and binds to `PORT` env var.
- Do **not** include the React UI in this image yet — Phase 2 UI work is separate. The `/health` endpoint is enough to prove the container works.
- Image tag strategy: `:latest` only on stable releases; `:edge` for every main commit; `:vX.Y.Z` on tags.
- USB serial permissions on the host (`dialout` group on Linux) are a host-side concern — document but don't try to fix from inside the container.
