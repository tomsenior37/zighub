---
"zighub": minor
---

Add Docker packaging. Multi-stage Node 22 alpine Dockerfile, non-root runtime, healthcheck on `/health`, SQLite persisted via `/data` volume, USB coordinator passthrough documented. Multi-arch (linux/amd64, linux/arm64) build pipeline publishes to `ghcr.io/tomsenior37/zighub:edge` on every push to `main` and to `:vX.Y.Z` + `:latest` on git tags. `docker-compose.yml` example and README quick start included.
