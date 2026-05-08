# Technology Stack

**Analysis Date:** 2026-05-07

## Languages

**Primary:**
- JavaScript/TypeScript - Web dashboard, n8n workflows, Evolution API
- Arduino/C++ - ESP32 embedded firmware

**Secondary:**
- Python - Dashboard scripting utilities (`edit_dashboard.py`, `patch_n8n_telemetry.py`, `revert.py`)
- SQL - Database migrations and schemas

## Runtime

**Node.js:**
- Dashboard: Node.js with Vite dev server
- Evolution API: Node.js with Express
- n8n: Self-hosted Node.js automation platform

**Embedded:**
- ESP32 firmware runtime (Arduino framework)

**Package Manager:**
- npm (version locked via `package-lock.json`)
- pip (Python scripts)

## Frameworks

**Core Web:**
- React 19.2.0 - Frontend framework for dashboard
- Vite 7.3.1 - Build tool and dev server
- Express 5.2.1 - Backend server for dashboard API proxy
- TailwindCSS 3.4.19 - Styling
- Recharts 3.7.0 - Data visualization charts

**IoT/Automation:**
- n8n - Workflow automation platform
- MQTT.js 5.15.0 - MQTT client for sensor communication

**Communication:**
- Evolution API v2.3.1 - WhatsApp multi-device API
- Baileys (WhiskeySockets) - WhatsApp Web protocol

**Database:**
- Prisma 6.1.0 - ORM for Evolution API
- @supabase/supabase-js 2.101.0 - Supabase client for IoT data

**Testing:**
- ESLint 9.39.1 - Linting
- TypeScript 5.9.3 (dashboard), 5.7.2 (Evolution API)

## Key Dependencies

**Critical:**
- `firebase` 12.10.0 - Firebase authentication and Firestore for dashboard
- `@supabase/supabase-js` 2.101.0 - IoT data storage and real-time subscriptions
- `mqtt` 5.15.0 - MQTT protocol for ESP32 communication
- `framer-motion` 12.35.2 - Dashboard animations
- `axios` 1.7.9 - HTTP client for API calls
- `socket.io` 4.8.1 - Real-time communication

**Infrastructure:**
- `express` 4.21.2 - HTTP server framework
- `cors` 2.8.x - Cross-origin resource sharing
- `http-proxy-middleware` 3.0.3 - API proxy in dashboard

**AI Integration:**
- `openai` 4.77.3 - OpenAI API client (GPT-4, GPT-5-mini)
- Ollama (local) - Self-hosted LLM integration

**Media Processing:**
- `sharp` 0.34.2 - Image processing
- `fluent-ffmpeg` 2.1.3 - Video/audio processing
- `@ffmpeg-installer/ffmpeg` 1.1.0 - FFmpeg binary

**Storage:**
- `minio` 8.0.3 - S3-compatible object storage
- Prisma + PostgreSQL - Evolution API database
- Supabase (PostgreSQL) - IoT sensor database

**Messaging:**
- `amqplib` 0.10.5 - RabbitMQ client
- `redis` 4.7.0 - Redis client for caching/sessions

**Monitoring:**
- `@sentry/node` 8.47.0 - Error tracking
- `pino` 8.11.0 - Structured logging

## Configuration

**Environment:**
- Environment variables via `.env` files
- Docker Compose for service orchestration
- Firebase project configuration (`firebase.json`)

**Build:**
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite bundler configuration with custom MQTT proxy
- `tailwind.config.cjs` - Tailwind CSS configuration

**Deployment:**
- PM2 process manager for dashboard production
- Docker containers for all services
- SSH-based deployment script in `package.json`

## Platform Requirements

**Development:**
- Node.js 18+
- npm 9+
- ESP32 Arduino development environment
- Docker + Docker Compose

**Production:**
- Linux server (Debian/Ubuntu observed)
- PM2 for Node.js process management
- Reverse proxy (nginx implied for n8n.nikaotech.com)
- MQTT broker (Mosquitto)

**Cloud Services:**
- Supabase (PostgreSQL + Auth + Realtime)
- Firebase (Auth + Firestore)
- Evolution API self-hosted WhatsApp gateway

---

*Stack analysis: 2026-05-07*