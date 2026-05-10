# External Integrations

**Analysis Date:** 2026-05-10

## APIs & External Services

**IoT Communication:**
- MQTT Broker - Bidirectional communication with ESP32 devices
  - Host: `109.123.240.215` (production), `173.249.10.19` (backup)
  - Port: 1883
  - Topics: `esp32c3/data`, `esp32c3/status/action`, `esp32c3/web/action`, `esp32c3/dashboard`
  - Client: `mqtt` npm package (dashboard), PubSubClient (ESP32)

**WhatsApp Integration:**
- Evolution API - WhatsApp Business API via Baileys
  - Instance: `sensor_temperatura`
  - Used for: Sending alerts and notifications via WhatsApp
  - Integration: n8n workflow `mqtt receive.json`

**Google Sheets:**
- Google Sheets API - User registration and device management
  - Spreadsheet: `1HTEAOfzwIQqUdf3bywOHMFVmktT3N51mtiLzpbP3Lm4`
  - Integration: n8n workflow nodes

## Data Storage

**Database:**
- Supabase (PostgreSQL)
  - Tables: `users`, `tenants`, `devices_status`, `telemetry`, `events`
  - Connection: Via `@supabase/supabase-js` client
  - Features: Real-time subscriptions enabled
  - Schema: `supabase_schema.sql`

**Alternate:**
- Firebase Firestore (legacy)
  - Used in early development
  - Config: `dashboard/firebase.json`
  - Guide: `Guia_Integracao_Firebase_N8N.md`

**File Storage:**
- Local EEPROM (ESP32) - Device configuration
- Google Sheets - User/device registry

**Caching:**
- None detected

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication (legacy)
  - Email/Password authentication
  - Anonymous login enabled
  - Config: `dashboard/firebase.json`

**Current Approach:**
- Supabase database with role-based access
- Roles: `admin`, `user`
- Tenant-based multi-organization support

## Monitoring & Observability

**Error Tracking:**
- Sentry (Evolution API)
  - Package: `@sentry/node` 8.47.0

**Logs:**
- Console logging (dashboard)
- Pino logger (Evolution API)
- n8n built-in logging

## CI/CD & Deployment

**Hosting:**
- VPS (production server)
  - Host: `109.123.240.215`
  - Path: `/var/www/nikaotech`
  - User: root

**CI Pipeline:**
- Manual deployment via npm script
- Command: `npm run deploy` (from dashboard)

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- Firebase configuration (API key, project ID, etc.)
- MQTT credentials (if required)
- Evolution API credentials

**Secrets location:**
- `.env` files (not committed to git)
- `.gitignore` pattern: `*.env`, `credentials.*`

## Webhooks & Callbacks

**Incoming:**
- n8n Webhook: `iot-command` - Receive commands from dashboard
- MQTT topics: Receive telemetry from ESP32 devices
- Evolution API Webhook: WhatsApp message events

**Outgoing:**
- Supabase Realtime subscriptions
- MQTT publish to ESP32 devices
- WhatsApp messages via Evolution API

## Database Schema

**Tables:**
- `users` - User profiles (Firebase UID as primary key)
- `tenants` - Organization/company records
- `devices_status` - Current device state (MAC address as ID)
- `telemetry` - Historical sensor readings
- `events` - Event logs and alerts
- `report_configs` - Report generation settings

---

*Integration audit: 2026-05-10*