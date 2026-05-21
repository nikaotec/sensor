# Technology Stack

**Analysis Date:** 2026-05-20

## Languages

**Primary:**
- **C++ (C++17)** — ESP32 firmware (`esp32/src/*.cpp`, `esp32/src/*.h`, `esp32/esp32.ino`). Arduino framework with ESP32 toolchain (xtensa-esp32-elf-gcc, F_CPU=240MHz).
- **TypeScript (~5.9.3)** — React dashboard (`dashboard/src/**/*.ts`, `dashboard/src/**/*.tsx`). Strict mode enabled.
- **TypeScript (~5.7.2)** — Evolution API backend (`evolution-api-main/src/**/*.ts`). CommonJS module system.
- **JavaScript (ES modules)** — n8n workflow Code nodes (inline JS for payload parsing, data transformation).

**Secondary:**
- **SQL** — Supabase schema migrations (`supabase_schema.sql`, `add_*.sql`, `alter_*.sql`), Evolution API Prisma migrations (`evolution-api-main/prisma/postgresql-migrations/`, `evolution-api-main/prisma/mysql-migrations/`).

## Runtime

**Environment:**
- **ESP32 Arduino** — ESP32 hardware (ESP32-C3), compiled via Arduino IDE. Toolchain: `xtensa-esp32-elf-gcc`. CPU: 240MHz. C++17 standard.
- **Node.js** — Dashboard backend (Express 5.x server) and Evolution API backend (Express 4.x).
- **n8n** — Workflow automation engine (version not pinned in repo; workflows use `n8n-nodes-base` and `n8n-nodes-evolution-api` node types).

**Package Manager:**
- **npm** — Used across all Node.js projects.
- Lockfiles: `dashboard/package-lock.json` present, `evolution-api-main/package-lock.json` present.

## Frameworks

**Core:**
- **React 19.2.0** — Dashboard UI (`dashboard/src/App.tsx`, components).
- **Vite 7.3.1** — Dashboard build tool and dev server (`@vitejs/plugin-react 5.2.0`).
- **Express 5.2.1** — Dashboard backend API server (`dashboard/server.js`, referenced in `package.json` scripts).
- **Express 4.21.2** — Evolution API backend (`evolution-api-main/src/main.ts`).
- **Arduino Framework (ESP32)** — Firmware base (`esp32/esp32.ino`, `esp32/src/main.cpp`).
- **Baileys** — WhatsApp Web protocol library (`baileys` from `github:WhiskeySockets/Baileys`), used by Evolution API.

**UI/Styling:**
- **Tailwind CSS 3.4.19** — Dashboard styling (`dashboard/tailwind.config.cjs`). Dark mode via `class` strategy. CSS custom properties for theming.
- **Framer Motion 12.35.2** — Dashboard animations.
- **Lucide React 0.575.0** — Icon library.
- **Recharts 3.7.0** — Telemetry charting.
- **class-variance-authority 0.7.1** + **clsx 2.1.1** + **tailwind-merge 3.5.0** — Component variant utilities (shadcn-style).

**Testing:**
- **Vitest 4.1.5** — Dashboard unit tests (`dashboard/src/**/__tests__/*.test.ts`, `dashboard/src/tests/*.test.ts`).
- **Testing Library React 16.3.2** + **Jest-DOM 6.9.1** — Component testing utilities.
- **JSDOM 29.1.1** — DOM simulation for Vitest.

**Build/Dev:**
- **TypeScript ESLint 8.48.0** — Linting (`eslint 9.39.1`, `eslint-plugin-react-hooks 7.0.1`, `eslint-plugin-react-refresh 0.4.24`).
- **tsup 8.3.5** — Evolution API bundler.
- **tsx 4.20.3** — Evolution API TypeScript runner (dev).
- **Prisma 6.1.0** — Evolution API ORM and migration tool.
- **PostCSS 8.5.6** + **Autoprefixer 10.4.24** — CSS processing for dashboard.

## Key Dependencies

