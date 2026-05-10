---
phase: phase-01
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - mqtt receive.json
  - supabase_schema.sql
autonomous: false
requirements:
  - WORK-01
  - WORK-02
  - DB-01
  - SEC-01

must_haves:
  truths:
    - "n8n workflow triggers on MQTT message at `esp32c3/data` topic"
    - "JSON payload is parsed and required fields validated (TIPO, ID_DISPOSITIVO, TEMP_C)"
    - "Supabase schema exists with users, tenants, devices_status, telemetry, events tables"
    - "n8n credentials configured securely (no hardcoded values)"
  artifacts:
    - path: "mqtt receive.json"
      provides: "MQTT trigger + payload validation"
      contains: "esp32c3/data, TIPO, ID_DISPOSITIVO, TEMP_C validation"
    - path: "supabase_schema.sql"
      provides: "Database schema with required tables"
      contains: "users, tenants, devices_status, telemetry, events"
  key_links:
    - from: "mqtt receive.json"
      to: "Supabase"
      via: "workflow nodes"
      pattern: "supabase.*insert"
---

# Phase 1: Workflow Setup — MQTT Foundation

<objective>
Establish the MQTT foundation for the IoT sensor monitoring system:
1. Validate existing MQTT trigger on `esp32c3/data` topic
2. Implement payload validation for ESP32 fields
3. Verify Supabase schema with required tables

Purpose: Creates the foundation for all subsequent phases (data processing, alerting, dashboard)
Output: Validated MQTT workflow, verified database schema, secure credential configuration
</objective>

<context>
@.planning/REQUIREMENTS.md
@.planning/PROJECT.md
@mqtt receive.json
@supabase_schema.sql

# MQTT Payload Reference
interface MqttPayload {
  TIPO: 'relatorio_diario' | 'periodico' | 'ALERTA_*'
  ID_DISPOSITIVO: string      // MAC address
  TEMP_C: number             // Required - temperature in Celsius
  TEMP_MAX?: number
  TEMP_MIN?: number
  UMIDADE?: number           // Humidity %
  BATERIA?: number           // Battery %
  VOLTAGEM?: number          // Voltage
  EMPRESA?: string          // Tenant identifier
}

# Required fields: TIPO, ID_DISPOSITIVO, TEMP_C
</context>

<interfaces>
<!-- Key interfaces from existing codebase -->
</interfaces>

<tasks>

## Wave 1: Parallel Tasks (No Dependencies)

<task type="auto">
  <name>Task 01-01-1: Verify MQTT Trigger Configuration</name>
  <files>
    - mqtt receive.json
  </files>
  <action>
    Inspect the existing `mqtt receive.json` workflow to find MQTT trigger node:
    1. Search for MQTT trigger node (type contains "mqtt")
    2. Verify it subscribes to `esp32c3/data` topic
    3. If no MQTT trigger found, add one with the correct topic
    4. Document the node ID and configuration
  </action>
  <verify>
    <automated>jq '.nodes[] | select(.type | test("mqtt"; "i")) | {name, type, parameters: {topic}}' mqtt\ receive.json</automated>
  </verify>
  <done>MQTT trigger node exists, configured for `esp32c3/data` topic</done>
</task>

<task type="auto">
  <name>Task 01-01-2: Verify Secure Credential Storage</name>
  <files>
    - mqtt receive.json
  </files>
  <action>
    Check that MQTT credentials are stored in n8n, not hardcoded:
    1. Search for any hardcoded broker URLs or credentials in JSON
    2. If found, replace with n8n credential references
    3. Document credential name for n8n configuration
  </action>
  <verify>
    <automated>grep -c "broker\|password\|secret" mqtt\ receive.json | xargs -I{} [ {} -eq 0 ] && echo "SECURE: No hardcoded credentials"</automated>
  </verify>
  <done>n8n credentials configured, no hardcoded secrets in JSON</done>
</task>

<task type="auto">
  <name>Task 01-03-1: Verify Supabase Tables Exist</name>
  <files>
    - supabase_schema.sql
  </files>
  <action>
    Review the Supabase schema and verify all required tables exist:
    1. Check for users table (id, name, email, phone, role, tenant_ids)
    2. Check for tenants table (id, name, status, plan, colors)
    3. Check for devices_status table (id, name, tenant_id, status, temperature, etc.)
    4. Check for telemetry table (id, device_id, temperature, timestamp)
    5. Check for events table (id, device_id, tenant_id, type, message, severity)
  </action>
  <verify>
    <automated>grep -E "CREATE TABLE.*(users|tenants|devices_status|telemetry|events)" supabase_schema.sql | wc -l</automated>
  </verify>
  <done>All 5 required tables are defined in schema</done>
