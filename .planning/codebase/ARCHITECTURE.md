# ARCHITECTURE - System Design & Patterns

**Last Mapped:** 2026-05-09  
**Project:** IoT Sensor Monitoring System

## Overview

```
ESP32 Sensors → MQTT Broker → n8n → Supabase/Firestore
                                    ↓
                              React Dashboard ← Firebase Auth
                                    ↑
                              Supabase Realtime
```

## Architecture Pattern

**Layered Architecture with Event-Driven Components**

| Layer | Components |
|-------|------------|
| **Data Layer** | Supabase (PostgreSQL + Realtime) |
| **Service Layer** | n8n workflows, Express server |
| **Presentation Layer** | React SPA with Context API |

## Data Flow

### 1. Sensor Data Ingestion
```
ESP32 → MQTT (esp32c3/data) → n8n MQTT Trigger → Parse JSON → Supabase
```

### 2. Dashboard Real-time Updates
```
Supabase Realtime → React Hooks → Component Re-render
```

### 3. Alert System
```
MQTT Alert Message → useMqttData hook → Audio + Notification Context → Alert UI
```

## Key Patterns

### React Context Pattern
```typescript
// dashboard/src/contexts/
├── AuthContext.tsx    // User authentication state
├── TenantContext.tsx   // Multi-tenant isolation
└── NotificationContext.tsx  // Alert system
```

### Custom Hook Pattern
```typescript
// dashboard/src/hooks/
├── useMqttData.ts      // MQTT subscription + alert handling
├── useSupabaseData.ts  // Supabase queries + realtime
└── useTelemetryData.ts // Telemetry aggregation
```

### Service Layer Pattern
```typescript
// dashboard/src/services/
├── TelemetryService.ts  // Telemetry CRUD operations
└── SupabaseMapper.ts    // Data transformation
```

## Entry Points

| Entry | Location |
|-------|----------|
| Dashboard | `dashboard/index.html` |
| Express Server | `dashboard/server.js` |
| n8n Webhooks | `n8n_*.json` |
| ESP32 Firmware | `esp32/` |

## Multi-Tenancy Model

```
User (Firebase UID)
  └── tenant_ids: [uuid1, uuid2, ...]
       └── Tenant (company)
            └── devices_status (filtered by tenant_id)
```

### Tenant Isolation
- RLS policies filter data by `tenant_id`
- Context provider manages active tenant
- UI shows tenant switcher in bottom-right

## Security Model

| Component | Security |
|-----------|----------|
| Firebase Auth | Email/Password + JWT |
| Supabase | Anon key + RLS policies |
| n8n | Credential management |
| ESP32 | None (local network) |

## State Management

```
App.tsx
├── AuthContext (user, loading, login/logout)
├── TenantContext (currentTenant, setTenantId, availableTenants)
└── NotificationContext (activeAlerts, addAlert, clearAlert)
```

## Realtime Subscriptions

```typescript
// Supabase realtime channels
supabase
  .channel('db-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'devices_status' }, handleChange)
  .subscribe()
```