---
"zighub": minor
---

Stand up a Fastify HTTP server bound to `127.0.0.1:8080` (host/port overridable via `HOST`/`PORT`) with a `GET /health` endpoint returning `{ status: "ok", version }`. SIGINT/SIGTERM trigger a clean Fastify close.
