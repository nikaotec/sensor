# Architecture

**Mapped:** 2026-05-08

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          SmartRF Architecture                       │
└──────────────────────────────────────────────────────────────────────┘

  ESP32-C3 ──MQTT──► Mosquitto ──► n8n Workflows ──► Supabase
       │                                    │
       │                                    ▼
       │                              Evolution API
       │                                    │
       │                              WhatsApp Bot
       │                                    │
       │                                    ▼
       ▼                              Dashboard (React)
       │                                    │
       └──Dashboard (Realtime)◄────────────┘
```

## Component Architecture

### 1. ESP32-C3 Firmware (Edge)

**Pattern:** Event-driven with FreeRTOS tasks

```
esp32/esp32.ino (main loop)
├── AppNetworkManager - WiFi + MQTT
├── AlertManager - Alert debounce state machine
├── VoltageSensor - FreeRTOS task (Core 0)
├── DisplayManager - OLED display + paging
├── StorageManager - EEPROM persistence
├── ButtonManager - PCF8574 I2C expander
└── AmbientSensor - AHT10 I2C
```

**Key Patterns:**
- Debounce state machine for alerts
- MQTT pub/sub with callback
- EEPROM address-based storage
- FreeRTOS task for voltage sampling

### 2. Dashboard (Frontend)

**Pattern:** React Context + Custom Hooks

```
dashboard/src/
├── contexts/
│   ├── AuthContext.tsx - Firebase Auth
│   ├── TenantContext.tsx - Multi-tenant
│   └── NotificationContext.tsx - Toast system
├── hooks/
│   ├── useMqttData.ts - MQTT WebSocket
│   ├── useSupabaseData.ts - DB queries
│   ├── useTelemetryData.ts - Aggregation
│   └── useReportGenerator.ts - PDF generation
└── components/
    ├── Dashboard.tsx - Main view
    ├── DeviceList.tsx - Device grid
    ├── DeviceDetails.tsx - Device detail
    └── device/ - Sub-components
```

### 3. n8n Workflows (Automation)

**Pattern:** Event-driven pipelines

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `n8n_mqtt_to_supabase` | MQTT | Real-time telemetry |
| `n8n_events_logger` | MQTT | Alert logging |
| `n8n_dashboard_actions` | MQTT | Dashboard updates |
| `n8n_hourly_telemetry` | MQTT | Periodic filtering |
| `gerador-relatorios-pdf` | Webhook | PDF generation |
| `mqtt receive` | Webhook | WhatsApp bot |

### 4. Database (Supabase)

**Pattern:** Multi-tenant with RLS

```
users (Firebase UID) ──► tenants (UUID)
     │                        │
     ▼                        ▼
devices_status ◄───────── tenant_id
     │
     ▼
telemetry (time-series)
     │
     ▼
events (alerts)
```

## Data Flow

### Telemetry Flow
```
1. ESP32 reads sensors
2. Publishes MQTT (esp32c3/data)
3. Mosquitto delivers to n8n
4. n8n parses + validates
5. Upserts devices_status
6. Inserts telemetry record
7. Supabase Realtime broadcasts
8. Dashboard receives via WebSocket
9. UI updates in real-time
```

### Alert Flow
```
1. ESP32 detects threshold breach
2. AlertManager applies debounce (5s)
3. Publishes MQTT with ALERTA_* type
4. n8n logs to events table
5. Dashboard shows toast + audio
6. User acknowledges via WhatsApp or Dashboard
```

### Command Flow
```
1. User sends WhatsApp message
2. Evolution API forwards to n8n webhook
3. AI Agent classifies intent
4. n8n publishes MQTT command
5. ESP32 receives + executes
6. ESP32 sends feedback via MQTT
7. n8n sends response via WhatsApp
```

## Key Design Decisions

| Decision | Rationale |
|----------|------------|
| MQTT for real-time | Low latency, native ESP32 support |
| Supabase Realtime | Built-in WebSocket, no custom server |
| Firebase Auth | User management, social login |
| n8n for automation | Visual workflow, easy to modify |
| Evolution API | WhatsApp Business API |
| EEPROM for ESP32 config | Persistent across reboots |

## Entry Points

| Component | Entry Point |
|-----------|-------------|
| ESP32 | `esp32/esp32.ino` - setup() + loop() |
| Dashboard | `dashboard/src/main.tsx` - React root |
| WhatsApp Bot | `mqtt receive.json` - n8n webhook |
| PDF Generation | `gerador-relatorios-pdf.json` - n8n webhook |