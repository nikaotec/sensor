# Codebase Concerns

**Analysis Date:** 2026-05-07

## Tech Debt

### Database Schema Patches

**Issue:** Multiple database schema migrations executed ad-hoc to fix data types
- Files: `fix_telemetry_types.sql`, `migrate_telemetry_datetime.sql`, `add_telemetry_columns.sql`, `add_chk_columns.sql`
- Impact: Schema evolution unclear; some columns may have been dropped/re-added multiple times
- Fix approach: Consolidate migrations into single authoritative schema, document history

### Permissive RLS Policies

**Issue:** Row Level Security enabled but with overly permissive policies
- Files: `supabase_schema.sql` (lines 103-114)
- Current policy: `"Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true)`
- Impact: Any client with anon key has full table access - no data isolation between tenants
- Fix approach: Implement proper RLS policies filtering by tenant_id, user_id

### Hardcoded Credentials in Workflows

**Issue:** Workflow JSON files contain credential IDs and references
- Files: `mqtt receive.json`, `gerador-relatorios-pdf.json`, `n8n_hourly_telemetry.json`
- Impact: Credentials stored in JSON; moving workflows between environments requires credential re-linking
- Fix approach: Use environment variables or n8n's credential management

### Unused/Missing Code

**Issue:** Dashboard contains functions for multiple data operations
- Files: `dashboard/server.js` (lines 99-156)
- Example: `/api/sensors` endpoint writing to JSON file alongside Supabase
- Impact: Dual data paths; potential sync issues
- Fix approach: Remove file-based fallback, use only database

### Evolving Telemetry Schema

**Issue:** `telemetry` table has had multiple column additions
- Files: `supabase_schema.sql`, `add_telemetry_columns.sql`, `fix_telemetry_types.sql`
- Columns: device_id, temperature, temp_max, temp_min, humidity, battery, voltage, signal, timestamp, data_registro, hora_registro
- Impact: Some records may have NULL values for newer columns
- Fix approach: Add NOT NULL constraints only where appropriate, document column purposes

---

## Security Considerations

### Permissive Database Access

**Risk:** RLS policies allow unrestricted access via anon key
- Files: `supabase_schema.sql` (lines 110-114)
- Current: `CREATE POLICY "Allow all for telemetry" ON telemetry FOR ALL USING (true) WITH CHECK (true);`
- Recommendation: Implement tenant-based filtering

**Risk:** JSON file with device data accessible
- Files: `dashboard/src/data/telemetry.json`
- Current approach: File system read exposed via API
- Recommendation: Remove file-based persistence, database only

### API Security

**Risk:** Firebase admin operations exposed via server.js
- Files: `dashboard/server.js` (lines 50-76)
- Endpoint: `/api/admin/delete-user` uses firebase CLI
- Current mitigation: Basic UID validation
- Recommendations: Add authentication middleware, use Firebase Admin SDK directly

### Content Security Policy

**Risk:** CSP allows unsafe-inline and unsafe-eval
- Files: `dashboard/server.js` (lines 82-93)
- Current: `"script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:"`
- Recommendation: Refactor to remove inline scripts

### External Dependencies

**Risk:** Evolution API included as submodule/copy
- Files: `evolution-api-main/`
- Impact: Large codebase (hundreds of MB), security patches needed externally
- Recommendations: Use containerized version, track CVEs

---

## Performance Bottlenecks

### Dual Data Persistence

**Problem:** Sensor data written to both Supabase AND local JSON file
- Files: `dashboard/server.js` (lines 99-156), `dashboard/src/data/telemetry.json`
- Cause: Redundant write path; JSON updates on every webhook
- Improvement path: Remove JSON file path, database only

### Large Workflow Files

**Problem:** `mqtt receive.json` is 2547 lines of JSON
- Files: `mqtt receive.json`
- Impact: Slower n8n editor loading
- Improvement path: Break into sub-workflows with triggers

### Database Index Gaps

