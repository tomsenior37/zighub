# Deliverables — Zigbee Hub & Automation App

A checklist of every concrete deliverable needed to ship v1. Group order roughly matches build order from the project scope. Tick items as they're completed.

> **Legend**
> - [ ] = not started
> - [~] = in progress (update manually)
> - [x] = done

---

## 0. Project Foundation

- [x] Project name and branding decided — **zighub** (see `project/decisions.md`)
- [x] Git repository initialised with `.gitignore`, `README.md`, licence
- [x] Node + TypeScript scaffold
- [x] Linter, formatter, and pre-commit hooks configured
- [x] CI pipeline (lint, typecheck, tests) on every PR
- [x] Versioning and changelog convention agreed — **changesets** (see `.changeset/` and README)
- [x] Distribution strategy decided — **Docker image + pure web UI** (see `project/decisions.md`)

---

## 1. Core Backend & Storage

- [x] SQLite schema migrations system in place
- [x] `Location` table and CRUD
- [x] `Device` table and CRUD
- [x] `Automation` table and CRUD with draft/active/disabled states
- [x] `BackupRecord` table and CRUD
- [x] `CloudProvider` table and CRUD
- [x] `AuditLog` table and write helper
- [x] Database integrity check on startup
- [x] Atomic backup of database file (consistent snapshot)

---

## 2. Zigbee Stack Integration

- [~] zigbee-herdsman wired in and tested with a real coordinator (adapter skeleton wired in behind `ZigbeeAdapter`, gated by `ZIGBEE_ENABLED=1`; real-coordinator smoke test is a manual QA artefact)
- [x] USB serial port enumeration
- [x] Coordinator auto-detection by USB VID/PID (Sonoff Dongle-E, ConBee II/III, Slaeshs CC2652, others)
- [x] Manual coordinator selection fallback
- [x] Network creation (new random PAN ID, network key)
- [x] Permit-join window management (enable, disable, countdown)
- [x] Device join event handler — store in DB with model lookup
- [x] Device leave / unpair handler
- [x] Live event stream subscription (messages, state changes)
- [x] Device capability extraction from `definition.exposes`
- [x] Manual command dispatch (set state, brightness, colour, etc.)
- [x] Device reachability check (ping/last_seen tracking)

---

## 3. Setup Wizard

### 3.1 Wizard framework
- [x] Multi-step wizard component with progress indicator
- [x] Skip-and-return-later support where appropriate
- [x] First-run detection — wizard runs automatically on empty DB

### 3.2 Welcome screen
- [~] Three paths offered: fresh, restore from local, restore from cloud (UI present; restore paths stubbed pending §7 backend)
- [~] Help links / explanations of each path (cards have descriptions; doc anchors stubbed)

### 3.3 Coordinator detection
- [ ] Auto-detect step with retry
- [ ] "Found X on port Y — use this?" confirmation
- [ ] Manual port picker fallback with help text
- [ ] "What coordinator do I have?" reference page with photos

### 3.4 Network setup
- [ ] Create new network path
- [ ] Detect existing network on coordinator, offer keep-or-wipe
- [ ] Restore network from backup path

### 3.5 Device pairing loop
- [x] Permit-join toggle with countdown
- [x] Live list of newly joined devices in a tray
- [ ] Auto-fetch model name from device database

### 3.6 Identification & naming wizard
- [ ] Distinguish output devices (blink to identify) from input-only (listen for event)
- [ ] Blink command for controllable devices
- [ ] Event-listener mode for input-only devices
- [ ] Friendly-name input
- [ ] Location assignment (with inline "add new location")
- [ ] Skip device, come back later

### 3.7 Completion
- [ ] Summary screen ("X devices added across Y locations")
- [ ] CTA to create first automation or explore dashboard

---

## 4. Device Management UI

- [x] Devices list grouped by location
- [x] "Needs setup" tray prominent at top when non-empty
- [~] Per-device card showing state, capabilities, last-seen (online badge + last-seen relative; live state controls still to come)
- [x] Rename device
- [x] Move device to different location
- [ ] Unpair device with confirmation
- [ ] Manual control panel (toggle, dim slider, colour picker as applicable)
- [x] Pairing mode button accessible outside the wizard
- [ ] Add / rename / delete location