**Critical:**
- **@supabase/supabase-js 2.101.0** — Supabase client for dashboard (realtime subscriptions, CRUD on `devices_status`, `telemetry`, `events`, `users`, `tenants`).
- **firebase 12.10.0** + **firebase-admin 13.9.0** — Firebase Auth (email/password, anonymous) and Admin SDK for dashboard.
- **mqtt 5.15.0** — MQTT client for dashboard (real-time telemetry subscription from broker at `109.123.240.215:1883`).
- **http-proxy-middleware 3.0.3** — Dashboard API proxying.
- **cors 2.8.6** — CORS handling (dashboard and Evolution API).
- **dotenv 17.4.2** — Environment variable loading (dashboard).
- **ArduinoJson** — JSON serialization in ESP32 firmware (`StaticJsonDocument`, `serializeJson`, `deserializeJson`).
- **WiFiManager** — WiFi credential management on ESP32 (captive portal for configuration).
- **PubSubClient** — MQTT client on ESP32 (wrapped in `MqttManager`).
- **HTTPUpdate** — OTA firmware updates on ESP32 (`OtaManager`).
- **DallasTemperature** + **OneWire** — DS18B20 temperature sensor support on ESP32.
- **Prisma Client 6.1.0** — Evolution API database access (PostgreSQL or MySQL).
- **Baileys** — WhatsApp protocol (Evolution API core).
- **openai 4.77.3** — OpenAI API integration (Evolution API AI features).
- **redis 4.7.0** — Redis caching (Evolution API).
- **socket.io 4.8.1** — WebSocket real-time communication (Evolution API).
- **jsonwebtoken 9.0.2** — JWT authentication (Evolution API).
- **@sentry/node 8.47.0** — Error tracking (Evolution API).
- **pg 8.13.1** — PostgreSQL driver (Evolution API).
- **sharp 0.34.2** — Image processing (Evolution API media handling).
- **minio 8.0.3** — S3-compatible object storage (Evolution API).
- **nats 2.29.1** — NATS messaging (Evolution API optional integration).
- **amqplib 0.10.5** — RabbitMQ client (Evolution API optional integration).
- **@aws-sdk/client-sqs 3.723.0** — AWS SQS integration (Evolution API).
- **pusher 5.2.0** — Pusher real-time (Evolution API).
- **@figuro/chatwoot-sdk 1.1.16** — Chatwoot integration (Evolution API).
- **node-cron 3.0.3** — Scheduled tasks (Evolution API).

**Infrastructure:**
- **ESP32 Libraries:** `EEPROM` (settings persistence), `WiFi` (networking), `Wire` (I2C for PCF8574/AHT10), `DallasTemperature`/`OneWire` (DS18B20), `ArduinoJson`, `WiFiManager`, `HTTPUpdate`, `Update` (OTA).
- **ESP32 Hardware:** DS18B20/PT100 temperature sensors, DHT11 ambient sensor, ZMPT voltage sensor, PCF8574 I/O expander (buttons), AHT10 (I2C sensor), OLED display (I2C), 4-channel relay board, buzzer, door sensor, battery monitoring.

## Configuration

**Environment:**
- **Dashboard:** `.env` file with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, Firebase config keys, MQTT broker URL. Loaded via `dotenv` and Vite's `import.meta.env`.
- **Evolution API:** `.env` file (from `.env.example` template) with `SERVER_PORT`, `DATABASE_CONNECTION_URI`, `DATABASE_PROVIDER`, `CORS_ORIGIN`, `LOG_LEVEL`, Redis URI, RabbitMQ URI, etc.
- **ESP32 Firmware:** `esp32/src/config/Config.h` — compile-time constants for MQTT server (`109.123.240.215`), port (`1883`), topics, pin assignments, EEPROM addresses, sensor types, relay configs. WiFi credentials managed at runtime via WiFiManager captive portal.
- **Firebase:** `dashboard/firebase.json` — Firestore config (location: `us-central`), auth providers (anonymous, emailPassword).
- **n8n Workflows:** JSON workflow files with embedded node configurations. MQTT trigger nodes connect to broker. Supabase nodes use stored credentials. Evolution API nodes use `evolutionApi` credential reference.

**Build:**
- **Dashboard:** `vite build` → `dist/`. Deploy script builds, tars, SCPs to `root@109.123.240.215:/var/www/nikaotech`, then `pm2 restart dashboard`.
- **Evolution API:** `tsup` bundling → `dist/main.js`. Dockerfile-based deployment. Railway.json config for Railway hosting (Dockerfile builder, us-east4 region, 1 replica).
- **ESP32 Firmware:** Arduino IDE compilation → `.bin`/`.elf`. OTA updates via HTTP from `firmware.nikaotech.com` (inferred from `WiFiClientSecure.setInsecure()` comment).

## Platform Requirements

**Development:**
- Node.js (version not pinned — no `.nvmrc` detected)
- Arduino IDE with ESP32 board support (ESP32-C3)
- n8n instance with `n8n-nodes-evolution-api` community node installed
- Supabase project (URL: `ueyizghzblngswgukfmr` from schema comment)
- Firebase project (Firestore in `us-central`)
- MQTT broker (Mosquitto at `109.123.240.215:1883`)

**Production:**
- **ESP32-C3** hardware with sensors (DS18B20/PT100, DHT11, ZMPT, door sensor, relays, display, buzzer)
- **VPS** at `109.123.240.215` — hosts MQTT broker, dashboard (pm2), firmware files
- **Supabase** — PostgreSQL database with realtime enabled
- **Firebase** — Authentication service
- **Evolution API** — WhatsApp gateway (self-hosted, Docker on Railway or VPS)
- **n8n** — Workflow automation engine
- **PostgreSQL** — Evolution API database (separate from Supabase)
- **Redis** — Evolution API caching

---

*Stack analysis: 2026-05-20*
