# Codebase Concerns

**Analysis Date:** 2026-05-07

## Tech Debt

### Database Schema Instability
- **Issue:** Multiple SQL migration files scattered across project root
- **Files:** `add_telemetry_columns.sql`, `add_phone_column.sql`, `add_chk_columns.sql`, `create_report_configs.sql`, `apply_triggers.sql`, `report_logs_table.sql`
- **Impact:** Schema changes are additive but not properly versioned; no rollback capability
- **Fix approach:** Create a consolidated migration strategy with versioned SQL files and a migration runner

### ESP32 Monolithic Main File
- **Issue:** Main sketch file (`esp32/esp32.ino`) contains ~1185 lines - violates separation of concerns
- **Files:** `esp32/esp32.ino`
- **Impact:** Difficult to maintain, test, or debug; all logic in single file despite having modular managers
- **Fix approach:** Refactor to use proper .cpp/.h separation with App class that delegates to managers

### Firebase + Supabase Hybrid Authentication
- **Issue:** Two authentication systems (Firebase Auth + Supabase) with no clear single source of truth
- **Files:** `dashboard/src/firebase/config.ts`, `dashboard/src/supabase/config.ts`, `supabase_schema.sql` (users table)
- **Impact:** User sync issues; double maintenance; confusion about which system owns user data
- **Fix approach:** Migrate fully to Supabase Auth and deprecate Firebase for auth; use Supabase for all user management

### Hardcoded Configuration in ESP32
- **Issue:** WiFi credentials and MQTT server hardcoded in header file
- **Files:** `esp32/Config.h` (lines 14-15: WIFI_SSID, WIFI_PASS; line 17: MQTT_SERVER)
- **Impact:** Recompilation required to change credentials; committed to repository
- **Fix approach:** Implement WiFi/MQTT provisioning via web portal or BLE configuration

### Multiple Test/Debug Scripts
- **Issue:** Multiple standalone test scripts with overlapping functionality
- **Files:** `dashboard/test_mqtt_ws.js`, `dashboard/test_supabase.js`, `dashboard/test_supabase2.js`, `dashboard/query_*.js`
- **Impact:** No clear which test to use; maintenance burden
- **Fix approach:** Consolidate into a single test utility with subcommands

### Hardcoded External Service URLs
- **Issue:** Production URLs hardcoded in server.js and n8n workflows
- **Files:** `dashboard/server.js` (line 39: n8n.nikaotech.com), `esp32/Config.h` (MQTT_SERVER)
- **Impact:** No environment-specific configuration; difficult to test locally
- **Fix approach:** Add environment variable configuration for all external URLs

## Known Bugs

### n8n Hourly Telemetry Filter Incomplete
- **Issue:** Workflow `n8n_hourly_telemetry.json` only processes messages with TIPO="relatorio_diario", missing other periodic data
- **Files:** `n8n_hourly_telemetry.json` (lines 30-46)
- **Trigger:** MQTT messages with different TIPO values are filtered out silently
- **Workaround:** Modify filter to handle additional TIPO values (periodic, status, etc.)

### MQTT Broker Without Authentication
- **Issue:** Mosquitto broker allows anonymous connections in development mode
- **Files:** Documentation mentions "Sem autenticação (dev)" in `COMPLETE_PROJECT_ANALYSIS.md`
- **Trigger:** Any device can publish/subscribe to any topic
- **Workaround:** Enable MQTT authentication before production deployment

### RLS Policies Too Permissive
- **Issue:** All RLS policies use "Allow all" rule (true + WITH CHECK)
- **Files:** `supabase_schema.sql` (lines 109-114)
- **Trigger:** Any client with anon key has full read/write access to all tables
- **Workaround:** Implement proper RLS policies based on authenticated user roles

## Security Considerations

### Hardcoded Credentials in Source Code
- **Risk:** WiFi password "liza1980" hardcoded in ESP32 firmware
- **Files:** `esp32/Config.h` line 15
- **Current mitigation:** None
- **Recommendations:** Remove hardcoded credentials; use secure provisioning or environment-based config

