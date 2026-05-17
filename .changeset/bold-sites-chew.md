---
"zighub": patch
---

Change default web UI port from 8080 to 8282. The previous 8080 default conflicted with too many common dev tools; 8282 is unused by typical home network gear and stays in the user-port range. Overridable via `PORT` env var as before.
