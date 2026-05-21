<!-- refreshed: 2026-05-20 -->
# Architecture

**Analysis Date:** 2026-05-20

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        ESP32 Firmware (C++)                              │
│  esp32/src/main.cpp — sensors, alerts, relays, display, MQTT pub/sub    │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ MQTT (WSS via Nginx proxy)
                           │ Topics: esp32c3/data, esp32c3/status/action,
                           │         sensor/telemetry/#, devices/#
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Mosquitto MQTT Broker                                │
│  Port 9001 (WebSocket) — proxied through Nginx at /mqtt                 │
└────────┬──────────────────────────────────────┬─────────────────────────┘
         │                                      │
         ▼                                      ▼
┌──────────────────────────┐      ┌──────────────────────────────────────┐
│  n8n Workflows (Node.js) │      │  Dashboard (React 19 + Vite)         │
│  4 workflows:            │      │  dashboard/src/                      │
│  • mqtt receive (WhatsApp│      │  • useMqttData — subscribes to       │
│    + AI Agent intent     │      │    broker topics, normalizes payload  │
│    parsing)              │      │  • useSupabaseData — fetches devices,│
│  • hourly telemetry log  │      │    telemetry history, events          │
│  • hourly snapshot       │      │  • TelemetryService — field mapping  │
│  • dashboard actions     │      │  • TenantContext — multi-tenant      │
│                          │      │  • AuthContext — Firebase Auth       │
│  Integrations:           │      └────────────┬─────────────────────────┘
│  • Supabase (REST)       │                   │
│  • Google Sheets         │                   │ Supabase JS Client
│  • Evolution API (WA)    │                   │ (Realtime subscriptions)
│  • OpenRouter (LLM)      │                   ▼
│  • Gotenberg (PDF)       │      ┌──────────────────────────────────────┐
└──────────┬───────────────┘      │  Supabase (PostgreSQL)               │
           │                      │  Tables: users, tenants,             │
           │                      │  devices_status, telemetry, events   │
           ▼                      │  RLS enabled (permissive policies)   │
┌──────────────────────────┐      │  Realtime: all tables published      │
│  Evolution API (WhatsApp)│      └──────────────────────────────────────┘
│  evolution-api-main/     │
│  Sends/receives WA msgs  │
│  via webhook to n8n      │
└──────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| ESP32 Firmware | Sensor reading, alert detection, relay control, MQTT publish/subscribe, OTA updates, local display | `esp32/src/main.cpp` |
| Mosquitto Broker | MQTT message routing between ESP32, n8n, and Dashboard | Nginx config at `docs/nginx-mqtt-*.conf` |
| n8n — mqtt receive | WhatsApp webhook → AI intent parsing → Google Sheets user mgmt → MQTT command dispatch | `mqtt receive.json` |
| n8n — hourly telemetry | MQTT trigger → parse → filter periodic → insert into Supabase `telemetry` | `n8n_hourly_telemetry.json` |
| n8n — hourly snapshot | Schedule trigger → fetch devices_status → snapshot to telemetry table | `n8n_hourly_snapshot.json` |
| n8n — events logger | MQTT trigger → filter alerts → deduplicate repeats → insert into Supabase `events` | `n8n_events_logger.json` |
| n8n — dashboard actions | MQTT trigger → filter dashboard source → format event log → insert into Supabase `events` | `n8n_dashboard_actions.json` |
| Dashboard SPA | Real-time telemetry visualization, device management, alerts, reports, settings, OTA panel | `dashboard/src/App.tsx` |
| Dashboard Server | Express server serving static build, proxying WebSocket MQTT and n8n API, Firebase Admin | `dashboard/server.js` |
| Evolution API | WhatsApp Business API gateway — receives webhooks, sends messages/documents | `evolution-api-main/` |
| Supabase | PostgreSQL database with realtime subscriptions, stores all persistent state | `supabase_schema.sql` |

## Pattern Overview

**Overall:** Event-driven IoT pipeline with MQTT as the central message bus

