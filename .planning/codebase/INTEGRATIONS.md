# External Integrations

**Analysis Date:** 2026-05-07

## APIs & External Services

**AI/LLM:**
- OpenAI API - GPT-4, GPT-5-mini for AI chatbot integration
  - SDK: `openai` npm package
  - Used in: `esp32.json` workflow with `gpt-5-mini` model
  - Credential: `openAiApi` named "OpenAi account"
- Ollama (local) - Self-hosted LLM (`qwen2.5:3b` model)
  - Used in: `esp32.json` workflow
  - Credential: `ollamaApi` named "Ollama account"

**Communication:**
- Evolution API - WhatsApp multi-device gateway
  - SDK: Custom integration via REST API
  - Used in: `mqtt receive.json` workflow for WhatsApp messaging
  - Credential: `evolutionApi` named "Evolution account"
  - Instance: `sensor_temperatura`
  - Base URL: Internal Docker network, port 8080

**IoT/MQTT:**
- MQTT Broker (Mosquitto) - Sensor data ingestion
  - Topic: `esp32c3/data` for telemetry
  - Topic: `esp32c3/status/action` for dashboard actions
  - Used in: Multiple n8n workflows
  - Running in Docker container

**Cloud/Misc:**
- Google Sheets API - User management spreadsheet
  - Used in: `mqtt receive.json` for admin/user storage
  - Spreadsheet ID: `1HTEAOfzwIQqUdf3bywOHMFVmktT3N51mtiLzpbP3Lm4`
  - Credential: `googleSheetsOAuth2Api` named "Google Sheets account"

## Data Storage

**PostgreSQL (Supabase):**
- Type: Cloud-hosted PostgreSQL (Supabase)
- Project ID: `ueyizghzblngswgukfmr`
- Tables: `users`, `tenants`, `devices_status`, `telemetry`, `events`
- Features: Realtime subscriptions enabled
- Connection: Via `@supabase/supabase-js` client

**PostgreSQL (Evolution API):**
- Type: Docker-hosted PostgreSQL 15
- Database: `evolution_db`
- User: `nikaotec`
- Container: `postgres` on port 5432
- Managed by: Prisma ORM

**Firestore (Firebase):**
- Type: Firebase Cloud Firestore (NoSQL)
- Database: `(default)` in `us-central`
- Project: `tech-smartrf` / `smartrf-iot-dashboard`
- Collections: Real-time sensor data
- Used in: Web dashboard for live telemetry

**Local File Storage:**
- Dashboard: `dashboard/src/data/telemetry.json` for mock/dev telemetry
- Evolution API: `/evolution/instances` Docker volume for WhatsApp session data

## Authentication & Identity

**Firebase Authentication:**
- Provider: Firebase Auth
- Methods: Email/Password + Anonymous
- Config: `dashboard/firebase.json`
- Used in: Web dashboard user sessions

**Supabase Auth:**
- Note: RLS policies set to permissive for development
- Future: Should configure proper RLS policies

**Evolution API JWT:**
- Token-based authentication for WhatsApp API
- Managed by: Evolution API middleware

## Monitoring & Observability

**Error Tracking:**
- Sentry (`@sentry/node`) - Error monitoring
- Version: 8.47.0
- Used in: Evolution API

**Logs:**
- Pino (structured logging) - Evolution API
- n8n built-in logging (`N8N_LOG_LEVEL=debug`)
- Location: Application logs + n8n database

## CI/CD & Deployment

**Hosting:**
- Cloud server: `109.123.240.215` (deployment target)
- DNS: `n8n.nikaotech.com` (n8n instance)
- Web dashboard: `/var/www/nikaotech`
- Process manager: PM2

**CI Pipeline:**
- GitHub Actions workflows in `evolution-api-main/.github/workflows/`
- Docker image publishing to registry
- Code quality checks

**Containers:**
- Docker Compose orchestration (`docker-compose.yaml`)
- Services: Evolution API, Redis, PostgreSQL, Mosquitto, n8n
- Network: `evolution-net` bridge driver

## Environment Configuration

**Required env vars:**
- Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Firebase: `VITE_FIREBASE_*` credentials
- MQTT: Broker connection settings
- n8n: `WEBHOOK_URL`, `N8N_HOST`, `N8N_PROTOCOL`
- Evolution API: `DATABASE_PROVIDER`, Redis/Postgres connection

**Secrets location:**
- `.env` files (gitignored)
- n8n credentials storage (encrypted)
- Service account JSON files for Google APIs

## Webhooks & Callbacks

**n8n Webhooks:**
- MQTT trigger for real-time sensor data
- Scheduled workflows (hourly snapshots)
- Webhook endpoints for external triggers

**Outgoing:**
- WhatsApp messages via Evolution API
- Google Sheets API updates
- Supabase database writes

---

*Integration audit: 2026-05-07*