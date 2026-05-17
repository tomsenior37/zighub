# P2-03 — UI shell with routing + Tailwind baseline

## Goal
Replace the tracer `<App />` from p2-02 with a real app shell: top nav + four placeholder route pages (Wizard, Devices, Automations, Settings). Adopt Tailwind CSS v4 as the styling baseline. Each page is intentionally minimal — empty state with a heading and an explanatory paragraph. Real content comes in later issues.

## Acceptance criteria
- `react-router-dom` (data router) wired in. Routes:
  - `/` → redirects to `/wizard` if first-run state is not set (placeholder logic for now — always treat as first-run), else `/devices`.
  - `/wizard` → `WizardPage`
  - `/devices` → `DevicesPage`
  - `/automations` → `AutomationsPage`
  - `/settings` → `SettingsPage`
  - `*` → `NotFoundPage`
- Top-level layout component renders a top nav with links to Devices / Automations / Settings (Wizard is hidden when not first-run). Active link is visually distinct.
- Tailwind CSS v4 installed and configured:
  - `tailwind.config.ts` with content globs covering `src/web/**/*.{ts,tsx,html}`.
  - PostCSS / Vite plugin wired in (use `@tailwindcss/vite` — the v4 zero-config Vite plugin).
  - Single global `index.css` with `@import "tailwindcss";` (v4 syntax).
  - Base font, system font stack, sensible defaults. No custom colour theme yet.
- TanStack Query (`@tanstack/react-query`) installed and a `QueryClientProvider` wraps the app.
- Each placeholder page is a React component in `src/web/pages/` with a heading and one paragraph of body text describing the page's purpose. No data fetching yet.
- ESLint passes for all new code.
- All new components and routing wired through TypeScript with no `any`s.

## Tests
- Vitest + React Testing Library:
  - Render the app at `/devices` (using `MemoryRouter`/`createMemoryRouter`) and assert the `<h1>Devices</h1>` (or equivalent) is present.
  - Render at `/automations` and assert the automations heading is present.
  - Render at `/nonsense` and assert NotFound renders.
- No new backend tests required.

## Deliverables ticked
- §3.1 "Multi-step wizard component with progress indicator" — partial (mark as `[~]` with note that only the route shell is in place; actual stepper comes in a follow-up).
- §4 "Devices list grouped by location" — *do not tick yet* (placeholder only).

## Notes
- Do not implement first-run *detection* yet — hardcode "first-run" to true for now and leave a `TODO(p2-XX)` referencing a future issue. The placeholder logic should be in a single hook (`useFirstRun()`) so the future issue only edits one file.
- Keep components small and intentionally boring. The goal is structure, not polish.
- Avoid adding shadcn or any component kit — Tailwind only.
