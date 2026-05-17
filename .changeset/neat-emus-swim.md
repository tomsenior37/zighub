---
"zighub": minor
---

Add a Vite + React 19 + TypeScript web UI scaffold served from Fastify. In development the Vite dev server (`npm run dev:web`, port 5173) proxies API/health calls to the backend; `npm run dev` runs both in parallel via `concurrently`. In production (or with `ZIGHUB_SERVE_WEB=1`), the backend serves the built SPA from `dist/web/` with an SPA fallback that does not swallow `/api/*` or `/health`. Tracer slice: the app renders the version returned by `/health`. Backend `buildServer` is now async to register `@fastify/static` cleanly.
