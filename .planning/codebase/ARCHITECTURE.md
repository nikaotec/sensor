<!-- refreshed: 2026-05-10 -->
# Architecture

**Analysis Date:** 2026-05-10

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│            `dashboard/src/` - Vite + React 19              │
├──────────────────┬──────────────────┬───────────────────────┤
│  Dashboard View  │ Device Details   │   Manager Panel       │
│ `components/`    │ `components/`    │   `components/`       │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                            │
│        `src/services/` - TelemetryService, SupabaseMapper    │
│        `src/hooks/` - useMqttData, useSupabaseData           │
│        `src/contexts/` - AuthContext, TenantContext          │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    External APIs                             │
│  Supabase (Realtime DB) │ Firebase Auth │ MQTT WebSocket    │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  n8n Workflows                               │
│  `mqtt receive.json` │ `n8n_hourly_telemetry.json`          │
│  `n8n_events_logger.json`                                  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  ESP32 Firmware                              │
│  `esp32/esp32.ino` - Sensor data collection                  │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Frontend App | React SPA with auth, device monitoring | `dashboard/src/App.tsx` |
| Telemetry Service | Fetch/store sensor data from Supabase | `dashboard/src/services/TelemetryService.ts` |
| MQTT Hook | Real-time WebSocket data subscription | `dashboard/src/hooks/useMqttData.ts` |
| Auth Context | Firebase authentication state | `dashboard/src/contexts/AuthContext.tsx` |
| Tenant Context | Multi-tenant data isolation | `dashboard/src/contexts/TenantContext.tsx` |
| n8n MQTT Receive | Process incoming MQTT messages | `mqtt receive.json` |
| n8n Hourly Telemetry | Store periodic sensor snapshots | `n8n_hourly_telemetry.json` |
| ESP32 Firmware | Sensor readings and MQTT publishing | `esp32/esp32.ino` |

## Pattern Overview

**Overall:** Event-driven IoT monitoring with multi-tenant web dashboard

**Key Characteristics:**
- Real-time data flow via MQTT WebSocket to n8n to Supabase to frontend
- Multi-tenant isolation via tenant_id on all database tables
- Server-side Express proxy for WebSocket and Firebase admin operations
- Firebase Auth for user login, Supabase for data storage

## Layers

**Frontend Layer:**
- Purpose: React SPA for user interaction
- Location: `dashboard/src/`
- Contains: Components, hooks, contexts, services
- Depends on: Supabase client, Firebase client, MQTT
- Used by: Browser users

**Backend Services Layer:**
- Purpose: API proxy, WebSocket relay, admin actions
- Location: `dashboard/server.js`
- Contains: Express app with proxy middlewares
- Depends on: Express, http-proxy-middleware
- Used by: Frontend, MQTT WebSocket

**Data Processing Layer:**
- Purpose: Process MQTT messages, store telemetry, trigger alerts
- Location: Root JSON files (`mqtt receive.json`, `n8n_hourly_telemetry.json`)
- Contains: n8n workflow definitions
- Depends on: MQTT broker, Supabase, Evolution API
- Used by: MQTT broker, scheduled triggers

**Hardware Layer:**
- Purpose: Sensor data collection and transmission
- Location: `esp32/esp32.ino`
- Contains: ESP32 Arduino sketch
- Depends on: WiFi, MQTT client, sensors
- Used by: Physical ESP32 devices

## Data Flow

### Primary Request Path (Device Telemetry)

1. **ESP32 publishes** sensor data to MQTT broker (`esp32/esp32.ino:350`)
2. **n8n MQTT Receive** listens to MQTT topic, processes message (`mqtt receive.json:50`)
3. **Supabase INSERT** stores telemetry to `telemetry` table
4. **Dashboard** subscribes via MQTT WebSocket or polls Supabase Realtime
5. **React** updates UI via TelemetryService

### Secondary Flow (Alert Notification)

