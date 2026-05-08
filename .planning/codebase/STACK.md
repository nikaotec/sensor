# Tech Stack

**Mapped:** 2026-05-08

## Languages & Runtimes

| Runtime | Version | Purpose |
|---------|---------|---------|
| **C++ (Arduino)** | ESP32 Core 2.0.2+ | ESP32-C3 firmware |
| **TypeScript** | 5.9.3 | React dashboard |
| **JavaScript** | ES2022 | n8n workflows, Node.js |

## Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI framework |
| **Vite** | 7.3.1 | Build tool |
| **TypeScript** | 5.9.3 | Type safety |
| **TailwindCSS** | 3.4.19 | Styling |
| **Recharts** | 3.7.0 | Charts/graphs |
| **Framer Motion** | 12.35.2 | Animations |
| **Lucide React** | 0.575.0 | Icons |
| **MQTT.js** | 5.15.0 | MQTT client |
| **Firebase** | 12.10.0 | Authentication |
| **Supabase** | 2.101.0 | Database client |

## Backend/Infrastructure

| Technology | Purpose |
|------------|---------|
| **n8n** | Workflow automation |
| **Supabase** | PostgreSQL + Realtime |
| **Mosquitto** | MQTT broker (Docker) |
| **Evolution API** | WhatsApp integration |
| **Nginx** | Reverse proxy (VPS) |
| **PM2** | Node.js process manager |

## ESP32 Firmware Stack

| Library | Purpose |
|---------|---------|
| **PubSubClient** | MQTT client |
| **DallasTemperature** | DS18B20 sensors |
| **Adafruit_AHTX0** | AHT10 I2C sensor |
| **Adafruit_GFX** | OLED display |
| **Adafruit_SSD1306** | SSD1306 OLED |
| **ESPAsyncMQTT** | Async MQTT |
| **FreeRTOS** | Task scheduling |

## Configuration

### Environment Variables (Dashboard)

```
VITE_SUPABASE_URL=https://ueyizghzblngswgukfmr.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_MQTT_BROKER_URL=wss://nikaotech.com/mqtt
```

### ESP32 Configuration (`esp32/Config.h`)

```cpp
#define WIFI_SSID "VENANCIO"
#define WIFI_PASS "liza1980"
#define MQTT_SERVER "mqtt.nikaotech.com"
#define MQTT_PORT 1883
```

## Build Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18+ | Dashboard build |
| **Arduino CLI** | 1.0+ | ESP32 compile |
| **Vitest** | 4.1.5 | Testing |
| **ESLint** | 9.39.1 | Linting |

## VPS Configuration

- **IP:** 109.123.240.215
- **Ports:** Dashboard on 4000
- **Nginx proxy:** `/` → `127.0.0.1:4000`