**Current indices:**
- `idx_telemetry_device_time` ON (device_id, timestamp DESC)
- `idx_events_device_time` ON (device_id, timestamp DESC)
- Missing index: tenant_id on telemetry table
- Impact: Queries filtering by tenant slow without tenant_id index
- Improvement path: Add composite index on (tenant_id, device_id, timestamp)

### Realtime Subscription Overhead

**Risk:** Multiple tables in supabase_realtime publication
- Files: `supabase_schema.sql` (lines 85-89)
- Publication: devices_status, telemetry, events, tenants, users
- Impact: Connection overhead, bandwidth on subscribe
- Recommendation: Enable per-table, not blanket

---

## Fragile Areas

### MQTT Message Parsing

**Why fragile:** Payload parsing assumes JSON structure
- Files: `n8n_hourly_telemetry.json` (lines 17-19)
- Pattern: `JSON.parse(payloadString)` without try-catch at workflow level
- Safe modification: Wrap in IF node checking parse result

### Timezone Handling

**Why fragile:** Hardcoded timezone "America/Sao_Paulo"
- Files: `n8n_hourly_telemetry.json` (lines 83, 87, 91)
- Current: `$now.setZone('America/Sao_Paulo')`
- Safe modification: Use timezone from config/env variable

### Display Format Assumptions

**Why fragile:** Report generator assumes specific telemetry_data structure
- Files: `gerador-relatorios-pdf.json` (lines 116-127)
- Pattern: Direct access to input fields assuming types
- Safe modification: Add type checking/validation node

### Dashboard API Validation

**Why fragile:** Minimal validation on `/api/sensors` endpoint
- Files: `dashboard/server.js` (lines 99-156)
- Pattern: `data?.data?.temperature ?? data?.temperature` fallback chain
- Safe modification: Add JSON schema validation

---

## Scaling Limits

### Supabase Free Tier

**Current capacity:** ~500MB database, 100 concurrent connections
- Limit: Database size and concurrent connections
- Scaling path: Upgrade to Pro plan ($25/month)

### MQTT Broker

**Current setup:** Single Mosquitto instance via Docker
- Limit: Single broker = no HA
- Scaling path: Set up MQTT clustering (EMQX, HiveMQ)

### n8n Workflow Execution

**Current limit:** Host-dependent (self-hosted or cloud)
- Constraint: No horizontal scaling without external queue
- Scaling path: Add Redis queue for execution

### Static File Storage

**Current approach:** Dashboard build served statically
- Artifacts: `dashboard/dist/`
- No CDN integration
- Scaling path: Deploy to Cloudflare Pages/Vercel with CDN

---

## Known Issues

### Telemetry Data Type Mismatch

**Issue:** telemetry table column types changed during development
- Files: `fix_telemetry_types.sql`
- Fix status: Migrations applied, schema should be stable
- Verification: Run `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'telemetry';`

### Credential Links

**Issue:** Workflow credential references are environment-specific
- Files: `mqtt receive.json`
- Example: `"credentials": { "evolutionApi": { "id": "QqcSRveOqQAdkYAB" } }`
- Workaround: Re-link credentials when importing workflow

### Git History

**Issue:** Large external dependency committed
- Files: `evolution-api-main/` (~200MB)
- Impact: Large clone size, slow git operations
- Fix approach: Add to .gitignore, use submodule, or remove entirely

---

## Test Coverage Gaps

### n8n Workflow Testing

**What's not tested:** No automated tests for workflow logic
- Files: All `*.json` workflow files
- Risk: Logic errors only caught in production
- Priority: Medium

### Database Migrations

**What's not tested:** SQL migrations applied blindly
- Files: `*.sql` migration files
- Risk: Schema errors only caught after apply
- Priority: Medium

### Dashboard API

**What's not tested:** No test suite for server.js
- Files: `dashboard/server.js`
- Risk: Runtime errors not caught
- Priority: Low

---

*Concerns audit: 2026-05-07*