1. **ESP32** detects threshold breach, sends alert via MQTT
2. **n8n MQTT Receive** processes alert payload
3. **Supabase events table** logs alert with severity
4. **useMqttData hook** receives alert, triggers NotificationContext
5. **App.tsx** displays floating alert with sound

### Auth Flow

1. **User** authenticates via Firebase (Login component)
2. **AuthContext** stores current user with role
3. **TenantContext** loads available tenants from Supabase
4. **Dashboard** filters data by currentTenant.id

**State Management:**
- React Context for auth (AuthContext), tenant (TenantContext), notifications (NotificationContext)
- useState for screen navigation and device selection
- Supabase Realtime subscriptions for live data updates

## Key Abstractions

**TelemetryService:**
- Purpose: Abstract Supabase queries for sensor data
- Examples: `getDevices()`, `getTelemetry(deviceId, range)`, `updateDeviceConfig()`
- Pattern: Singleton service with Supabase client

**useMqttData Hook:**
- Purpose: Subscribe to MQTT WebSocket for real-time updates
- Examples: `useMqttData(tenantId, role, filters, onAlert)`
- Pattern: Custom React hook with WebSocket connection

**TenantContext:**
- Purpose: Multi-tenant data isolation
- Pattern: React Context provider wrapping app

## Entry Points

**Frontend Entry:**
- Location: `dashboard/src/main.tsx`
- Triggers: Browser loads index.html
- Responsibilities: Render React app with providers

**Dashboard Server Entry:**
- Location: `dashboard/server.js`
- Triggers: Node.js starts server (port 80 or PORT env)
- Responsibilities: Serve static files, proxy MQTT/WebSocket, proxy n8n API

**n8n Workflows:**
- Location: `mqtt receive.json`, `n8n_hourly_telemetry.json`
- Triggers: MQTT message received, hourly cron schedule
- Responsibilities: Process sensor data, store in Supabase

**ESP32 Firmware:**
- Location: `esp32/esp32.ino`
- Triggers: ESP32 boots, connects to WiFi
- Responsibilities: Read sensors, publish MQTT, handle commands

## Architectural Constraints

- **Threading:** Single-threaded Node.js (Express), async/await for concurrency
- **Global state:** No module-level singletons in frontend (all via React Context)
- **Circular imports:** None detected - services isolated from components
- **Realtime latency:** MQTT WebSocket proxy adds ~100ms, Supabase Realtime ~50ms

## Anti-Patterns

### Mixed Concerns in App.tsx

**What happens:** Alert sound playback, Supabase logging, device name change handling all in App.tsx
**Why it's wrong:** App.tsx becomes a 280-line "god component" handling UI, audio, database, and MQTT
**Do this instead:** Extract to custom hooks (useAlerts, useDeviceNameChanges) in `src/hooks/`

### Hardcoded Tenant Lookup

**What happens:** `availableTenants.find(t => t.name.toLowerCase() === alert.EMPRESA?.toLowerCase())`
**Why it's wrong:** String matching is fragile; should use device.tenant_id from MQTT payload
**Do this instead:** Include tenant_id in MQTT message from ESP32 or resolve via device lookup

### Server-Side Firebase Admin in Express

**What happens:** `exec('firebase auth:delete --uid ...')` spawns CLI process
**Why it's wrong:** Process spawning is slow and error-prone; Firebase Admin SDK is available
**Do this instead:** Use firebase-admin package with service account

## Error Handling

**Strategy:** Try-catch blocks with console.error, user-visible toast notifications

**Patterns:**
- Supabase errors: Logged to console, shown as alert if critical
- MQTT disconnects: Auto-reconnect via mqtt.js library
- Auth errors: Redirect to login screen

## Cross-Cutting Concerns

**Logging:** Console.log/error throughout; Supabase events table for persistence
**Validation:** Firebase Auth validates email/password; Supabase handles DB constraints
**Authentication:** Firebase Auth for frontend users; Firebase CLI for admin delete (via server.js)

---

*Architecture analysis: 2026-05-10*