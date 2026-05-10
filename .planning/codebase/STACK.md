# Technology Stack

**Analysis Date:** 2026-05-10

## Languages

**Primary:**
- JavaScript/TypeScript - Dashboard web app, n8n workflows
- C/C++ - ESP32 firmware (Arduino framework)

**Secondary:**
- Python - Utility scripts for database operations
- SQL - Supabase database schema and migrations

## Runtime

**Environment:**
- Node.js 20+ - Dashboard server and n8n automation platform
- Arduino ESP32 - Embedded firmware runtime

**Package Manager:**
- npm - Dashboard and Evolution API
- pip - Python utility scripts

## Frameworks

**Core:**
- React 19 - Dashboard UI framework
- Vite 7 - Build tool for dashboard
- Express 5 - Backend server for dashboard

**Testing:**
- Vitest 4 - Testing framework for dashboard

**Build/Dev:**
- TypeScript 5.9 - Type checking
- ESLint 9 - Linting
- Tailwind CSS 3.4 - Styling

**n8n:**
- n8n (external) - Workflow automation platform
- MQTT nodes - IoT device communication
- Supabase nodes - Database operations

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.101.0 - Supabase client for database
- `firebase` 12.10.0 - Firebase authentication and Firestore
- `mqtt` 5.15.0 - MQTT protocol client
- `recharts` 3.7.0 - Data visualization

**Infrastructure:**
- `express` 5.2.1 - HTTP server
- `cors` 2.8.6 - Cross-origin resource sharing

## ESP32 Firmware

**Libraries:**
- OneWire - DS18B20 temperature sensor
- PubSubClient - MQTT client for Arduino
- LiquidCrystal_I2C - LCD display control
- EEPROM - Non-volatile storage
- WiFi - Network connectivity

**Hardware Config:**
- ESP32-C3 microcontroller
- DS18B20 temperature sensor
- DHT11 humidity sensor
- Voltage sensor (ZMPT101B)
- Battery monitor
- Door sensor
- 4x relay outputs
- I2C LCD display

## Configuration

**Environment:**
- `.env` files - Local configuration (see `.gitignore`)
- Config defined in `esp32/Config.h`

**Build:**
- `tsconfig.json` - TypeScript config
- `vite.config.ts` - Vite build config
- `tailwind.config.js` - Tailwind configuration
- `package.json` - npm dependencies

## Platform Requirements

**Development:**
- Node.js 20+
- npm 10+
- Python 3.8+
- Arduino IDE or platformio

**Production:**
- Node.js server (PM2 recommended)
- n8n instance
- MQTT broker
- Supabase project
- Firebase project

---

*Stack analysis: 2026-05-10*