</task>

<task type="auto">
  <name>Task 01-03-2: Verify Database Indexes</name>
  <files>
    - supabase_schema.sql
  </files>
  <action>
    Check that required indexes exist for query performance:
    1. Index on telemetry(device_id, timestamp DESC)
    2. Index on events(device_id, timestamp DESC)
    3. Index on events(tenant_id, timestamp DESC)
    4. Index on devices_status(tenant_id)
  </action>
  <verify>
    <automated>grep -c "CREATE INDEX.*idx_" supabase_schema.sql</automated>
  </verify>
  <done>At least 4 indexes defined for query performance</done>
</task>

<task type="checkpoint:human-verify">
  <name>Task 01-03-3: Verify RLS Policies</name>
  <files>
    - supabase_schema.sql
  </files>
  <what-built>RLS policies defined in supabase_schema.sql (lines 103-114)</what-built>
  <how-to-verify>
    1. Connect to Supabase dashboard: https://supabase.com/dashboard/project/ueyizghzblngswgukfmr
    2. Navigate to Table Editor
    3. For each table (users, tenants, devices_status, telemetry, events):
       - Click on the table
       - Go to RLS Policies tab
       - Verify "Allow all for [table]" policy exists
    4. Run query: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
       - All tables should show rowsecurity = true
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<wave_2>
## Wave 2: Sequential (Depends on Wave 1)

<task type="auto">
  <name>Task 01-02-1: Add Payload Validation Nodes</name>
  <files>
    - mqtt receive.json
  </files>
  <action>
    After MQTT trigger is verified, add payload validation:
    1. Add IF node: Check TIPO field exists and is not empty
    2. Add IF node: Check ID_DISPOSITIVO field exists
    3. Add IF node: Check TEMP_C exists and is numeric
    4. Add Error Trigger workflow for validation failures
    5. Route invalid payloads to error handler
  </action>
  <verify>
    <automated>jq '.nodes[] | select(.name | test("TIPO|ID_DISPOSITIVO|validation"; "i")) | .name' mqtt\ receive.json</automated>
  </verify>
  <done>Validation nodes exist for TIPO, ID_DISPOSITIVO, TEMP_C</done>
</task>

<task type="auto">
  <name>Task 01-02-2: Add Error Handler Workflow</name>
  <files>
    - mqtt receive.json
  </files>
  <action>
    Create error handling for validation failures:
    1. Add Error Trigger node to catch validation errors
    2. Log error details to console/stderr for debugging
    3. Optionally: Send notification for repeated failures
  </action>
  <verify>
    <automated>jq '.nodes[] | select(.type | test("error"; "i")) | {name, type}' mqtt\ receive.json</automated>
  </verify>
  <done>Error handling workflow connected to validation nodes</done>
</task>
</wave_2>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| ESP32 → MQTT Broker | Untrusted IoT device on network |
| MQTT Broker → n8n | Internal network, authenticated connection |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-P1-01 | Spoofing | ESP32 devices | accept | Local network assumption; production can add auth later |
| T-P1-02 | Tampering | MQTT payload | mitigate | Validate TIPO, ID_DISPOSITIVO, TEMP_C fields before processing |
| T-P1-03 | Information Disclosure | Supabase schema | accept | RLS policies in place; dev environment |
| T-P1-04 | Denial of Service | MQTT flood | mitigate | Error handler catches malformed payloads |
</threat_model>

<verification>
## Overall Phase Verification

1. MQTT trigger receives messages on `esp32c3/data`:
   `jq '.nodes[] | select(.parameters.topic == "esp32c3/data")' mqtt\ receive.json`

2. Schema has all required tables:
   `grep -E "CREATE TABLE.*(users|tenants|devices_status|telemetry|events)" supabase_schema.sql`

3. No hardcoded credentials:
   `grep -E "broker|url|password|secret" mqtt\ receive.json | grep -v credential | wc -l`
</verification>

<success_criteria>
## Phase 1 Completion Criteria

- [ ] **WORK-01**: MQTT trigger configured for `esp32c3/data` topic
- [ ] **WORK-02**: Payload validation nodes for TIPO, ID_DISPOSITIVO, TEMP_C
- [ ] **DB-01**: All 5 tables defined in supabase_schema.sql (users, tenants, devices_status, telemetry, events)
- [ ] **SEC-01**: No hardcoded credentials in mqtt receive.json

## Metrics
- Plans: 3
- Tasks: 7 (5 Wave 1, 2 Wave 2)
- Checkpoints: 1 (RLS verification)
</success_criteria>

<output>
After completion, create `.planning/phases/phase-01/phase-01-SUMMARY.md`
</output>