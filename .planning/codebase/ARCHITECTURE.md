<!-- refreshed: 2026-05-07 -->
# Architecture

**Analysis Date:** 2026-05-07

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ESP32 Device Layer                                   │
│                  `esp32/` - Sensor Firmware                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                              MQTT Broker                                     │
│                    (Message Transport Layer)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                     n8n Workflows Layer                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │mqtt receive │  │hourly       │  │dashboard    │  │PDF Report       │   │
│  │.json        │  │telemetry    │  │actions      │  │Generator        │   │
│  └─────────────┘  │.json        │  │.json        │  │gerador-         │   │
│                   └─────────────┘  └─────────────┘  │relatorios-pdf    │   │
│                                                       │.json             │   │
│                                                       └─────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Data Layer                                          │
│  ┌─────────────────────────┐        ┌─────────────────────────────────┐     │
│  │   Supabase              │        │   Firebase                     │     │
│  │   `supabase_schema.sql` │        │   `src/firebase/config.ts`     │     │
│  │   (Database)            │        │   (Authentication)             │     │
│  └─────────────────────────┘        └─────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────────────────┤
│                     React Dashboard Layer                                   │
│  `dashboard/src/` - React/TypeScript SPA                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │components/  │  │hooks/       │  │services/   │  │contexts/        │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────┤
│                    Integration Layer                                        │
│              `evolution-api-main/` - WhatsApp API                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| ESP32 Firmware | Read sensors (temp, humidity, voltage, battery), publish to MQTT | `esp32/esp32.ino` |
| MQTT Receive | Process incoming MQTT messages, route to appropriate handlers | `mqtt receive.json` |
| Hourly Telemetry | Parse sensor payloads, insert into Supabase telemetry table | `n8n_hourly_telemetry.json` |
| Dashboard Actions | Handle user actions from React dashboard | `n8n_dashboard_actions.json` |
| Events Logger | Log system events and alerts to Supabase events table | `n8n_events_logger.json` |
| PDF Generator | Generate PDF reports from telemetry data | `gerador-relatorios-pdf.json` |
| Supabase DB | Store telemetry, device status, events, users, tenants | `supabase_schema.sql` |
| Firebase Auth | User authentication via Firebase | `dashboard/src/firebase/config.ts` |
| React Dashboard | UI for device monitoring, alerts, reports | `dashboard/src/App.tsx` |
| Evolution API | WhatsApp notifications to users | `evolution-api-main/` |

## Pattern Overview

**Overall:** Event-Driven Architecture with Workflow Automation

**Key Characteristics:**
- **MQTT-based real-time data flow** from ESP32 devices to n8n workflows
- **n8n workflow orchestration** for data processing, storage, and notifications
- **Dual authentication** using Firebase (frontend auth) and Supabase (database)
- **Realtime subscriptions** via Supabase Realtime for live dashboard updates
- **Webhook-driven integrations** for WhatsApp (Evolution API) and Google Sheets

## Layers

**Device Layer:**
- Purpose: Sensor data acquisition and transmission
- Location: `esp32/`
- Contains: Arduino C++ firmware (esp32.ino, AlertManager.cpp/h, Config.h, etc.)
- Depends on: MQTT broker
- Used by: MQTT broker

**Message Transport Layer:**
- Purpose: Real-time message routing between devices and workflows
- Location: MQTT broker (external service)
- Contains: N/A (external)
- Depends on: Device Layer
- Used by: n8n workflows

**Workflow Processing Layer:**
- Purpose: Data transformation, routing, and business logic
- Location: `*.json` files in root
- Contains: n8n workflow definitions (MQTT trigger, Code nodes, Supabase operations)
- Depends on: MQTT messages, Supabase, Evolution API, Google Sheets
- Used by: Data Layer, Integration Layer

**Data Layer:**
- Purpose: Persistent storage and authentication
- Location: `supabase_schema.sql`, `dashboard/src/supabase/`, `dashboard/src/firebase/`
- Contains: SQL schema, Supabase client config, Firebase config
- Depends on: n8n workflows, React dashboard
- Used by: React dashboard

**Application Layer:**
- Purpose: User interface for monitoring and control
- Location: `dashboard/src/`
- Contains: React components, hooks, contexts, services
- Depends: Supabase client, Firebase auth, MQTT
- Used by: End users

**Integration Layer:**
- Purpose: External API integrations (WhatsApp, Google Sheets)
- Location: `evolution-api-main/`
- Contains: Evolution API server for WhatsApp messaging
- Depends on: n8n workflows
- Used by: n8n workflows

## Data Flow

### Primary Request Path (Sensor Data)

