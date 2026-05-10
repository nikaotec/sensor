# INTEGRATIONS - External Services & APIs

**Last Mapped:** 2026-05-09  
**Project:** IoT Sensor Monitoring System

## Supabase (Primary Database)

```typescript
// Location: dashboard/src/supabase/config.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ueyizghzblngswgukfmr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // anon key
)
```

### Tables
| Table | Purpose |
|-------|---------|
| `users` | Firebase UID, name, email, role, tenant_ids |
| `tenants` | Companies/tenants (id, name, status, plan, colors) |
| `devices_status` | Current device state (MAC, temp, humidity, battery) |
| `telemetry` | Historical sensor data |
| `events` | Alerts and audit logs |

### Features Used
- **Realtime Subscriptions** (devices_status, telemetry, events, tenants)
- **RLS Policies** (Row Level Security)
- **PostgreSQL Functions** (gen_random_uuid, gen_random_bytes)

## Firebase Authentication

```typescript
// Location: dashboard/src/firebase/config.ts
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "smartrf-iot-dashboard"
}
```

### Providers
- **Email/Password** authentication

## MQTT Broker

| Config | Value |
|--------|-------|
| Protocol | MQTT |
| Topic Pattern | `esp32c3/data`, `sensor/data` |
| Message Format | JSON |

### n8n Workflows (MQTT Processing)
- `n8n_hourly_telemetry.json` - Periodic data logging
- `n8n_dashboard_actions.json` - Device command handling
- `n8n_events_logger.json` - Alert event logging

## External APIs

| Service | Usage |
|---------|-------|
| Google Firestore | Legacy storage (being migrated to Supabase) |
| Evolution API | WhatsApp integration (evolution-api-main/) |

## ESP32 Communication

```cpp
// Topic subscription
MSG_TOPIC_DATA = "esp32c3/data"

// Payload example
{
  "TIPO": "relatorio_diario",
  "ID_DISPOSITIVO": "XX:XX:XX:XX:XX:XX",
  "TEMP_C": 25.0,
  "TEMP_MAX": 28.5,
  "TEMP_MIN": 22.1,
  "UMIDADE": 65,
  "BATERIA": 3.8,
  "VOLTAGEM": 4.2,
  "EMPRESA": "NikaoTech"
}
```

## WhatsApp Integration

- **Evolution API** (`evolution-api-main/`) - WhatsApp bot instance management
- **n8n Integration** - Workflow triggers via WhatsApp