### Exposed Supabase Anon Key
- **Risk:** Client-side code uses Supabase anon key which has full table access due to permissive RLS
- **Files:** `dashboard/src/supabase/config.ts`
- **Current mitigation:** None - key is exposed in browser
- **Recommendations:** Enable proper RLS, implement row-level security per user, consider RLS for anon key

### MQTT WebSocket Proxy Without Rate Limiting
- **Risk:** No throttling on MQTT messages proxied through VPS server
- **Files:** `dashboard/server.js` (lines 25-33)
- **Current mitigation:** None
- **Recommendations:** Add rate limiting middleware to prevent DoS via MQTT

### Admin API Endpoint Without Authentication
- **Risk:** `/api/admin/delete-user` endpoint may not verify caller is admin
- **Files:** `dashboard/server.js` (lines 50-76)
- **Current mitigation:** Basic UID validation but no auth check
- **Recommendations:** Add Firebase auth verification before executing admin operations

### CORS and CSP Configuration
- **Risk:** Server.js CSP allows 'unsafe-inline' and 'unsafe-eval' which weakens XSS protection
- **Files:** `dashboard/server.js` (lines 82-92)
- **Current mitigation:** Basic CSP headers present but too permissive
- **Recommendations:** Remove unsafe directives; use CSP nonce or hash-based policy

## Performance Bottlenecks

### No Database Connection Pooling
- **Problem:** Each n8n workflow instance creates new Supabase connection
- **Files:** All n8n workflow JSON files using Supabase node
- **Cause:** Supabase client creates connection per request
- **Improvement path:** Implement connection pooling via Supabase session management; consider PgBouncer for high loads

### WebSocket MQTT Proxy Reliability
- **Problem:** HTTP proxy middleware may drop WebSocket connections under load
- **Files:** `dashboard/server.js` (lines 25-33)
- **Cause:** http-proxy-middleware not optimized for high-frequency MQTT over WebSocket
- **Improvement path:** Use dedicated MQTT WebSocket proxy (mosquitto ws prefix) or nginx stream proxy

### Large Telemetry Table Without Partitioning
- **Problem:** `telemetry` table grows unbounded; queries will slow over time
- **Files:** `supabase_schema.sql` (lines 51-62)
- **Cause:** No data lifecycle management; no partitioning strategy
- **Improvement path:** Implement table partitioning by time (monthly); add data retention policy

### n8n AI Agent Latency
- **Problem:** WhatsApp bot workflow depends on OpenRouter AI classification adding ~2-5s latency
- **Files:** `mqtt receive.json`
- **Cause:** Sequential AI call before command execution
- **Improvement path:** Add local command parsing fallback; cache common intents; async AI processing

## Fragile Areas

### Complex n8n Workflow (2500+ lines)
- **Files:** `mqtt receive.json` (2547 lines as indicated by offset)
- **Why fragile:** Single massive workflow with AI agent, memory buffer, Google Sheets, Evolution API - failure in one node cascades
- **Safe modification:** Test in isolated environment; use workflow version control; add error boundaries
- **Test coverage:** No automated workflow tests; manual testing required

### Multiple External Dependencies Chain
- **Files:** WhatsApp bot depends on: Evolution API → OpenRouter AI → Google Sheets → Firebase Auth
- **Why fragile:**任何一个服务故障都会导致整个命令系统失效
- **Safe modification:** Add timeout handling and fallback logic for each external service
- **Test coverage:** No integration tests covering failure scenarios

### ESP32 EEPROM Memory Layout
- **Files:** `esp32/Config.h` (addresses 0-239), `esp32/StorageManager.cpp`
- **Why fragile:** Fixed memory addresses; no version migration; corruption causes undefined behavior
- **Safe modification:** Add schema version byte; implement migration on boot; add CRC validation

### Dashboard Firebase Auth Race Condition
- **Files:** `dashboard/src/contexts/AuthContext.tsx`
- **Why fragile:** Auth state may not sync with Supabase client state on initial load
- **Safe modification:** Add auth state synchronization; implement loading states properly

