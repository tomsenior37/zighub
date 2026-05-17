# Project Scope — Zigbee Hub & Automation App

**Working title:** TBD
**Document version:** 0.1 (initial draft)
**Date:** 17 May 2026

---

## 1. Executive Summary

A single, self-contained desktop/server application that replaces both Zigbee2MQTT and Home Assistant for users who want Zigbee-only smart home control without the configuration burden of HA. The app provides device pairing, friendly naming, location-based organisation, automation creation (manual and LLM-assisted via MCP), backup/restore, and cloud backup integration — all from one install with no separate broker, supervisor, or YAML editing required.

The product is opinionated and narrow on purpose: Zigbee only, one binary, simple UI, sensible defaults.

---

## 2. Problem Statement

Existing options force a trade-off:

- **Home Assistant** is powerful but complex. Multiple moving parts (supervisor, add-ons, YAML, breaking changes), steep learning curve, and a UI that prioritises flexibility over simplicity.
- **Zigbee2MQTT** is solid for the Zigbee layer but requires pairing with HA (or similar) for automation, plus an MQTT broker.
- **Commercial hubs** (Hue, SmartThings, Aqara) are simple but locked to their ecosystems and often require cloud connectivity.

Target users — hobbyists, prosumers, and households who want reliable Zigbee automation without becoming sysadmins — fall between these options. This product targets that gap.

---

## 3. Goals & Non-Goals

### Goals
- One installer, one process, one UI for everything Zigbee.
- Wizard-driven setup that gets a first device working in under 10 minutes.
- Draft-mode automations: nothing goes live without user confirmation.
- LLM-assisted authoring via MCP, using the user's existing Claude subscription (no per-call API costs to the developer or user).
- Backup/restore built in from day one, with cloud sync to Google Drive and Dropbox.
- Local-first: the app works fully offline; cloud is optional.

### Non-Goals (v1)
- Non-Zigbee protocols (Z-Wave, Matter, WiFi devices, BLE).
- Integration with Hue Bridge, Sonos, weather APIs, presence/geofencing.
- Voice assistant integration (Alexa, Google Home, HomeKit).
- Mobile-native apps (PWA is acceptable for v1).
- Energy monitoring dashboards, advanced analytics.
- Multi-user accounts or remote access from outside the LAN.

---

## 4. Target User

**Primary:** Technically curious homeowner with 10–50 Zigbee devices who has either tried HA and bounced off the complexity, or is shopping for a hub and doesn't want vendor lock-in.

**Secondary:** Existing Z2M/HA users looking to simplify their stack.

Not targeted: complete non-technical users (they should buy a Hue bridge), large commercial deployments, or developers wanting maximum extensibility.

---

## 5. Architecture Overview

### Single-binary model

```
┌─────────────────────────────────────────────┐
│                The App                       │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Web UI (served on localhost:8282)      │  │
│  │  - Wizard, devices, automations, settings│ │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Backend                                │  │
│  │  - zigbee-herdsman (Zigbee stack)       │  │
│  │  - Rule engine (own automations)        │  │
│  │  - MCP server (stdio + HTTP)            │  │
│  │  - Backup manager                       │  │
│  │  - Cloud sync (Drive, Dropbox, rclone)  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  Storage                                │  │
│  │  - SQLite database                      │  │
│  │  - Local backups folder                 │  │
│  │  - OS keychain for tokens               │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    │
                    │ USB serial
                    ▼
            Zigbee coordinator
            (Sonoff Dongle-E, ConBee, etc.)
```

### Stack recommendation

- **Language/runtime:** Node.js + TypeScript. Reason: zigbee-herdsman is Node-native, single-binary packaging is mature (pkg, nexe, or pure Electron if desktop feel is wanted), and frontend/backend share types.
- **Frontend:** React + Vite, served as static files from the backend. PWA-ready.
- **Database:** SQLite via better-sqlite3 (synchronous, embedded, zero-config).
- **Web framework:** Fastify or Express (whichever the team prefers).
- **MCP:** Official `@modelcontextprotocol/sdk` for Node.

---

## 6. Core Features

### 6.1 Setup Wizard

