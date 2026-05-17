# P2-02 — Frontend scaffold (Vite + React + TS served from Fastify)

## Goal
Stand up a Vite + React + TypeScript frontend in `src/web/` and wire it into the existing Fastify backend. In production the backend serves the built assets; in dev the Vite dev server runs alongside the backend and proxies API calls to it. This is the tracer slice that unblocks all UI work — no real screens yet, just proof that a React page can fetch `/health` and render the result.

## Acceptance criteria
- `src/web/` contains:
  - `index.html` Vite entry
  - `main.tsx` rendering a single `<App />`
  - `App.tsx` that fetches `GET /health` on mount and renders `version` from the response.
  - `vite.config.ts` with `root: src/web`, `build.outDir: ../../dist/web` (relative to project root), and a dev proxy for `/health` and `/api` to `http://localhost:8282`.
- Backend (Fastify):
  - In production (`NODE_ENV=production`), serves `dist/web/` as static assets at `/` via `@fastify/static`.
  - SPA fallback: requests that don't match an API route and don't have a file extension return `dist/web/index.html`.
  - `/health` and `/api/*` remain JSON endpoints (not swallowed by the SPA fallback).
- `package.json`:
  - `npm run dev` starts both backend (via tsx watch) and Vite dev server concurrently. Use `concurrently` (dev dep).
  - `npm run dev:web` starts Vite alone on `http://localhost:5173`.
  - `npm run dev:api` starts backend alone (current `dev` behaviour).
  - `npm run build` runs `tsc -p tsconfig.build.json`, copies migrations, AND runs `vite build` (so the prod bundle is self-contained).
- TypeScript:
  - `src/web/` has its own `tsconfig.json` extending root, with `jsx: react-jsx`, `lib: ["DOM", "ES2022"]`, `moduleResolution: bundler`. Excluded from the backend `tsconfig.build.json`.
  - Root `tsconfig.json` references both web and server projects (or excludes `src/web` explicitly so backend typecheck stays fast).
  - `npm run typecheck` typechecks both backend and frontend.
- Tests:
  - One vitest test for the static-serving Fastify plugin that asserts: `/health` returns JSON; `/some-spa-route` returns the index.html bytes; `/api/missing` returns 404 JSON (not the SPA fallback).
  - One vitest test using `@testing-library/react` + `jsdom` that renders `<App />` with `fetch` mocked, asserts the version text shows up.
- ESLint config covers `src/web/**/*.{ts,tsx}` with React rules (use `eslint-plugin-react` + `eslint-plugin-react-hooks` flat-config preset).
- README "Quick start" section gets a `npm run dev` note.

## Test plan
- `npm install` succeeds.
- `npm run typecheck` passes for backend + web.
- `npm run test` passes (including the new FE + static-serve tests).
- `npm run build` produces both `dist/index.js` and `dist/web/index.html`.
- `NODE_ENV=production node dist/index.js` → `curl http://localhost:8282/` returns the SPA HTML.
- `npm run dev` → `http://localhost:5173` shows the version pulled from `/health`.

## Deliverables ticked
None directly — this is foundation for §3 (Setup Wizard) and §4 (Device Management UI).

## Notes
- Pin Vite, React, and Tailwind to current stable. Add to `dependencies` (React, React DOM) vs. `devDependencies` (Vite, plugins, types).
- Keep the FE folder layout flat for now (`src/web/components/`, `src/web/hooks/`, `src/web/pages/` to be added as needed).
- Justify each new dep in the PR description.