---

## 5. Rule Engine

- [x] YAML schema definition for automations (with versioning)
- [x] YAML parser and validator
- [~] Trigger types: device event, time of day, sun event, manual (device_event + manual done; time-of-day and sun-event deferred)
- [x] Condition types: device state, time window, day of week
- [~] Action primitives implemented:
  - [x] toggle
  - [x] set_state
  - [x] adjust_brightness (with min, max, step)
  - [ ] set_colour
  - [ ] set_colour_temp
  - [x] send_notification (logger-backed; real notifications deferred)
  - [x] delay
  - [ ] run_automation
- [x] Event subscription and matching loop
- [x] Per-automation run history and counters
- [~] Error capture and surfacing (errors stored on runs and surfaced in the history drawer)
- [ ] Manual "test fire" of an automation
- [x] Enable / disable toggle per automation
- [x] Draft → Active promotion flow with mandatory user confirmation
- [ ] Automatic backup created before any approved change goes live

---

## 6. Automation Authoring UI

### 6.1 Visual builder
- [ ] Source device selector (filtered by location)
- [ ] Target device selector
- [ ] Action-button-to-behaviour mapping table
- [ ] Brightness / parameter inputs with min/max/step
- [ ] Live preview of generated YAML
- [ ] Save as draft

### 6.2 Manual YAML editor
- [~] Code editor with syntax highlighting (plain textarea; highlighting deferred)
- [x] Inline validation feedback
- [x] Save as draft

### 6.3 Drafts management
- [x] Drafts list view, separate from active automations
- [ ] Plain-English summary rendered from YAML
- [x] Approve / edit / discard actions
- [ ] Diff view when editing an existing automation (draft vs current active)

### 6.4 Active automations view
- [ ] Grouped by location
- [x] Run history per automation
- [x] Quick toggle enable/disable
- [x] Edit (creates a new draft)
- [ ] Revert to previous version (via backup)

---

## 7. Backup & Restore

### 7.1 Backup creation
- [ ] `.zbk` archive format implementation (manifest + network + db)
- [ ] Manifest schema with checksum
- [ ] Atomic write (write to temp, fsync, rename)
- [ ] Triggers: on significant change (debounced), scheduled, manual
- [ ] Retention policy: keep last 10 local
- [ ] Audit log entry per backup

### 7.2 Backup UI
- [ ] Backups list in settings
- [ ] Manual "Backup now" button
- [ ] Per-backup metadata view (devices, automations, date, size)
- [ ] Download backup to user's filesystem
- [ ] Delete backup (with confirmation)

### 7.3 Restore
- [ ] Restore from local file (drag-drop or picker)
- [ ] Manifest validation and checksum verification
- [ ] Version compatibility check + migrations
- [ ] Preview screen (contents summary)
- [ ] Coordinator compatibility check with warnings
- [ ] Granular options: full / app-data-only / network-only
- [ ] Apply: write network state, replace db, restart backend
- [ ] Post-restore verification — ping all devices, report unreachable

### 7.4 Wizard integration
- [ ] "Restore from local backup" path in first-run wizard
- [ ] "Restore from cloud backup" path in first-run wizard

---

## 8. Cloud Backup — Common

- [ ] Provider interface (authenticate, list, upload, download, delete, quota, test)
- [ ] OS keychain integration (keytar or equivalent) for token storage
- [ ] AES-256-GCM encryption of `.zbk` before upload
- [ ] Encryption key generation, storage in keychain
- [ ] Encryption key embedded (encrypted) in local backups for portability
- [ ] Optional user-passphrase mode for encryption
- [ ] Cloud upload scheduler (daily, configurable)
- [ ] Per-provider retention (last 30)
- [ ] Parallel fan-out uploads to multiple providers
- [ ] Retry with exponential backoff
- [ ] Audit log entries for every cloud op

---

## 9. Cloud Backup — Google Drive (Native)

- [ ] Google Cloud project + OAuth 2.0 desktop client created
- [ ] OAuth flow with localhost redirect
- [ ] Scope locked to `drive.file`
- [ ] Token exchange and refresh handling
- [ ] App-created folder on first connect
- [ ] Upload with `appProperties` metadata for fast preview
- [ ] List backups returning name, timestamp, size, metadata
- [ ] Download backup
- [ ] Delete backup
- [ ] Disconnect / revoke flow
- [ ] Quota check and clear error on full
- [ ] Reconnect flow when refresh token invalidated