**Key Characteristics:**
- **Pub/Sub messaging** — ESP32 publishes telemetry and alerts; n8n and Dashboard subscribe
- **Realtime-first dashboard** — Supabase Realtime + MQTT WebSocket for live updates
- **Multi-tenant isolation** — tenants table, user-tenant mapping, tenant-scoped queries
- **AI-assisted WhatsApp control** — LLM (OpenRouter/Qwen3) parses natural language commands into structured intents
- **Dual data paths** — MQTT for real-time, Supabase for persistence and history

## Layers

**Edge Layer (ESP32 Firmware):**
- Purpose: Sensor data collection, local alerting, relay control, MQTT communication
- Location: `esp32/src/`
- Contains: `main.cpp`, `AlertManager`, `MqttManager`, `OtaManager`, `DisplayManager`, `StorageManager`, sensor modules
- Depends on: WiFi, MQTT broker, NTP time sync
- Used by: n8n workflows (via MQTT), Dashboard (via MQTT WebSocket)

**Message Bus Layer (MQTT Broker):**
- Purpose: Decoupled message routing between edge devices and backend services
- Location: Mosquitto on port 9001 (WebSocket), proxied via Nginx
- Contains: Topics `esp32c3/data`, `esp32c3/status/action`, `sensor/telemetry/#`, `devices/#`
- Depends on: Nginx reverse proxy with WSS support
- Used by: ESP32 firmware, n8n MQTT triggers, Dashboard `useMqttData` hook

**Automation Layer (n8n Workflows):**
- Purpose: Event processing, intent parsing, data persistence, WhatsApp integration
- Location: Root-level JSON workflow files
- Contains: 4 active workflows (mqtt receive, hourly telemetry, hourly snapshot, dashboard actions)
- Depends on: MQTT broker, Supabase API, Google Sheets API, Evolution API, OpenRouter API
- Used by: System operators via WhatsApp, Dashboard actions

**Data Layer (Supabase):**
- Purpose: Persistent storage for devices, telemetry history, events, users, tenants
- Location: Cloud-hosted Supabase project
- Contains: 5 tables (`users`, `tenants`, `devices_status`, `telemetry`, `events`)
- Depends on: n8n Supabase node, Dashboard `@supabase/supabase-js` client
- Used by: All n8n workflows, Dashboard hooks (`useSupabaseData`, `useTelemetryData`)

**Presentation Layer (Dashboard SPA):**
- Purpose: Real-time monitoring, device management, alert visualization, reporting, OTA updates
- Location: `dashboard/src/`
- Contains: React components, hooks, contexts, services, Supabase client
- Depends on: MQTT WebSocket (via Nginx proxy), Supabase Realtime, Firebase Auth
- Used by: End users (admins, managers, tenant users)

## Data Flow

### Primary Telemetry Path (ESP32 → Dashboard)

1. **Sensor reading** — `firmware_loop()` reads temperature, voltage, battery, door state (`esp32/src/main.cpp:283-309`)
2. **MQTT publish** — `enviarDadosWeb()` publishes REALTIME payload to `esp32c3/data` every 2 seconds (`esp32/src/main.cpp:1097-1182`)
3. **Broker routing** — Mosquitto distributes message to all subscribers on matching topics
4. **Dashboard subscription** — `useMqttData` hook receives message, normalizes via `TelemetryService` (`dashboard/src/hooks/useMqttData.ts:211-322`)
5. **State update** — Device state merged into React state, UI re-renders with new values
6. **Supabase sync** — n8n hourly workflow persists snapshot to `telemetry` table (`n8n_hourly_telemetry.json`)

### Alert Path (ESP32 → WhatsApp + Dashboard)

1. **Alert detection** — `AlertManager.check()` evaluates thresholds in firmware loop (`esp32/src/main.cpp:368-475`)
2. **MQTT publish** — `enviarDadosMqtt("ALERTA_*")` publishes alert payload (`esp32/src/main.cpp:1185-1311`)
3. **Dashboard alert** — `useMqttData` detects `ALERTA_` prefix, triggers `onAlert` callback → sound + floating notification (`dashboard/src/hooks/useMqttData.ts:288-289`)
4. **n8n event logging** — Events Logger workflow filters alerts, deduplicates repeats, inserts to Supabase `events` (`n8n_events_logger.json`)
5. **WhatsApp notification** — mqtt receive workflow processes alerts via AI agent, sends formatted message via Evolution API (`mqtt receive.json`)

