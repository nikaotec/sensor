# Requirements: IoT Sensor Monitoring System

**Project:** IoT Sensor Monitoring System
**Version:** 1.0
**Last Updated:** 2026-05-10

## Overview

This document captures v1 requirements for the IoT sensor monitoring system. Requirements are categorized and traceable to roadmap phases.

## Categories

| Category | Description |
|----------|-------------|
| WORKFLOW | n8n workflow functionality |
| DATA | Data ingestion and processing |
| ALERT | Alert system and notifications |
| DASHBOARD | React dashboard integration |
| DATABASE | Database schema and queries |
| SECURITY | Security and access control |

---

## WORKFLOW Requirements

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| WORK-01 | MQTT trigger receives ESP32 sensor data on `esp32c3/data` topic | HIGH | 1 |
| WORK-02 | Parse and validate incoming JSON payload (TIPO, ID_DISPOSITIVO, TEMP_C, etc.) | HIGH | 1 |
| WORK-03 | Log telemetry data to Supabase `telemetry` table | HIGH | 2 |
| WORK-04 | Update device status in `devices_status` table | HIGH | 2 |
| WORK-05 | Handle hourly snapshots for historical data | MEDIUM | 2 |
| WORK-06 | Process device commands from dashboard (relay, alarm settings) | HIGH | 3 |
| WORK-07 | Generate PDF reports via workflow | MEDIUM | 4 |

---

## DATA Requirements

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| DATA-01 | Accept ESP32 payload: TIPO, ID_DISPOSITIVO, TEMP_C, TEMP_MAX, TEMP_MIN, UMIDADE, BATERIA, VOLTAGEM | HIGH | 1 |
| DATA-02 | Validate required fields before database insertion | HIGH | 1 |
| DATA-03 | Handle temperature threshold violations | HIGH | 3 |
| DATA-04 | Store historical telemetry with timestamp | HIGH | 2 |
| DATA-05 | Support periodico and relatorio_diario report types | MEDIUM | 4 |

---

## ALERT Requirements

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| ALERT-01 | Detect ALERTA_* payloads from ESP32 | HIGH | 3 |
| ALERT-02 | Log alerts to `events` table with device ID, type, value | HIGH | 3 |
| ALERT-03 | Publish alert to MQTT topic for dashboard consumption | HIGH | 3 |
| ALERT-04 | Support hysteresis configuration to prevent alert flooding | MEDIUM | 3 |
| ALERT-05 | Trigger WhatsApp notification via Evolution API on critical alerts | MEDIUM | 3 |
| ALERT-06 | Audio + visual notification in dashboard | HIGH | 4 |

---

## DASHBOARD Requirements

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| DASH-01 | Webhook endpoint for dashboard actions (device commands) | HIGH | 3 |
| DASH-02 | Real-time device status via Supabase Realtime subscriptions | HIGH | 4 |
| DASH-03 | Multi-tenant data isolation (filter by tenant_id) | HIGH | 4 |
| DASH-04 | Device list with current readings (temp, humidity, battery) | HIGH | 4 |
| DASH-05 | Device detail view with history charts | MEDIUM | 4 |
| DASH-06 | Alert history display | MEDIUM | 4 |

---

## DATABASE Requirements

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| DB-01 | Supabase schema with: users, tenants, devices_status, telemetry, events tables | HIGH | 1 |
| DB-02 | RLS policies for tenant isolation | HIGH | 2 |
| DB-03 | Index on device_id and timestamp for query performance | HIGH | 2 |
| DB-04 | Support null tenant handling in queries | MEDIUM | 2 |

---

## SECURITY Requirements

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| SEC-01 | n8n credentials stored securely (not hardcoded) | HIGH | 1 |
| SEC-02 | Supabase anon key not exposed in production frontend | HIGH | 2 |
| SEC-03 | RLS policies enabled and tested | HIGH | 2 |
| SEC-04 | No credentials in ESP32 firmware (local network assumed) | LOW | 4 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WORK-01 | 1 | Pending |
| WORK-02 | 1 | Pending |
| DB-01 | 1 | Pending |
| SEC-01 | 1 | Pending |
| WORK-03 | 2 | Pending |
| WORK-04 | 2 | Pending |
| WORK-05 | 2 | Pending |
| DATA-02 | 2 | Pending |
| DATA-04 | 2 | Pending |
| DB-02 | 2 | Pending |
| DB-03 | 2 | Pending |
| DB-04 | 2 | Pending |
| SEC-02 | 2 | Pending |
| SEC-03 | 2 | Pending |
| WORK-06 | 3 | Pending |
| DATA-03 | 3 | Pending |
| ALERT-01 | 3 | Pending |
| ALERT-02 | 3 | Pending |
| ALERT-03 | 3 | Pending |
| ALERT-04 | 3 | Pending |
| ALERT-05 | 3 | Pending |
| WORK-07 | 4 | Pending |
| DATA-05 | 4 | Pending |
| ALERT-06 | 4 | Pending |
| DASH-01 | 4 | Pending |
| DASH-02 | 4 | Pending |
| DASH-03 | 4 | Pending |
| DASH-04 | 4 | Pending |
| DASH-05 | 4 | Pending |
| DASH-06 | 4 | Pending |
| SEC-04 | 4 | Pending |

---

## Out of Scope (v2)

- ESP32 firmware development (firmware already exists)
- Firebase Auth customization
- Mobile app
- Offline support
- CI/CD pipeline (manual deploy currently)