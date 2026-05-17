---
"zighub": minor
---

Add `cloud_providers` table and domain CRUD (`create`, `list`, `get`,
`setEnabled`, `recordSuccess`, `recordError`, `deleteCloudProvider`).
Tokens never live in this table — keychain-only per scope §8.
