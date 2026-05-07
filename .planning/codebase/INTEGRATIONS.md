# External Integrations

**Analysis Date:** 2026-05-07

## APIs & External Services

**WhatsApp Integration:**
- **WhatsApp Web via Baileys** - WhatsApp Bot API implementation
  - SDK/Client: `baileys` (GitHub: WhiskeySockets/Baileys)
  - Version: Latest from GitHub
  - Used in: `evolution-api-main/src/main.ts`
  - Features: Send/receive messages, manage groups, WhatsApp Business API

**WhatsApp Business API:**
- Facebook Graph API for WhatsApp Business
  - Endpoint: `WA_BUSINESS_URL=https://graph.facebook.com`
  - Version: `v20.0`
  - Endpoint: `evolution-api-main/src/api/services/channel.service.ts`

**AI & Automation:**
- **OpenAI** - AI-powered automation
  - Package: `openai` v4.77.3
  - Config: `OPENAI_ENABLED` env var
- **Typebot** - Conversational form automation
  - Package: Built into evolution-api
  - Config: `TYPEBOT_ENABLED`, `TYPEBOT_API_VERSION`
- **Dify** - AI workflow platform
  - Config: `DIFY_ENABLED`
- **n8n** - Workflow automation
  - Config: `N8N_ENABLED`

**Chatwoot Integration:**
- Customer support chat platform
  - SDK: `@figuro/chatwoot-sdk` v1.1.16
  - Config: `CHATWOOT_ENABLED`
  - Database: `CHATWOOT_IMPORT_DATABASE_CONNECTION_URI`

**EvoAI:**
- Internal Evolution AI service
  - Config: `EVOAI_ENABLED`

## Data Storage

**Databases:**
- **PostgreSQL** (Primary)
  - Connection: `DATABASE_CONNECTION_URI`
  - ORM: `@prisma/client` v6.1.0
  - Schema file: `prisma/postgresql-schema.prisma`
- **MySQL** (Alternative)
  - Schema file: `prisma/mysql-schema.prisma`
- **PgBouncer** (Connection pooling)
  - Schema file: `prisma/psql_bouncer-schema.prisma`
- Config: `DATABASE_PROVIDER` (postgresql/mysql/psql_bouncer)

**File Storage:**
- **Amazon S3** - Object storage
  - Package: `@aws-sdk/client-s3` (via minio)
  - Config: `S3_ENABLED`, `S3_BUCKET`, `S3_ENDPOINT`
  - Used for media storage in evolution-api
- **MinIO** - S3-compatible local storage
  - Package: `minio` v8.0.3
  - Config: `S3_ENDPOINT`, `S3_PORT`

**Caching:**
- **Redis** - Primary cache
  - Package: `redis` v4.7.0
  - Config: `CACHE_REDIS_ENABLED`, `CACHE_REDIS_URI`
  - TTL: `CACHE_REDIS_TTL` (default: 604800 seconds)
  - Prefix: `CACHE_REDIS_PREFIX_KEY`
- **Local Cache** (Fallback)
  - Config: `CACHE_LOCAL_ENABLED`

## Authentication & Identity

**Dashboard Auth:**
- **Firebase Authentication** - Primary identity provider
  - Package: `firebase` v12.10.0
  - Config: Hardcoded in `dashboard/src/services/firebaseAuth.ts`
  - Project: `smartrf-f9962`
  - Features: Email/password registration, user provisioning

**Evolution API Auth:**
- **API Key Authentication** - Instance-level auth
  - Config: `AUTHENTICATION_API_KEY`
  - Usage: Passed via request header
- **JWT Tokens**
  - Package: `jsonwebtoken` v9.0.2
  - Used for session management

## Messaging & Real-time

**WebSocket:**
- **Socket.IO** - Real-time bidirectional communication
  - Package: `socket.io` v4.8.1 (server), `socket.io-client` v4.8.1 (client)
  - Used in: `evolution-api-main/src/main.ts`

**Event Streaming:**
- **RabbitMQ** - Message queue
  - Package: `amqplib` v0.10.5
  - Config: `RABBITMQ_ENABLED`, `RABBITMQ_URI`
  - Exchange: `RABBITMQ_EXCHANGE_NAME`
- **NATS** - Modern message system
  - Package: `nats` v2.29.1
- **AWS SQS** - Amazon Simple Queue Service
  - Package: `@aws-sdk/client-sqs` v3.723.0
  - Config: `SQS_ENABLED`, `SQS_REGION`

**Realtime Push:**
- **Pusher** - WebSocket pub/sub
  - Package: `pusher` v5.2.0
  - Config: `PUSHER_ENABLED`, `PUSHER_GLOBAL_*`

**MQTT (Dashboard):**
- **MQTT** - IoT telemetry protocol
  - Package: `mqtt` v5.15.0
  - Used in: Dashboard for sensor data subscription

## Monitoring & Observability

**Error Tracking:**
- **Sentry** - Application monitoring
  - Package: `@sentry/node` v8.47.0
  - Config: `SENTRY_DSN` (env var)
  - Used in: `evolution-api-main/src/utils/instrumentSentry.ts`

**Logging:**
- **Pino** - Structured JSON logging
  - Package: `pino` v8.11.0
  - Config: `LOG_LEVEL`, `LOG_COLOR`, `LOG_BAILEYS`
  - Log levels: `ERROR`, `WARN`, `DEBUG`, `INFO`, `LOG`, `VERBOSE`, `DARK`, `WEBHOOKS`, `WEBSOCKET`

## CI/CD & Deployment

**Hosting:**
- Server: `root@109.123.240.215:/var/www/nikaotech` (production server)

**CI/CD:**
- Deployment via custom npm scripts
- Build: `npm run build && tar -czvf dashboard.tar.gz dist server.js package.json`
- Transfer: `scp` to production server
- Process manager: `pm2` for both dashboard and evolution-api

## Webhooks & Callbacks

**Outgoing Webhooks:**
- Global webhook system in evolution-api
  - Config: `WEBHOOK_GLOBAL_ENABLED`, `WEBHOOK_GLOBAL_URL`
  - Per-event configuration available
  - Retry logic: Exponential backoff with `WEBHOOK_RETRY_*` configs
  - Timeout: `WEBHOOK_REQUEST_TIMEOUT_MS` (default: 60000ms)

**Webhook Events (select examples):**
- `WEBHOOK_EVENTS_QRCODE_UPDATED`
- `WEBHOOK_EVENTS_MESSAGES_SET`
- `WEBHOOK_EVENTS_MESSAGES_UPSERT`
- `WEBHOOK_EVENTS_CONNECTION_UPDATE`
- `WEBHOOK_EVENTS_CONTACTS_UPSERT`
- `WEBHOOK_EVENTS_CHATS_UPSERT`
- `WEBHOOK_EVENTS_GROUPS_UPSERT`
- `WEBHOOK_EVENTS_LABELS_EDIT`
- `WEBHOOK_EVENTS_TYPEBOT_START`

---

*Integration audit: 2026-05-07*