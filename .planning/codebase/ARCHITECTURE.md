<!-- refreshed: 2026-05-07 -->
# Architecture

**Analysis Date:** 2026-05-07

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         External Clients                                    │
│  (ESP32 Devices, Web Browser, Mobile)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
         │                           │                          │
         ▼                           ▼                          ▼
┌─────────────────────────────────┬──────────────────────────┬───────────────────┐
│      ESP32 Firmware             │    Dashboard (React)     │   n8n Workflows   │
│  `[esp32/]`                     │    `[dashboard/src/]`    │   `[*.json]`      │
│                                 │                          │                   │
│  - Sensor Reading              │  - React 19 SPA          │  - MQTT Triggers  │
│  - MQTT Publishing            │  - Real-time Updates     │  - Data Processing│
│  - Local Display              │  - Firebase Auth         │  - Supabase Insert│
└─────────────────────────────────┴──────────────────────────┴───────────────────┘
         │                           │                          │
         ▼                           ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Middleware Layer                                   │
│  `[dashboard/server.js]`                                                     │
│  - Express Server (Port 80)                                                 │
│  - WebSocket Proxy (/mqtt -> Mosquitto :9001)                               │
│  - n8n API Proxy (/api/n8n -> n8n.nikaotech.com)                            │
│  - Firebase Admin Operations                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
         │                           │                          │
         ▼                           ▼                          ▼
┌──────────────────────┬──────────────────────────────┬─────────────────────────┐
│   MQTT Broker        │     Supabase                  │   Firebase             │
│   (Mosquitto)       │     (PostgreSQL + Realtime)   │   (Auth + Firestore)  │
│   Port 1883/9001    │     `[supabase_schema.sql]`   │                        │
└──────────────────────┴──────────────────────────────┴─────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| ESP32 Firmware | Read sensors (temp, humidity, voltage, battery), publish MQTT messages, manage alerts | `[esp32/esp32.ino]`, `[esp32/*.cpp]`, `[esp32/*.h]` |
| Dashboard Frontend | React SPA with real-time device monitoring, alerts, reports, user management | `[dashboard/src/App.tsx]`, `[dashboard/src/components/*]` |
| n8n Workflows | Process MQTT messages, store telemetry in Supabase, send WhatsApp alerts | `[n8n_*.json]` |
| Express Server | Static file serving, WebSocket proxy, API routing, admin actions | `[dashboard/server.js]` |
| Supabase DB | Store devices, telemetry, events, users, tenants with RLS | `[supabase_schema.sql]` |

## Pattern Overview

**Overall:** Event-driven IoT architecture with real-time web dashboard

**Key Characteristics:**
1. **MQTT Pub/Sub** - ESP32 devices publish sensor data; n8n subscribes and processes
2. **Real-time Updates** - Supabase Realtime + MQTT WebSocket feed dashboard
3. **Multi-tenant** - TenantContext manages organization-level data isolation
4. **Authentication** - Firebase Auth with role-based access (admin/manager/user)

## Layers

**Hardware Layer:**
- Purpose: Physical sensor data acquisition
- Location: `[esp32/]`
- Contains: ESP32 C++ firmware, sensor drivers, MQTT client
- Depends on: WiFi network, MQTT broker
- Used by: n8n workflows via MQTT subscription

**Data Processing Layer:**
- Purpose: Transform and persist sensor data
- Location: `[n8n_*.json]`
- Contains: n8n workflow definitions with Code nodes, Supabase operations
- Depends on: MQTT trigger, Supabase client
- Used by: Supabase database

**API/Middleware Layer:**
- Purpose: Route requests, proxy connections, serve static files
- Location: `[dashboard/server.js]`
- Contains: Express server with WebSocket and HTTP proxies
- Depends on: Node.js runtime, environment configuration
- Used by: Browser client, n8n webhooks

**Frontend Layer:**
- Purpose: User interface for monitoring and control
- Location: `[dashboard/src/]`
- Contains: React components, hooks, contexts, services
- Depends: React 19, Supabase client, Firebase Auth, MQTT over WebSocket
- Used by: End users via browser

**Data Storage Layer:**
- Purpose: Persistent storage with real-time subscriptions
- Location: Supabase (PostgreSQL)
- Contains: Tables for devices, telemetry, events, users, tenants
- Accessed by: n8n workflows (write), Dashboard (read via Supabase client)

## Data Flow

### Primary Sensor Data Path

1. **ESP32 reads sensors** (`esp32/esp32.ino:1-500`) - Temperature, humidity, voltage, battery
2. **ESP32 publishes MQTT** - Message to `esp32c3/data` topic
3. **n8n MQTT Trigger** (`n8n_hourly_telemetry.json`) - Receives message
4. **n8n Code Node parses JSON** - Extract device_id, temperature, voltage, etc.
5. **n8n Supabase Insert** - Writes to `telemetry` and `devices_status` tables