## Scaling Limits

### Supabase Free Tier
- **Current capacity:** 500MB database, 1GB bandwidth, 100K realtime messages/day
- **Limit:** Exceeded with continuous telemetry ingestion (one reading per minute = 43K rows/month minimum)
- **Scaling path:** Upgrade to Pro tier; implement data aggregation/archival for historical data

### MQTT Message Throughput
- **Current capacity:** Single ESP32 device - limited testing
- **Limit:** Unknown - no load testing performed
- **Scaling path:** Implement message batching; add MQTT QoS1 persistence; cluster Mosquitto if needed

### n8n Workflow Concurrency
- **Current capacity:** Single n8n instance
- **Limit:** Concurrent MQTT triggers may queue
- **Scaling path:** Scale n8n horizontally; implement workflow queue with Redis

### VPS WebSocket Connections
- **Current capacity:** PM2 single process with http-proxy-middleware
- **Limit:** ~500-1000 concurrent WebSocket connections
- **Scaling path:** Use nginx for WebSocket handling; implement connection pooling

## Dependencies at Risk

### OpenRouter AI API
- **Risk:** External API with unknown uptime; rate limits may apply; pricing changes
- **Impact:** WhatsApp bot command classification fails; users cannot use natural language commands
- **Migration plan:** Implement local keyword-based command parser as fallback; cache AI responses

### Evolution API (WhatsApp)
- **Risk:** Third-party WhatsApp API wrapper; may break with WhatsApp policy changes
- **Impact:** WhatsApp control channel stops working entirely
- **Migration plan:** Monitor alternative solutions (bot-api, wa-js); implement webhook fallback

### Google Sheets for User Management
- **Risk:** Google Sheets API rate limits; document sharing issues; not designed for auth
- **Impact:** User permission management fails; new users cannot be added
- **Migration plan:** Migrate to Supabase users table with proper role management

### Firebase SDK (Legacy)
- **Risk:** Using both Firebase and Supabase creates redundancy; Firebase may deprecate services
- **Impact:** Duplicate user records; confusion about which system is authoritative
- **Migration plan:** Complete Supabase Auth migration; remove Firebase dependency

## Missing Critical Features

### Backup and Disaster Recovery
- **Problem:** No automated database backups; no offsite replication
- **Blocks:** Recovery from data loss; migration to new Supabase project

### Monitoring and Alerting for Infrastructure
- **Problem:** No system-level monitoring (CPU, memory, disk) for VPS
- **Blocks:** Proactive issue detection; capacity planning

### Logging Aggregation
- **Problem:** No centralized logging - console.log scattered across components
- **Blocks:** Debugging production issues; audit trails

### Error Boundary in React
- **Problem:** Dashboard crashes completely on uncaught errors
- **Blocks:** User experience degradation; no error recovery

### Version Control for n8n Workflows
- **Problem:** Workflows exist only as JSON files; no git history per workflow
- **Blocks:** Rollback capability; change tracking; collaboration

## Test Coverage Gaps

### n8n Workflow Testing
- **What's not tested:** No automated tests for workflow logic, error handling, or edge cases
- **Files:** All `*.json` workflow files
- **Risk:** Silent failures in production; broken workflows undiscovered until manually triggered
- **Priority:** High

### ESP32 Integration Testing
- **What's not tested:** Full sensor suite; MQTT message format; edge cases (sensor failures)
- **Files:** `esp32/esp32.ino`, `esp32/*.cpp`
- **Risk:** Hardware failures not detected; bad data published to broker
- **Priority:** Medium

### Dashboard Component Testing
- **What's not tested:** No unit tests for React components; no integration tests
- **Files:** `dashboard/src/components/*.tsx`
- **Risk:** UI regressions; broken functionality after updates
- **Priority:** Medium

### API Endpoint Testing
- **What's not tested:** server.js endpoints (except manual curl tests)
- **Files:** `dashboard/server.js`
- **Risk:** API failures in production; security vulnerabilities
- **Priority:** High

---

*Concerns audit: 2026-05-07*