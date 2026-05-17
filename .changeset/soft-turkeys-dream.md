---
"zighub": patch
---

Tighten the CI feedback loop around the new frontend: `npm run test:coverage` runs vitest with v8 coverage (text summary in CI logs), CI now has a dedicated `build` job that runs `npm run build`, verifies `dist/index.js` + `dist/web/index.html` + `dist/db/migrations/` are all present, and uploads `dist/` as a workflow artifact. Dockerfile build stage now copies `vite.config.ts` so the SPA builds inside the image.