### Real-time Dashboard Update Path

1. **Dashboard connects MQTT WebSocket** (`dashboard/src/hooks/useMqttData.ts`)
2. **Supabase subscribes to changes** - `devices_status` table realtime
3. **Dashboard receives updates** - React state updated, UI re-renders
4. **Alert triggered** - If threshold exceeded, notification popup + sound

### Alert Notification Path

1. **ESP32 detects alert condition** - e.g., temperature > threshold
2. **ESP32 publishes alert MQTT** - Topic `esp32c3/data` with ALERTA_* payload
3. **n8n hourly_telemetry workflow** - Filters by TIPO = "alerta"
4. **n8n sends WhatsApp** - Via Evolution-API integration
5. **Dashboard displays popup** - useMqttData hook triggers alert UI

## Key Abstractions

**TenantContext:**
- Purpose: Multi-tenant data isolation and tenant switching
- Examples: `[dashboard/src/contexts/TenantContext.tsx]`
- Pattern: React Context API with provider component

**AuthContext:**
- Purpose: Firebase authentication state management
- Examples: `[dashboard/src/contexts/AuthContext.tsx]`
- Pattern: React Context with useReducer for auth state

**useMqttData Hook:**
- Purpose: Centralized MQTT connection and message handling
- Examples: `[dashboard/src/hooks/useMqttData.ts]`
- Pattern: Custom React hook with useEffect for connection lifecycle

**useSupabaseData Hook:**
- Purpose: Query Supabase with tenant filtering
- Examples: `[dashboard/src/hooks/useSupabaseData.ts]`
- Pattern: Custom hook wrapping Supabase client calls

## Entry Points

**Dashboard Entry:**
- Location: `[dashboard/src/main.tsx]` → `[dashboard/src/App.tsx]`
- Triggers: Browser loads `index.html` → React mounts
- Responsibilities: Initialize providers (Auth, Tenant, Notification), render App

**ESP32 Entry:**
- Location: `[esp32/esp32.ino]` - setup() and loop() functions
- Triggers: Device powers on or resets
- Responsibilities: Initialize sensors, WiFi, MQTT client, start reading loop

**n8n Workflows Entry:**
- Location: `[n8n_hourly_telemetry.json]`, `[mqtt receive.json]`, etc.
- Triggers: MQTT message received on subscribed topic
- Responsibilities: Parse message, validate, store in database, trigger notifications

**Express Server Entry:**
- Location: `[dashboard/server.js:173]` - server.listen()
- Triggers: Node process starts
- Responsibilities: Start HTTP server, configure proxies, serve static files

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop for Express; ESP32 uses FreeRTOS tasks
- **Global state:** React Context providers at App root level; no Redux
- **Circular imports:** None detected between major layers
- **Security:** Firebase Auth for frontend; Supabase anon key for client; admin routes require UID validation

## Anti-Patterns

### Direct Supabase Query in Components

**What happens:** Some components directly call `supabase.from('table').select()` without using hooks
**Why it's wrong:** Inconsistent data fetching patterns, harder to add caching/loading states
**Do this instead:** Use `useSupabaseData` hook defined at `[dashboard/src/hooks/useSupabaseData.ts]`

### Large Component Files

**What happens:** DeviceDetails.tsx (86KB), ManagerPanel.tsx (71KB), Reports.tsx (59KB)
**Why it's wrong:** Hard to maintain, poor code reuse, testing difficulty
**Do this instead:** Extract sub-components to `[dashboard/src/components/dashboard/]` subdirectory

### Hardcoded API URLs

**What happens:** `n8nProxy` target hardcoded to `https://n8n.nikaotech.com`
**Why it's wrong:** Environment-specific configuration embedded in code
**Do this instead:** Use environment variables: `process.env.N8N_URL || 'https://n8n.nikaotech.com'`

## Error Handling

**Strategy:** Try-catch blocks in async operations; React ErrorBoundary for component failures

**Patterns:**
- **Frontend:** ErrorBoundary wrapper in App.tsx catches render errors; each hook has try-catch for API calls
- **Backend:** Express error handlers return JSON errors; n8n has error workflow output nodes
- **ESP32:** Serial.print for debugging; alert via MQTT if critical failure

## Cross-Cutting Concerns

**Logging:**
- Frontend: `console.log` in development; suppress in production
- Server: Custom log format with emoji prefixes (e.g., "✅", "❌", "📡")
- n8n: Built-in execution logging in n8n UI

**Validation:**
- Firebase Auth: Email/password validation by Firebase SDK
- Supabase: RLS policies for row-level security
- Server: Basic input validation on admin endpoints (e.g., UID length check)

**Authentication:**
- Firebase Auth for all dashboard users
- Firebase Admin SDK for server-side operations
- Supabase anon key for client-side database access

---

*Architecture analysis: 2026-05-07*