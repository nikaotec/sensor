# External Integrations

**Analysis Date:** 2026-05-20

## APIs & External Services

**WhatsApp (Evolution API):**
- **Evolution API v2.3.1** — WhatsApp gateway for alert notifications and device command/control via WhatsApp messages.
  - SDK/Client: `baileys` (github:WhiskeySockets/Baileys)
  - Auth: `apikey` header (Evolution API instance `sensor_temperatura`)
  - Location: `evolution-api-main/`
  - Deployed via: Railway (Dockerfile) or self-hosted
  - n8n credential: `evolutionApi` (id: `QqcSRveOqQAdkYAB`)

**OpenAI:**
- **OpenAI API** — AI-powered features within Evolution API (chatbots, message processing).
  - SDK/Client: `openai 4.77.3`
  - Auth: `OPENAI_API_KEY` (env var in Evolution API `.env`)

**Chatwoot:**
- **Chatwoot** — Customer communication platform integrated with Evolution API.
  - SDK/Client: `@figuro/chatwoot-sdk 1.1.16`
  - Auth: Chatwoot API token (env var in Evolution API `.env`)

**Sentry:**
- **Sentry** — Error tracking for Evolution API.
  - SDK/Client: `@sentry/node 8.47.0`
  - Auth: `SENTRY_DSN` (env var)

## Data Storage

**Databases:**
- **Supabase (PostgreSQL)** — Primary application database for IoT sensor data.
  - Connection: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (dashboard `.env`)
  - Client: `@supabase/supabase-js 2.101.0`
  - Tables: `users`, `tenants`, `devices_status`, `telemetry`, `events`
  - Realtime: Enabled on all tables via `supabase_realtime` publication
  - RLS: Enabled but permissive (allow all policies for development)
  - Schema: `supabase_schema.sql`
  - Project ID: `ueyizghzblngswgukfmr` (from schema comment URL)

- **PostgreSQL (Evolution API)** — Evolution API internal data (WhatsApp instances, messages, contacts, chats, integration sessions).
  - Connection: `DATABASE_CONNECTION_URI` (Evolution API `.env`)
  - Client: `@prisma/client 6.1.0`
  - Migrations: `evolution-api-main/prisma/postgresql-migrations/` (60+ migrations)
  - Provider: Configurable (`postgresql` or `mysql`)

- **Firebase Firestore** — Secondary data store for dashboard telemetry snapshots.
  - Connection: Firebase config (dashboard `.env`)
  - Client: `firebase 12.10.0` + `firebase-admin 13.9.0`
  - Location: `us-central`
  - Config: `dashboard/firebase.json`
  - Indexes: `dashboard/firestore.indexes.json` (empty — no custom indexes)

**File Storage:**
- **MinIO** — S3-compatible object storage for Evolution API media (images, documents, audio).
  - Client: `minio 8.0.3`
  - Auth: MinIO access/secret keys (env vars in Evolution API `.env`)

**Caching:**
- **Redis** — Evolution API caching layer (session state, rate limiting).
  - Client: `redis 4.7.0`
  - Connection: `REDIS_URI` (env var in Evolution API `.env`)
- **node-cache 5.1.2** — In-memory caching (Evolution API).

## Authentication & Identity

**Auth Providers:**
- **Firebase Authentication** — Dashboard user authentication.
  - Implementation: Email/password + anonymous auth (`dashboard/firebase.json`)
  - Context: `dashboard/src/contexts/AuthContext.tsx`
  - Services: `dashboard/src/services/firebaseAuth.ts`
  - Components: `dashboard/src/components/Login.tsx`, `dashboard/src/components/SignUp.tsx`

- **JWT Tokens** — Evolution API API authentication.
  - Implementation: `jsonwebtoken 9.0.2`
  - API key per instance (Evolution API model)

- **Supabase RLS** — Row-level security on Supabase tables (currently permissive).
  - Policies: "Allow all for [table]" on all 5 tables

## Messaging & Real-Time

**MQTT Broker:**
- **Mosquitto** — Central message broker for ESP32 ↔ n8n ↔ Dashboard communication.
  - Server: `109.123.240.215` (port `1883`, no auth)
  - Topics:
    - `esp32c3/data` — Telemetry data (n8n trigger)
    - `esp32c3/status/action` — Status commands
    - `esp32c3/web/action` — Web dashboard commands
    - `esp32c3/web_status/action` — Web status responses
    - `esp32c3/dashboard` — Dashboard periodic data
    - `devices/{deviceId}/cmd` — Per-device command topic
    - `devices/{deviceId}/status` — Per-device status (LWT: online/offline)
    - `devices/{deviceId}/logs` — Remote logging
    - `devices/{deviceId}/ota` — OTA update progress/errors
  - ESP32 LWT: Publishes `{"status": "offline"}` to status topic on disconnect (retained)

**WebSocket:**
- **Socket.IO 4.8.1** — Evolution API real-time events to connected clients.
- **Pusher 5.2.0** — Alternative real-time channel (Evolution API).

**Message Queues (Optional — Evolution API):**
- **RabbitMQ** — Event queue for Evolution API webhooks.
  - Client: `amqplib 0.10.5`
  - URI: `RABBITMQ_URI` (env var)
- **NATS** — Alternative messaging backend.
  - Client: `nats 2.29.1`
- **AWS SQS** — AWS queue integration.
  - Client: `@aws-sdk/client-sqs 3.723.0`

## Monitoring & Observability

**Error Tracking:**
- **Sentry** — Evolution API error monitoring (`@sentry/node 8.47.0`).

**Logs:**
- **Pino** — Structured logging (Evolution API, `pino 8.11.0`).
- **Serial** — ESP32 firmware logs via `Serial.println()` (115200 baud).
- **Remote MQTT Logging** — ESP32 publishes logs to `devices/{deviceId}/logs` topic.