First-run experience covering:
1. Welcome screen — fresh setup, restore from local backup, restore from cloud backup.
2. Coordinator detection — auto-detect via USB VID/PID, manual port selection fallback.
3. Network creation or restoration — new random keys, or restore from backup.
4. Device pairing loop — permit-join window, auto-detect new joins, friendly-name wizard with blink-or-listen identification.
5. Location assignment — locations are first-class, devices belong to exactly one.
6. Completion — land on main dashboard.

### 6.2 Device Management

- List view grouped by location.
- "Needs setup" tray for unnamed/unassigned devices.
- Pair / unpair / rename / move-to-location.
- View live state and capabilities (exposes from zigbee-herdsman device database).
- Manual control (toggle, dim, set colour, etc.) per device.
- Firmware/OTA updates (v1.1 — not blocking initial release).

### 6.3 Automation Engine

Custom rule engine, not HA. Automation primitives:
- **Triggers:** device event (action, state change), time of day, sun events, manual.
- **Conditions:** device state, time window, automation enabled/disabled.
- **Actions:** toggle, set_state, adjust_brightness (with min/max/step), set_colour, set_colour_temp, send_notification, delay, run_automation.

Automations stored as YAML in SQLite (text column). YAML is the source of truth — human-readable, exportable, importable.

### 6.4 Automation Authoring

Three paths to creating an automation:

1. **Visual builder** — dropdowns for source device → target device, button-to-action mappings, parameter sliders. Generates YAML deterministically.
2. **LLM-assisted via MCP** — user describes the automation in natural language to Claude, which calls MCP tools to inspect devices and propose YAML. Always lands in draft mode.
3. **Manual YAML editor** — for power users.

All paths produce drafts. Drafts require user approval before going live. Approval triggers an automatic local backup (so "revert" is free).

### 6.5 MCP Server

Exposes the backend to the user's Claude subscription. Tools:
- `list_devices(location?)`
- `get_device_capabilities(device_id)`
- `get_device_state(device_id)`
- `list_locations()`
- `list_automations(location?)`
- `get_automation(automation_id)`
- `propose_automation(yaml, summary)` → creates a draft
- `validate_automation(yaml)` → schema check without committing
- `list_backups()` / `list_cloud_backups(provider?)`
- `create_backup(label?)` / `trigger_cloud_backup()`

Two transports: local stdio (for Claude Desktop), HTTP/SSE (for Claude.ai connectors).

Restore is **not** exposed via MCP. Destructive operations require web UI confirmation.

### 6.6 Backup & Restore

**Backup contents (bundled in a `.zbk` archive):**
- `manifest.json` — version, timestamp, app version, device/automation counts, checksum.
- `network.json` — zigbee-herdsman backup (NIB, keys, device table, link keys).
- `app.db` — SQLite snapshot.

**Triggers:**
- Automatic on significant changes (pair, unpair, rename, automation approve/edit). Last 10 retained.
- Scheduled daily at 3am (configurable).
- Manual via UI or MCP.

**Restore paths:**
- Local file picker — drag-drop or browse for `.zbk`.
- Cloud — pick provider, authenticate, choose from list.
- Available both in the first-run wizard and from Settings later.

**Restore flow:**
1. Validate manifest and checksum.
2. Preview contents (device count, automation count, date, source app version).
3. Coordinator compatibility check.
4. Optional: full restore / app data only / network only.
5. Apply.
6. Verification pass — ping each device, report unreachable.

### 6.7 Cloud Backup Integration

Native OAuth integrations for Google Drive and Dropbox; rclone fallback for everything else.

**Google Drive:**
- Desktop OAuth flow with `localhost` redirect.
- Scope: `drive.file` only (no app verification required).
- Dedicated app-created folder, files tagged with `appProperties` for fast preview.

**Dropbox:**
- Desktop OAuth flow, `localhost` redirect.
- Scoped access — App folder mode. Sandbox at `/Apps/<AppName>/`.

**rclone:**
- Bundled binary.
- User runs `rclone config` externally to set up the remote.
- App shells out for uploads, downloads, listing.
- Secondary path, clearly labelled as such in the UI.

