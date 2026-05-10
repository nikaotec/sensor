# Project: IoT Sensor Monitoring System

**Created:** 2026-05-10
**Last Updated:** 2026-05-10

## Core Value

Real-time IoT sensor monitoring and alerting with multi-tenant support, enabling businesses to track temperature, humidity, and battery levels across distributed ESP32 devices via n8n workflows and a React dashboard.

## Context

This is an existing project with established codebase. Key components:
- **n8n workflows** for MQTT processing, telemetry logging, and alert handling
- **Supabase** as primary database with PostgreSQL + Realtime
- **React Dashboard** with Firebase Auth and multi-tenant support
- **ESP32 firmware** for sensor data collection

## Constraints

| Constraint | Description |
|------------|-------------|
| Self-hosted n8n | No cloud automation platform |
| Multi-tenant | Tenant isolation via RLS policies |
| Real-time | MQTT + Supabase Realtime for live updates |
| Legacy migration | Ongoing Firestore → Supabase migration |

## Key Decisions

| ID | Decision | Rationale | Date |
|----|----------|-----------|------|
| DEC-01 | Supabase as primary DB | Better realtime support than Firestore | 2026-05-09 |
| DEC-02 | MQTT for ESP32 communication | Reliable low-power protocol | 2026-05-09 |
| DEC-03 | React Context for state | Simple, no external deps | 2026-05-09 |

## Project Structure

```
sensor/
├── dashboard/           # React SPA
├── n8n_*.json           # n8n workflow exports
├── supabase_schema.sql  # Database schema
└── esp32/              # ESP32 firmware
```

## Active Issues

- RLS policies disabled in dev (SECURITY)
- Anon key exposed in frontend (MEDIUM)
- Dual storage (Firestore + Supabase) causing confusion
- Large n8n workflow files (>100KB)

## Related Files

- `.planning/codebase/` — Existing codebase documentation
- `.planning/PERSIST-HISTERESIS-ALERTAS.md` — Alert system notes