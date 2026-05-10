# Roadmap: IoT Sensor Monitoring System

## Overview

Build a complete IoT sensor monitoring system using n8n workflows for data processing, Supabase for storage, and a React dashboard for visualization. The journey spans from foundational workflow setup through real-time alerting and dashboard integration.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Workflow Setup** - MQTT trigger foundation with basic data validation
- [ ] **Phase 2: Data Processing** - Telemetry logging, device status updates, database optimization
- [ ] **Phase 3: Alert System** - Alert detection, logging, MQTT publication, WhatsApp integration
- [ ] **Phase 4: Dashboard Integration** - Webhook endpoints, real-time subscriptions, UI polish

## Phase Details

### Phase 1: Workflow Setup
**Goal**: n8n MQTT trigger receives and validates ESP32 sensor data
**Depends on**: Nothing (first phase)
**Requirements**: WORK-01, WORK-02, DB-01, SEC-01
**Success Criteria** (what must be TRUE):
  1. n8n workflow triggers on MQTT message at `esp32c3/data` topic
  2. JSON payload is parsed and required fields validated (TIPO, ID_DISPOSITIVO, TEMP_C)
  3. Supabase schema exists with users, tenants, devices_status, telemetry, events tables
  4. n8n credentials configured securely (no hardcoded values)
**Plans**: 3 plans

Plans:
- [ ] 01-01: Create/validate MQTT trigger workflow for `esp32c3/data` topic
- [ ] 01-02: Implement payload validation for required ESP32 fields
- [ ] 01-03: Verify/apply Supabase schema with required tables

### Phase 2: Data Processing
**Goal**: Telemetry data stored reliably, device status updated in real-time
**Depends on**: Phase 1
**Requirements**: WORK-03, WORK-04, WORK-05, DATA-02, DATA-04, DB-02, DB-03, DB-04, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. Incoming sensor data logged to `telemetry` table with timestamp
  2. `devices_status` table updated on each sensor report
  3. RLS policies active and filtering data by tenant_id
  4. Database indexes on device_id and timestamp for query performance
  5. Null tenant handling works without query failures
**Plans**: 4 plans

Plans:
- [ ] 02-01: Implement telemetry logging workflow (insert to telemetry table)
- [ ] 02-02: Implement device status update workflow (upsert to devices_status)
- [ ] 02-03: Enable and test RLS policies for tenant isolation
- [ ] 02-04: Add database indexes and fix null tenant queries

### Phase 3: Alert System
**Goal**: Alerts detected, logged, published, and notification sent
**Depends on**: Phase 2
**Requirements**: WORK-06, DATA-03, ALERT-01, ALERT-02, ALERT-03, ALERT-04, ALERT-05
**Success Criteria** (what must be TRUE):
  1. ALERTA_* payloads detected and extracted from MQTT messages
  2. Alerts logged to `events` table with device_id, alert_type, value, timestamp
  3. Alert published to MQTT topic for dashboard consumption
  4. Hysteresis configuration prevents alert flooding (cooldown period)
  5. WhatsApp notification sent via Evolution API for critical alerts
  6. Dashboard can send device commands (relay, alarm settings) via webhook
**Plans**: 4 plans

Plans:
- [ ] 03-01: Implement alert detection and event logging workflow
- [ ] 03-02: Implement alert MQTT publication for dashboard
- [ ] 03-03: Add hysteresis configuration to prevent alert flooding
- [ ] 03-04: Implement WhatsApp notification via Evolution API

### Phase 4: Dashboard Integration
**Goal**: Dashboard receives real-time updates, displays alerts, generates reports
**Depends on**: Phase 3
**Requirements**: WORK-07, DATA-05, ALERT-06, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, SEC-04
**Success Criteria** (what must be TRUE):
  1. Dashboard webhook endpoint accepts device commands from UI
  2. Supabase Realtime subscriptions update device list without refresh
  3. Multi-tenant data isolation filters devices and telemetry by tenant_id
  4. Audio + visual notification plays when alert received
  5. PDF reports generated via n8n workflow
  6. Device detail shows history charts with telemetry data
**Plans**: 4 plans

Plans:
- [ ] 04-01: Implement dashboard webhook endpoint for device commands
- [ ] 04-02: Enable Supabase Realtime subscriptions for live updates
- [ ] 04-03: Implement alert notification (audio + visual) in dashboard
- [ ] 04-04: Implement PDF report generation workflow

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Workflow Setup | 0/3 | Not started | - |
| 2. Data Processing | 0/4 | Not started | - |
| 3. Alert System | 0/4 | Not started | - |
| 4. Dashboard Integration | 0/4 | Not started | - |

## Coverage

✓ All 31 v1 requirements mapped
✓ No orphaned requirements