### Command Path (WhatsApp → ESP32)

1. **WhatsApp message** — User sends natural language command to bot
2. **Evolution API webhook** — Message delivered to n8n webhook at `/webhook/esp32` (`mqtt receive.json` — Webhook node)
3. **AI intent parsing** — OpenRouter Qwen3 model classifies intention and extracts parameters (`mqtt receive.json` — AI Agent node)
4. **User validation** — Code node checks Google Sheets for user registration and role (`mqtt receive.json` — Code in JavaScript node)
5. **MQTT command dispatch** — n8n publishes command to `esp32c3/status/action` topic (`mqtt receive.json` — MQTT node)
6. **Firmware execution** — `handleCommand()` callback processes intent, updates config, controls relays (`esp32/src/main.cpp:618-1094`)

### Command Path (Dashboard → ESP32)

1. **UI action** — User clicks button in Dashboard (e.g., toggle relay, configure limits)
2. **MQTT publish** — `useMqttData.publish()` sends JSON command to `esp32c3/status/action` (`dashboard/src/hooks/useMqttData.ts:346-353`)
3. **Firmware execution** — Same `handleCommand()` callback processes the intent
4. **Action logging** — Dashboard Actions Logger workflow captures the action and logs to Supabase `events` (`n8n_dashboard_actions.json`)

## Key Abstractions

**Device Identity:**
- Purpose: Unique identification of each ESP32 unit
- Examples: `esp32/src/main.cpp:104-110` (`getIdDispositivo()` — derived from ESP MAC address)
- Pattern: 12-character hex string from `ESP.getEfuseMac()`, used as primary key in `devices_status.id`

**Tenant Isolation:**
- Purpose: Multi-tenant data separation for SaaS model
- Examples: `dashboard/src/contexts/TenantContext.tsx`, `supabase_schema.sql:21-28`
- Pattern: `tenants` table with UUID, `users.tenant_ids` array for mapping, all queries scoped by `tenant_id`

**Alert State Machine:**
- Purpose: Debounced alert detection with repeat suppression
- Examples: `esp32/src/AlertManager.cpp`, `esp32/src/main.cpp:35-43`
- Pattern: Three states — `ALERT_STARTED` (first trigger), `ALERT_REPEATED` (ongoing), `ALERT_NORMALIZED` (resolved)

**Telemetry Normalization:**
- Purpose: Handle payload schema evolution across firmware versions
- Examples: `dashboard/src/services/TelemetryService.ts`
- Pattern: Fallback chain — `payload.temp ?? payload.TEMP ?? payload.TEMP_C` — supports both camelCase and UPPER_CASE fields

## Entry Points

**ESP32 Firmware:**
- Location: `esp32/esp32.ino` → `esp32/src/main.cpp`
- Triggers: Power-on, WiFi connection, MQTT message received, timer intervals
- Responsibilities: Initialize hardware, connect to MQTT, read sensors, publish telemetry, handle commands

**n8n Workflows:**
- Location: Root-level JSON files (`mqtt receive.json`, `n8n_hourly_telemetry.json`, etc.)
- Triggers: MQTT messages, schedule cron, webhook POST from Evolution API
- Responsibilities: Parse payloads, persist to Supabase, send WhatsApp messages, manage users

**Dashboard SPA:**
- Location: `dashboard/src/main.tsx` → `dashboard/src/App.tsx`
- Triggers: User navigation, Firebase Auth state change, MQTT message arrival, Supabase Realtime event
- Responsibilities: Render UI, manage auth state, subscribe to MQTT/Supabase, handle user actions

**Dashboard Server (Production):**
- Location: `dashboard/server.js`
- Triggers: HTTP requests on port 80 (or `PORT` env var)
- Responsibilities: Serve static build, proxy WebSocket to Mosquitto, proxy API to n8n, Firebase Admin operations

**Evolution API:**
- Location: `evolution-api-main/src/`
- Triggers: WhatsApp messages, HTTP API calls from n8n
- Responsibilities: WhatsApp session management, message sending/receiving, webhook delivery

