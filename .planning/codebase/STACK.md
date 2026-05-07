# Technology Stack

**Analysis Date:** 2026-05-07

## Languages

**Primary:**
- TypeScript 5.7.2 - Core language for evolution-api-main; TypeScript ~5.9.3 for dashboard
- JavaScript - Dashboard server-side and React client scripts

**Secondary:**
- Python 3.x - Utility scripts for data patching and device management (`patch_n8n_telemetry.py`, `revert.py`, `edit_device_list.py`, `patch_dashboard.py`)

## Runtime

**Environment:**
- Node.js 20+ - Runtime for both dashboard and evolution-api
- Python 3.x - Runtime for utility scripts

**Package Manager:**
- npm - Primary package manager
- Lockfile: `package-lock.json` present in both projects

## Frameworks

**Core:**
- React 19.2.0 - Dashboard UI framework
- Express 4.21.2 (evolution-api) / 5.2.1 (dashboard) - HTTP server

**Frontend Build:**
- Vite 7.3.1 - Build tool and dev server for dashboard
- TailwindCSS 3.4.19 - CSS framework
- TypeScript ~5.9.3 - Type checking and compilation

**Backend (evolution-api):**
- Express 4.21.2 - REST API framework
- Socket.IO 4.8.1 - Real-time WebSocket communication
- Prisma 6.1.0 - ORM for database operations

**Testing:**
- No dedicated test framework detected in package.json scripts

**Build/Dev:**
- tsup 8.3.5 - TypeScript bundler for evolution-api
- tsx 4.20.3 - TypeScript executor for development

## Key Dependencies

**Critical:**
- `@adiwajshing/keyed-db` 0.2.4 - WhatsApp message storage (evolution-api)
- `baileys` (GitHub:WhiskeySockets/Baileys) - WhatsApp Web protocol library
- `@prisma/client` 6.1.0 - Database ORM (evolution-api)
- `pg` 8.13.1 - PostgreSQL driver
- `socket.io` 4.8.1 - Real-time messaging

**Infrastructure:**
- `redis` 4.7.0 - Cache and session storage (evolution-api)
- `amqplib` 0.10.5 - RabbitMQ client (evolution-api)
- `@aws-sdk/client-sqs` 3.723.0 - AWS SQS integration
- `minio` 8.0.3 - S3-compatible object storage
- `pusher` 5.2.0 - Pusher WebSocket service

**Dashboard Specific:**
- `@supabase/supabase-js` 2.101.0 - Supabase client
- `firebase` 12.10.0 - Firebase authentication
- `mqtt` 5.15.0 - MQTT client for telemetry subscriptions
- `recharts` 3.7.0 - Data visualization
- `framer-motion` 12.35.2 - Animation library

**Observability:**
- `@sentry/node` 8.47.0 - Error tracking (evolution-api)
- `pino` 8.11.0 - Structured logging (evolution-api)

## Configuration

**Environment:**
- `.env` files present in both `dashboard/` and `evolution-api-main/`
- `.env.example` provided in evolution-api-main for reference
- Key configs: `SERVER_PORT`, `DATABASE_PROVIDER`, `CACHE_REDIS_*`, `AUTHENTICATION_API_KEY`

**Build:**
- `tsconfig.json` - TypeScript configuration
- `tsup.config.ts` - Build configuration (evolution-api)
- `vite.config.ts` - Vite configuration (dashboard)
- `eslint.config.js` - Linting configuration

**Database Schema:**
- `prisma/postgresql-schema.prisma` - PostgreSQL schema
- `prisma/mysql-schema.prisma` - MySQL schema
- `prisma/psql_bouncer-schema.prisma` - PgBouncer schema

## Platform Requirements

**Development:**
- Node.js 20+
- npm or yarn
- TypeScript knowledge

**Production:**
- Node.js runtime with process manager (pm2 recommended)
- PostgreSQL or MySQL database
- Redis server for caching (optional but recommended)
- WhatsApp Web connection requirements

---

*Stack analysis: 2026-05-07*