---

## 10. Cloud Backup — Dropbox (Native)

- [ ] Dropbox app registered with App folder scope
- [ ] OAuth flow with localhost redirect, offline access
- [ ] Token exchange and refresh handling
- [ ] Upload to `/Apps/<AppName>/`
- [ ] Filename encoding for metadata (device count, automation count, version)
- [ ] List backups
- [ ] Download backup
- [ ] Delete backup
- [ ] Disconnect flow
- [ ] Quota check and clear error on full

---

## 11. Cloud Backup — rclone (Fallback)

- [ ] rclone binary bundled with app (per platform)
- [ ] Instructions screen for `rclone config` setup
- [ ] Remote-name input field
- [ ] Test connection on save
- [ ] Upload via `rclone copy`
- [ ] List via `rclone lsjson`
- [ ] Download via `rclone copy`
- [ ] Delete via `rclone delete`
- [ ] Clear surfacing of rclone stderr in error cases

---

## 12. Settings UI

- [ ] Cloud Backups section with per-provider cards
- [ ] Add Provider picker (Drive, Dropbox, Other)
- [ ] Backup schedule editor
- [ ] Retention editor (local count, cloud count)
- [ ] Encryption mode selector
- [ ] Audit log viewer with filtering
- [ ] Export automations as YAML bundle
- [ ] Import automations from YAML bundle
- [ ] Factory reset (multi-step confirmation, recommends backup first)

---

## 13. MCP Server

### 13.1 Transport
- [ ] stdio transport for Claude Desktop
- [ ] HTTP/SSE transport for Claude.ai connectors
- [ ] OAuth for HTTP transport
- [ ] Config file generator / install helper for Claude Desktop

### 13.2 Tool implementations
- [ ] `list_devices(location?)`
- [ ] `get_device_capabilities(device_id)`
- [ ] `get_device_state(device_id)`
- [ ] `list_locations()`
- [ ] `list_automations(location?)`
- [ ] `get_automation(automation_id)`
- [ ] `validate_automation(yaml)`
- [ ] `propose_automation(yaml, summary)` → returns draft id
- [ ] `list_backups()`
- [ ] `create_backup(label?)`
- [ ] `list_cloud_backups(provider?)`
- [ ] `trigger_cloud_backup()`
- [ ] Documented tool schemas with examples
- [ ] Destructive operations explicitly excluded (restore, unpair-all, factory reset)

---

## 14. Distribution & Install

Per `project/decisions.md`, v1 ships as a Docker image only — no native installers, no code signing, no auto-update mechanism. Reconsider native packaging post-v1.0.

- [x] Docker image build pipeline (multi-arch: linux/amd64, linux/arm64)
- [x] Image published to ghcr.io/tomsenior37/zighub
- [x] Web UI default `localhost:8282` (overridable via `PORT`)
- [x] Coordinator USB device mount documented (`--device /dev/ttyUSB0`)
- [ ] First-run experience tested via `docker pull` + `docker run`
- [x] docker-compose.yml example for typical deployment
- [x] Install documentation (Docker quick start, USB permissions per host OS)

---

## 15. Documentation

- [x] README with quick start
- [ ] Architecture overview
- [ ] User guide — setup, devices, automations, backup
- [ ] MCP integration guide (Claude Desktop config, Claude.ai connector)
- [ ] Troubleshooting guide
- [ ] FAQ
- [ ] Contribution guide (if open source)
- [ ] Privacy and security statement

---

## 16. Quality & Release

- [ ] Unit tests for rule engine
- [ ] Unit tests for backup/restore round-trip
- [ ] Integration tests for MCP tools
- [ ] Manual test plan for wizard flows
- [ ] Manual test plan for cloud providers (Drive, Dropbox, rclone)
- [ ] 30-day soak test on real hardware
- [ ] Coordinator-swap test (back up, swap hardware, restore, devices respond)
- [ ] Crash reporting (opt-in, if telemetry decision is yes)
- [ ] Beta programme with external users
- [ ] v1.0 release checklist signed off