**Common behaviour:**
- Tokens stored in OS keychain (keytar).
- AES-256-GCM encryption of `.zbk` before upload, key in keychain.
- Encryption key embedded (encrypted) inside local backups so local-restore preserves cloud access.
- Multiple providers supported simultaneously, uploads fan out in parallel.
- Cloud uploads daily (not every change), last 30 retained per provider.
- Audit log of all backup events.

### 6.8 Settings & Operations

- Cloud provider connect/disconnect.
- Backup schedule and retention.
- Encryption mode (auto / user passphrase).
- Logs viewer.
- Export/import automations (YAML).
- Reset (factory wipe with confirmation).

---

## 7. Data Model (high level)

```
Location
  id, name, parent_id?, created_at

Device
  z2m_id (IEEE address, PK), friendly_name, location_id,
  model, manufacturer, role (input/output/both),
  user_notes, created_at, last_seen_at

Automation
  id, name, primary_location_id, source_yaml, state (draft/active/disabled),
  generation_method (manual/visual/llm), created_at, updated_at,
  last_triggered_at, run_count

BackupRecord
  id, filename, created_at, size_bytes, type (auto/scheduled/manual),
  trigger_reason, local_path?, cloud_uploads (json: [{provider, status, remote_id, uploaded_at}])

CloudProvider
  id, type (drive/dropbox/rclone), display_name, connected_at,
  last_successful_backup_at, last_error?, enabled

AuditLog
  id, timestamp, category, event, details (json)
```

---

## 8. Security Considerations

- **OAuth tokens:** OS keychain only. Never plaintext on disk.
- **Network keys:** Encrypted at rest in backups. Plaintext only in working memory and in the coordinator itself.
- **Cloud backups:** Always encrypted before upload. Default auto-managed key with optional user passphrase mode.
- **Web UI:** Bound to localhost by default. Optional LAN exposure with mandatory password.
- **MCP:** Local stdio requires no auth. Remote HTTP MCP requires OAuth or token.
- **Destructive operations** (restore, factory reset, unpair-all) require web UI confirmation, never MCP.

---

## 9. Out-of-Scope / Deferred

- Mobile-native apps (PWA only for v1).
- Multi-coordinator / multi-network support.
- User accounts and remote access.
- Energy monitoring and analytics dashboards.
- Voice assistant integrations.
- Matter, Z-Wave, Thread support.
- Blueprints / shareable automation templates.
- Migration tools from Z2M or ZHA (planned v1.1).

---

## 10. Success Criteria (v1)

- Fresh user can pair their first device within 10 minutes of install.
- Restore from cloud backup on new hardware works end-to-end without manual intervention beyond OAuth.
- Automation created via MCP and approved through draft mode fires correctly on first trigger.
- App runs unattended for 30 days with no manual intervention and no crashes.
- Coordinator swap (replace hardware, restore from backup) preserves all device pairings.

---

## 11. Open Questions

- Final language/runtime decision (Node assumed; Python via zigpy is the alternative).
- Desktop wrapper: Electron, Tauri, or pure web UI launched in default browser?
- Distribution format: native installers per OS, Docker image, or both?
- Telemetry: opt-in anonymous metrics for crash reporting, or none at all?
- Branding / project name.
- Licence model (open source? source-available? commercial?).
- Hosting story for the remote MCP transport — self-hosted only, or optional managed?

---

## 12. Suggested Build Order

1. **Foundation:** project scaffold, SQLite schema, zigbee-herdsman wiring, coordinator detection.
2. **Setup wizard:** fresh-setup path only (defer restore for now).
3. **Device management:** list, pair, name, locate, manual control.
4. **Rule engine:** action primitives, trigger matching, YAML schema.
5. **Visual automation builder:** simple cases first (device-to-device).
6. **Backup/restore:** local only, including wizard integration.
7. **MCP server:** stdio transport first, then HTTP.
8. **Cloud backups:** Dropbox first (simpler), then Drive, then rclone.
9. **LLM-assisted authoring:** validated through MCP path.
10. **Polish:** audit log, settings, error states, docs.

A working internal alpha should be achievable by step 6.
