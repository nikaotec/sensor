# Integrations

**Mapped:** 2026-05-08

## External Services

### Supabase (Database)
- **URL:** `https://ueyizghzblngswukfmr.supabase.co`
- **Pooler:** `ueyizghzblngswukfmr.supabase.co:6543`
- **Tables:** `users`, `tenants`, `devices_status`, `telemetry`, `events`
- **Features:** Realtime subscriptions, Row Level Security

### Firebase (Authentication)
- **Project:** `smartrf-f9962`
- **Services:** Firebase Auth (email/password, Google)
- **Legacy:** Firestore for old data

### MQTT Broker
- **Server:** `mqtt.nikaotech.com` / `wss://nikaotech.com/mqtt`
- **Port:** 1883 (MQTT), 9001 (WebSocket)
- **Protocols:** MQTT over TCP + WSS

### Evolution API (WhatsApp)
- **Instance:** `sensor_temperatura`
- **Endpoints:**
  - `POST /message/sendText/{instance}`
  - `POST /message/sendFile/{instance}`
- **Features:** Send/receive WhatsApp messages

### Google Sheets
- **Document:** `1HTEAOfzwIQqUdf3bywOHMFVmktT3N51mtiLzpbP3Lm4`
- **Sheet:** `users_casinhas`
- **Purpose:** User validation for WhatsApp bot
- **Columns:** `NUMERO`, `RULE`

### OpenRouter (AI)
- **Model:** `qwen/qwen3-235b-a22b-2507`
- **Purpose:** Intent classification for WhatsApp bot

## API Integrations

### MQTT Topics
| Topic | Direction | Purpose |
|-------|-----------|---------|
| `esp32c3/data` | ESP32 → n8n | Telemetry + alerts |
| `esp32c3/dashboard` | ESP32 → Dashboard | Real-time updates |
| `esp32c3/status/action` | n8n → ESP32 | Commands (WhatsApp) |
| `sensor/telemetry/data` | n8n → Dashboard | Processed telemetry |

### Supabase Tables (Realtime)
- `devices_status` - Current device state
- `telemetry` - Historical sensor data
- `events` - Alert logs
- `tenants` - Multi-tenant support
- `users` - User management

### Webhooks
| Endpoint | Source | Purpose |
|----------|--------|---------|
| `POST /esp32` | Evolution API | WhatsApp message relay |
| `POST /webhook/pdf` | Dashboard | PDF report generation |

## Hardware Integration

### ESP32-C3 Sensors
| Sensor | Protocol | GPIO |
|--------|----------|------|
| DS18B20 | 1-Wire | GPIO 13 |
| AHT10 | I2C (0x38) | GPIO 20/21 |
| ZMPT101B | ADC | GPIO 35 |
| Battery | ADC | GPIO 34 |
| Door | Digital | GPIO 32 |
| Relays (x4) | Digital | GPIO 23, 19, 18, 5 |
| OLED SH1106 | I2C | GPIO 20/21 |

### Display
- **Type:** OLED 128x64
- **Driver:** SH1106
- **Interface:** I2C

## Security

- **n8n:** Service Account for Firebase (OAuth2 fixed)
- **Supabase:** Row Level Security policies
- **Firebase Auth:** JWT tokens
- **VPS:** SSH key-based access