## Architectural Constraints

- **Threading:** ESP32 runs single-threaded Arduino loop with `delay(1)` watchdog feed; Dashboard uses React single-threaded event loop with async MQTT/Supabase operations
- **Global state:** ESP32 uses global manager objects (`storage`, `display`, `mqtt`, `ota`, `buttons`) in `esp32/src/main.cpp:20-24`; Dashboard uses React Context (`AuthProvider`, `TenantProvider`, `NotificationProvider`) in `dashboard/src/App.tsx:291-301`
- **Circular imports:** None detected in Dashboard TypeScript modules; ESP32 uses forward declarations (`handleCommand` at `esp32/src/main.cpp:78`)
- **RLS disabled in practice:** Row Level Security enabled but policies are permissive (`USING (true)`) — effectively no row-level filtering at database level (`supabase_schema.sql:103-114`)
- **Timezone dependency:** All workflows use `America/Sao_Paulo` timezone for timestamps and scheduling

## Anti-Patterns

### Permissive RLS Policies

**What happens:** All Supabase tables have `CREATE POLICY "Allow all for ..." ON ... FOR ALL USING (true)` policies
**Why it's wrong:** Any client with the anon key can read/write all data — no tenant isolation at database level
**Do this instead:** Scope policies to `auth.uid()` and tenant membership — see `supabase_schema.sql:109-114`

### Mixed Payload Naming Conventions

**What happens:** ESP32 publishes UPPER_CASE fields (`TEMP_C`, `VOLTAGEM`, `BATERIA`), Supabase uses snake_case (`temperature`, `voltage`, `battery`), Dashboard expects camelCase (`temp`, `inputVoltage`, `batteryVoltage`)
**Why it's wrong:** Requires extensive normalization logic (`TelemetryService.ts` has 100+ lines of field mapping)
**Do this instead:** Standardize on one convention (snake_case recommended) across all layers

### Google Sheets as User Store

**What happens:** User registration and role management stored in Google Sheets (`users_casinhas` spreadsheet) instead of Supabase `users` table
**Why it's wrong:** Creates dual source of truth, slow lookups in n8n workflows, no relational integrity
**Do this instead:** Migrate user management to Supabase `users` table — see `mqtt receive.json` nodes `Get row(s) in sheet1` and `Add Admin to Sheet`

### Hardcoded Spreadsheet IDs

**What happens:** Google Sheets document IDs hardcoded in n8n workflow JSON files (e.g., `1HTEAOfzwIQqUdf3bywOHMFVmktT3N51mtiLzpbP3Lm4`)
**Why it's wrong:** Changing spreadsheets requires editing and re-importing workflow JSON
**Do this instead:** Store spreadsheet IDs in n8n credentials or environment variables

## Error Handling

**Strategy:** Defensive at each layer with fallbacks and local state preservation

**Patterns:**
- **ESP32:** Sensor validation (`tempBruta > -50 && tempBruta < 85`), MQTT connection checks before publish, EEPROM persistence for config survival across reboots
- **n8n:** JSON parse try/catch in Code nodes, empty array returns for invalid AI output, `alwaysOutputData` on Google Sheets nodes
- **Dashboard:** `ErrorBoundary` wrapper, `try/catch` on all Supabase operations, localStorage fallback for device lock state, offline detection with 2-minute timeout
- **Supabase:** Permissive RLS allows operations even without proper auth; errors logged to console but rarely surfaced to user

## Cross-Cutting Concerns

**Logging:** ESP32 uses `Serial.println()` for debug; n8n uses node-level console output; Dashboard uses `console.log/warn/error` with emoji prefixes for categorization
**Validation:** ESP32 validates sensor ranges and calibration factors; n8n validates AI JSON output and user permissions; Dashboard validates form inputs and tenant scoping
**Authentication:** Firebase Auth for Dashboard users (`dashboard/src/contexts/AuthContext.tsx`); Google Sheets lookup for WhatsApp command authorization; ESP32 checks `isAdmin` flag from MQTT command payload

---

*Architecture analysis: 2026-05-20*