1. **ESP32 Device** reads sensors → publishes JSON to MQTT topic `esp32c3/data`
2. **MQTT Trigger** in `mqtt receive.json` receives message (`mqtt receive.json:4-15`)
3. **Parse Payload** Code node parses JSON string (`mqtt receive.json:17-30`)
4. **Filter Periodic** checks for `TIPO=relatorio_diario` (`mqtt receive.json:32-46`)
5. **Insert Hourly Log** writes to Supabase `telemetry` table (`n8n_hourly_telemetry.json:96-140`)
6. **Dashboard** subscribes to Supabase Realtime for live updates

### Secondary Flow (User Actions)

1. **React Dashboard** user clicks action → API call to n8n webhook or Supabase
2. **n8n Dashboard Actions** workflow receives webhook (`n8n_dashboard_actions.json`)
3. **Code** processes request, calls Supabase or Evolution API
4. **Response** returns to dashboard

### Alert/Notification Flow

1. **Events Logger** detects threshold violation (`n8n_events_logger.json`)
2. **Evolution API** sends WhatsApp message via Evolution API node
3. **Dashboard** displays real-time alert via Supabase subscription

**State Management:**
- **Firebase Auth** - User session state in AuthContext (`dashboard/src/contexts/AuthContext.tsx`)
- **Tenant Context** - Multi-tenant filtering in TenantContext
- **Supabase Realtime** - Live device data via subscription in `useSupabaseData.ts`
- **MQTT Client** - Real-time device updates in `useMqttData.ts`

## Key Abstractions

**Supabase Client:**
- Purpose: Database operations and realtime subscriptions
- Examples: `dashboard/src/supabase/config.ts`
- Pattern: Singleton client with environment config

**Firebase Auth Service:**
- Purpose: User authentication and management
- Examples: `dashboard/src/services/firebaseAuth.ts`
- Pattern: Firebase Auth SDK with React Context integration

**MQTT Hooks:**
- Purpose: Real-time sensor data streaming
- Examples: `dashboard/src/hooks/useMqttData.ts`, `dashboard/src/hooks/useMqtt.ts`
- Pattern: Custom React hooks wrapping MQTT.js client

**n8n Workflow Nodes:**
- Purpose: Business logic and data transformation
- Examples: All `*.json` files in root
- Pattern: Graph-based workflow with trigger → process → output nodes

## Entry Points

**ESP32 Device:**
- Location: `esp32/esp32.ino`
- Triggers: Hardware timer, sensor readings
- Responsibilities: Initialize sensors, connect to WiFi/MQTT, publish telemetry

**n8n Workflows:**
- Location: `mqtt receive.json`, `n8n_hourly_telemetry.json`, etc.
- Triggers: MQTT messages, scheduled (cron), webhooks
- Responsibilities: Process data, write to database, trigger notifications

**React Dashboard:**
- Location: `dashboard/src/main.tsx` → `dashboard/src/App.tsx`
- Triggers: User navigation, page load
- Responsibilities: Render UI, manage state, handle user interactions

**Server (Express):**
- Location: `dashboard/server.js`
- Triggers: HTTP requests to `/api/*`
- Responsibilities: Proxy requests, serve static files in production

## Architectural Constraints

- **Threading:** N/A (not applicable - Node.js is single-threaded, n8n handles async)
- **Global state:** Minimal - Firebase Auth and Supabase client are module-level singletons
- **Circular imports:** Not detected in codebase
- **Multi-tenant:** Supported via `tenant_id` column in devices_status, events tables
- **Authentication split:** Firebase for auth, Supabase for data access (anon key)

## Anti-Patterns

### Dual Authentication System

**What happens:** Firebase handles user authentication while Supabase uses anon key for all database access
**Why it's wrong:** Security inconsistency - anyone with the anon key can access all data; RLS disabled in Supabase
**Do this instead:** Use Supabase Auth with proper RLS policies, or implement consistent auth layer

### Large Workflow Files

**What happens:** `mqtt receive.json` contains 2500+ lines with complex routing logic
**Why it's wrong:** Hard to maintain, debug, and version control; single point of failure
**Do this instead:** Split into smaller focused workflows using sub-workflows or n8n's workflow inheritance

### Hardcoded Configuration in Frontend

**What happens:** Dashboard uses `.env` for Supabase URL/key but these are exposed to client
**Why it's wrong:** Anon key visible in browser network tab; no server-side validation
**Do this instead:** Use server-side proxy for sensitive operations, implement proper API gateway

## Error Handling

**Strategy:** Node-level error catching with user-friendly error UI

**Patterns:**
- React ErrorBoundary component (`dashboard/src/components/ErrorBoundary.tsx`)
- Try-catch in n8n Code nodes with error output routing
- Supabase error handling in hooks via `.error` property
- MQTT reconnection logic with exponential backoff

## Cross-Cutting Concerns

**Logging:** Console.log in React, n8n built-in execution logging
**Validation:** TypeScript for frontend validation, n8n expression validation
**Authentication:** Firebase Auth (frontend), Supabase anon key (database)
**Real-time:** Supabase Realtime subscriptions, MQTT.js for device data stream

---

*Architecture analysis: 2026-05-07*