## CI/CD & Deployment

**Hosting:**
- **VPS** (`109.123.240.215`) — MQTT broker (Mosquitto), Dashboard (pm2 + Express), firmware hosting (`firmware.nikaotech.com`).
- **Railway** — Evolution API deployment option (`evolution-api-main/src/railway.json`).
  - Builder: Dockerfile
  - Region: `us-east4-eqdc4a`
  - Replicas: 1
  - Restart: ON_FAILURE, max 10 retries
- **Supabase** — Cloud PostgreSQL + realtime + auth.
- **Firebase** — Cloud authentication + Firestore.

**CI Pipeline:**
- **None detected** — No GitHub Actions, GitLab CI, or similar CI configuration found in repo.
- **Manual deploy script** — Dashboard: `npm run deploy` builds, tars, SCPs to VPS, installs deps, restarts pm2.

## Environment Configuration

**Required env vars:**

**Dashboard (`dashboard/.env`):**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key
- Firebase config keys (apiKey, authDomain, projectId, etc.)
- MQTT broker URL (for dashboard MQTT client)

**Evolution API (`evolution-api-main/.env`):**
- `SERVER_PORT` — API port (default: `8080`)
- `SERVER_URL` — Public API URL
- `DATABASE_CONNECTION_URI` — PostgreSQL connection string
- `DATABASE_PROVIDER` — `postgresql` or `mysql`
- `REDIS_URI` — Redis connection string
- `OPENAI_API_KEY` — OpenAI API key
- `SENTRY_DSN` — Sentry error tracking DSN
- `CORS_ORIGIN` — Allowed origins
- `LOG_LEVEL` — Log verbosity
- MinIO credentials (if enabled)
- RabbitMQ/NATS URIs (if enabled)

**ESP32 Firmware (`esp32/src/config/Config.h`):**
- `MQTT_SERVER` — MQTT broker IP (`109.123.240.215`)
- `MQTT_PORT` — MQTT port (`1883`)
- `MQTT_USER` / `MQTT_PASS` — MQTT credentials (currently empty)
- WiFi credentials — Managed at runtime via WiFiManager (fallback in Config.h)

**Secrets location:**
- `.env` files (gitignored) — Dashboard and Evolution API secrets
- Supabase anon key — Client-side (intentionally exposed, RLS should restrict access)
- Firebase config — Client-side (intentionally exposed)
- Evolution API instance API keys — Stored in Evolution API database
- ESP32 MQTT credentials — Hardcoded in `Config.h` (currently empty strings)

## Webhooks & Callbacks

**Incoming:**
- **n8n Webhook** — `POST /generate-report` (PDF report generation workflow, `gerador-relatorios-pdf.json`).
- **Evolution API Webhooks** — Configurable per-instance webhook URLs for WhatsApp events (stored in Evolution API database via Prisma).
- **ESP32 OTA** — HTTP firmware download from `firmware.nikaotech.com` (URL passed via MQTT `otaupdate` command).

**Outgoing:**
- **WhatsApp Messages** — Evolution API sends alerts, responses, and notifications to registered phone numbers via WhatsApp.
  - Triggered by: n8n workflows processing MQTT alerts (ALERTA_TEMP_ALTA, ALERTA_FALTA_ENERGIA, etc.)
  - Workflow: `mqtt receive.json` — processes incoming MQTT → Evolution API → WhatsApp
- **Supabase Inserts** — n8n workflows insert telemetry and events into Supabase tables.
  - `n8n_hourly_telemetry.json` — Periodic telemetry → `telemetry` table
  - `n8n_events_logger.json` — Alert events → `events` table
  - `n8n_hourly_snapshot.json` — Hourly device status → `devices_status` table
- **Google Sheets** — n8n appends admin users to spreadsheet (`users_casinhas`, doc ID: `1HTEAOfzwIQqUdf3bywOHMFVmktT3N51mtiLzpbP3Lm4`).
- **MQTT Publish** — ESP32 publishes telemetry to `esp32c3/data`, `esp32c3/web_status/action`, `esp32c3/dashboard` topics.
- **Firebase** — Dashboard reads/writes to Firestore for auth state and telemetry snapshots.

## Integration Data Flow

```
ESP32 Sensor
    │
    ├── MQTT (109.123.240.215:1883)
    │       │
    │       ├──→ n8n (MQTT Trigger: esp32c3/data)
    │       │       ├──→ Supabase (telemetry, events, devices_status)
    │       │       ├──→ Evolution API (WhatsApp alerts)
    │       │       └──→ Google Sheets (admin user management)
    │       │
    │       ├──→ Dashboard React (MQTT client subscription)
    │       │       ├──→ Real-time device cards
    │       │       ├──→ Alert notifications (audio + visual)
    │       │       └──→ Supabase (alert audit logging)
    │       │
    │       └──← Dashboard commands (devices/{id}/cmd)
    │               ├──→ Relay control
    │               ├──→ Configuration changes
    │               └──→ OTA updates
    │
    └── HTTP (firmware.nikaotech.com)
            └──← OTA firmware downloads

Dashboard React
    ├── Firebase Auth (login/signup)
    ├── Supabase (devices, telemetry, events, users, tenants)
    ├── MQTT Broker (real-time telemetry)
    └── Express API (report generation webhook proxy)

Evolution API
    ├── WhatsApp (Baileys protocol)
    ├── PostgreSQL/MySQL (Prisma ORM)
    ├── Redis (caching)
    ├── OpenAI (AI features)
    ├── Chatwoot (customer communication)
    └── MinIO (media storage)
```

---

*Integration audit: 2026-05-20*
