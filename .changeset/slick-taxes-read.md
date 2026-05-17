---
"zighub": minor
---

Add a real app shell to the web UI: top-nav layout, four routed placeholder pages (Wizard, Devices, Automations, Settings), a 404 page, and a Tailwind CSS v4 baseline. Routing is via React Router 7's data router; TanStack Query is wired in for server state. `/` redirects to `/wizard` while first-run state is set (hardcoded to true for now — DB-backed detection lands with the Setting table). No real features yet — this is the structural foundation for the wizard, device list, and automation pages.
