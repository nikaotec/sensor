# Codebase Concerns

**Analysis Date:** 2026-05-20

## Security Issues

### CRITICAL: Hardcoded WiFi Credentials in Firmware

**Files:** `esp32/src/config/Config.h:18-19`

```c
#define WIFI_SSID "VENANCIO"
#define WIFI_PASS "liza1980"
```

**Risk:** WiFi SSID and password are compiled into every firmware binary. Anyone with access to the `.bin` files (committed to repo as `esp32/build/esp32.esp32.esp32wroverkit/esp32_*.ino.bin`) can extract credentials. The MQTT server IP is also hardcoded.

**Impact:** Network compromise if device is lost/stolen or binary is leaked.

**Fix approach:** Use WiFiManager for credential storage (already referenced as "OBSOLETO" in comments). Remove fallback credentials entirely or load from NVS/EEPROM only.

### CRITICAL: Firebase Private Key Committed to Repository

**Files:** `dashboard/.env` (line 5)

The `.env` file contains a full Firebase Admin SDK private key (`FIREBASE_PRIVATE_KEY`) with the `-----BEGIN PRIVATE KEY-----` block. While `dashboard/.env` is NOT tracked by git (root `.gitignore` covers `.env*`), the file exists on disk and the deploy script (`dashboard/package.json:12`) sends it via SCP to the VPS:

```json
"deploy": "npm run build && tar -czvf dashboard.tar.gz dist server.js package.json .env && scp ..."
```

**Risk:** The `.env` is transmitted over SCP to the VPS but also exists in the working directory. If accidentally committed, the private key grants full Firebase Admin access (user deletion, database reads/writes).

**Impact:** Complete Firebase project compromise.

**Fix approach:** Never include `.env` in deploy tarballs. Use environment variables on the VPS directly. Add `dashboard/.env` to `dashboard/.gitignore` explicitly.

### CRITICAL: Supabase RLS Policies Allow All Access

**Files:** `supabase_schema.sql:109-114`

```sql
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tenants" ON tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for devices_status" ON devices_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for telemetry" ON telemetry FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for events" ON events FOR ALL USING (true) WITH CHECK (true);
```

**Risk:** The Supabase anon key (`VITE_SUPABASE_ANON_KEY` in `dashboard/.env`) grants full read/write/delete access to ALL tables. Any user with the anon key can delete all telemetry, events, or user records.

**Impact:** Data destruction, unauthorized access to other tenants' data.

**Fix approach:** Implement proper RLS policies that restrict access by `tenant_id` and user role. The `apply_triggers.sql` provides tenant protection at the trigger level, but RLS should be the primary defense.

### HIGH: Hardcoded MQTT Server with No Authentication

**Files:** `esp32/src/config/Config.h:21-24`

```c
#define MQTT_SERVER "109.123.240.215"
#define MQTT_PORT 1883
#define MQTT_USER ""
#define MQTT_PASS ""
```

**Risk:** MQTT broker is exposed on the public internet (port 1883) with no username/password. Any device can connect, publish fake telemetry, or send malicious commands to ESP32 devices.

**Impact:** Device hijacking, false alerts, OTA attack vector.

**Fix approach:** Enable MQTT authentication (username/password) on Mosquitto. Use TLS (port 8883). The nginx configs show `mqtt.nikaotech.com` as a subdomain but MQTT traffic goes directly to the IP.

### HIGH: Default Menu Password is `0000`

**Files:** `esp32/src/display/DisplayManager.cpp:529-530`

```cpp
if (_password[0] == 0 && _password[1] == 0 && _password[2] == 0 && _password[3] == 0) {
  _currentMenu = MENU_MAIN;
```

**Risk:** The physical device menu is protected by a hardcoded 4-digit PIN `0000`. Anyone with physical access can change temperature thresholds, relay configurations, and calibration factors.

**Impact:** Unauthorized configuration changes, safety hazards (e.g., disabling temperature alarms).

**Fix approach:** Make the password configurable via MQTT command and stored in EEPROM. Require admin-level authentication for critical changes.

### HIGH: CSP Policy Allows `unsafe-eval` and `unsafe-inline`

**Files:** `dashboard/server.js:117-123`

```js
"default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; "
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:;"
```

**Risk:** Content Security Policy is effectively disabled. XSS attacks can inject and execute arbitrary scripts.

**Impact:** Dashboard compromise, credential theft, unauthorized command execution via MQTT WebSocket.

**Fix approach:** Remove `unsafe-eval` and `unsafe-inline`. Use nonce-based or hash-based CSP.

### MEDIUM: Admin Delete-User Endpoint Has No Authentication

**Files:** `dashboard/server.js:84-108`

The `/api/admin/delete-user` endpoint accepts any POST request with a UID and deletes the Firebase user. There is no authentication check (no Firebase ID token validation, no admin role check).

**Risk:** Any caller who knows the endpoint can delete any Firebase user by UID.

**Impact:** User account destruction, denial of service.

**Fix approach:** Add Firebase ID token verification and admin role check before processing deletion.

### MEDIUM: Nginx Configs Reference Missing SSL Certificates

**Files:** `docs/nginx-n8n-https.conf:19-20`, `docs/nginx-mqtt-proxy.conf:14-15`

SSL certificate paths reference `/etc/letsencrypt/live/nikaotech.com/` but there's no evidence certbot is configured or certificates are deployed.

**Risk:** If nginx starts without valid certs, it fails to start, exposing services on HTTP only.

**Fix approach:** Add certbot automation, health checks for SSL cert validity.

## Technical Debt

### ESP32 Firmware: Monolithic `main.cpp` (1357 lines)

**Files:** `esp32/src/main.cpp`

The main firmware file contains:
- Global object declarations (lines 19-43)
- System state variables (lines 44-69)
- Helper functions (lines 82-170)
- Main loop with all sensor reading, alert checking, relay control, MQTT sending (lines 173-558)
- Setup function (lines 561-615)
- MQTT command handler with 20+ intent branches (lines 618-1094)
- Three separate data-sending functions (lines 1097-1357)

**Impact:** Difficult to test, maintain, or extend. Adding a new sensor type or alert requires modifying the monolithic loop.

**Fix approach:** Extract the command handler into `CommandHandler.cpp`, split data-sending into `TelemetrySender.cpp`, use a proper state machine for the loop.

### ESP32 Firmware: Excessive `delay()` Calls

**Files:** `esp32/src/main.cpp:84-100`, `esp32/src/main.cpp:174`

```cpp
void emitirBipe(int tempo = 100, int repeticoes = 1, int pausa = 100) {
  for (int i = 0; i < repeticoes; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(tempo);  // Blocking delay
    digitalWrite(PIN_BUZZER, LOW);
    delay(pausa);  // Blocking delay
  }
}
```

And `delay(1)` in the main loop (line 174) as a "Watchdog Feed."

**Risk:** Blocking delays prevent MQTT keepalive, sensor reading, and display updates during buzzer operations. The `delay(1)` is not a proper watchdog feed.

**Impact:** MQTT disconnections during alerts, missed sensor readings, OTA failures.

**Fix approach:** Replace `delay()` with non-blocking `millis()`-based timing. Use hardware watchdog properly.

### ESP32 Firmware: EEPROM Write on Every Temperature Reading

**Files:** `esp32/src/storage/StorageManager.cpp:246-258`

```cpp
void StorageManager::updateRecords(float currentTemp) {
  if (currentTemp > data.tempMaxRec) {
    data.tempMaxRec = currentTemp;
    EEPROM.put(ADDR_MAX_REC, data.tempMaxRec);
    EEPROM.commit();  // Writes flash on EVERY new max
  }
  if (currentTemp < data.tempMinRec) {
    data.tempMinRec = currentTemp;
    EEPROM.put(ADDR_MIN_REC, data.tempMinRec);
    EEPROM.commit();  // Writes flash on EVERY new min
  }
}
```

**Risk:** ESP32 EEPROM (flash) has ~100,000 write cycle endurance. Called every loop iteration (~2 seconds) when temperature exceeds previous records. Rapid temperature changes can exhaust flash cells in hours.

**Impact:** EEPROM corruption, loss of all configuration data, device bricking.

**Fix approach:** Batch EEPROM writes. Only commit max/min changes at fixed intervals (e.g., every 5 minutes) or on shutdown.

### SQL Migrations: Fragmented and Non-Idempotent

**Files:** `add_alarm_columns.sql`, `add_telemetry_columns.sql`, `add_chk_columns.sql`, `add_phone_column.sql`, `fix_telemetry_types.sql`, `migrate_telemetry_datetime.sql`, `apply_triggers.sql`, `create_report_configs.sql`, `report_logs_table.sql`, `sync_users_devices.sql`

Ten separate SQL migration files scattered in the repo root with no version tracking, no rollback strategy, and no guarantee of execution order.

**Impact:** Database schema drift between environments. `fix_telemetry_types.sql` drops and recreates columns, which would destroy data if run on a populated table.

**Fix approach:** Use a proper migration tool (e.g., Supabase migrations, dbmate, or flyway). Consolidate into a single `schema.sql` for fresh installs and numbered migrations for updates.

### n8n Workflows: Massive Monolithic Workflow

**Files:** `mqtt receive.json` (2546 lines)

The main MQTT receive workflow is a single 2546-line JSON file containing user management, Google Sheets integration, WhatsApp messaging, Supabase operations, and AI/LLM nodes all in one workflow.

**Impact:** Impossible to debug, version control diffs are meaningless, importing/exporting is fragile.

**Fix approach:** Split into separate workflows: `mqtt-telemetry`, `mqtt-commands`, `user-management`, `whatsapp-alerts`.

### Dashboard: `.env` Excluded from Deploy But Sent via SCP

**Files:** `dashboard/package.json:12`

The deploy script tars `.env` and sends it to the VPS, but the root `.gitignore` excludes `.env*` files. This means the `.env` must exist locally but isn't version-controlled.

**Risk:** New developers or CI pipelines cannot deploy without manually creating the `.env`. The Firebase private key is transmitted in a tarball.

**Fix approach:** Use VPS environment variables or a secrets manager. Never ship `.env` files in deploy artifacts.

## Performance Bottlenecks

### Dashboard: No Telemetry Data Retention Policy

**Files:** `supabase_schema.sql:51-62`

The `telemetry` table has no partitioning, no retention policy, and no cleanup mechanism. With devices sending data every hour (or more frequently), this table will grow unbounded.

**Impact:** Query performance degradation, increased Supabase storage costs, eventual database slowdown.

**Fix approach:** Implement table partitioning by month, add a retention policy (e.g., delete data older than 1 year), or use Supabase's built-in time-series features.

### ESP32: Blocking DallasTemperature Sensor Reading

**Files:** `esp32/src/main.cpp:290-291`

```cpp
targetSensor->requestTemperatures();  // Blocks for ~750ms
float tempBruta = targetSensor->getTempCByIndex(0);
```

The DS18B20 temperature conversion takes ~750ms and blocks the entire loop. While `setWaitForConversion(false)` is called in setup (line 597), the code still calls `requestTemperatures()` synchronously in the loop.

**Impact:** MQTT keepalive messages delayed, display updates throttled, alert response latency.

**Fix approach:** Use async temperature reading: call `requestTemperatures()`, then check `isConversionComplete()` on subsequent loop iterations.

### n8n: Duplicate MQTT Triggers on Same Topic

**Files:** `mqtt receive.json`, `n8n_events_logger.json`, `n8n_hourly_telemetry.json`

Multiple n8n workflows subscribe to `esp32c3/data`. Each message triggers all workflows simultaneously, causing:
- Duplicate database writes if workflows overlap
- Increased n8n CPU/memory usage
- Race conditions on `devices_status` upserts

**Impact:** Database contention, wasted compute, potential data inconsistencies.

**Fix approach:** Use a single MQTT trigger workflow that routes messages by `TIPO` field to sub-workflows.

## Fragile Areas

### ESP32: EEPROM Address Map Has No Version Guard

**Files:** `esp32/src/config/Config.h:67-98`

The EEPROM address map is manually managed with hardcoded offsets. When new fields are added (as seen with PT100, sensor type, light enable, version), addresses must be manually recalculated. The comment at line 90-92 shows previous overlap bugs:

```c
#define ADDR_RELAY_1 176 // 144 + 32 (era 168 - causing overlap!)
#define ADDR_RELAY_2 208 // 176 + 32 (era 192 - causing overlap!)
#define ADDR_RELAY_3 240 // 208 + 22 (era 216 - causing overlap!)
```

**Risk:** Adding new fields risks silent data corruption. No schema version in EEPROM to detect mismatched firmware/storage layouts.

**Fix approach:** Add an EEPROM schema version byte. On load, check version and migrate or reset. Use `offsetof()` for automatic address calculation.

### n8n: Google Sheets as User Database

**Files:** `mqtt receive.json:44-98`

User administration (`Add Admin to Sheet` node) writes to a Google Sheet (`1HTEAOfzwIQqUdf3bywOHMFVmktT3N51mtiLzpbP3Lm4`). This is a secondary user store alongside Supabase `users` table.

**Risk:** Data inconsistency between Google Sheets and Supabase. Sheet access depends on OAuth token that can expire.

**Impact:** User management failures, orphaned accounts, broken WhatsApp alert routing.

**Fix approach:** Migrate all user data to Supabase. Remove Google Sheets dependency.

### Dashboard: Firebase and Supabase Dual Auth

**Files:** `dashboard/src/contexts/AuthContext.tsx`, `dashboard/src/supabase/config.ts`

The dashboard uses Firebase Auth for user authentication but Supabase for data storage. The two systems are not synchronized automatically.

**Risk:** Users deleted in Firebase still exist in Supabase. Supabase RLS cannot use Firebase UID for row-level policies without a sync mechanism.

**Fix approach:** Use a single auth provider, or implement a webhook that syncs Firebase user creation/deletion to Supabase.

### OTA: No Rollback Mechanism

**Files:** `esp32/src/main.cpp:631-659`

The OTA update downloads a new firmware binary, saves the version to EEPROM, and immediately reboots. If the new firmware crashes on boot, the device is bricked with no way to recover.

**Risk:** Remote bricking of deployed devices.

**Fix approach:** Implement a boot counter in EEPROM. If the device doesn't reach a "healthy" state within N boots, revert to the previous firmware partition.

## Scalability Concerns

### Single MQTT Topic for All Devices

**Files:** `esp32/src/config/Config.h:27`

```c
#define MSG_TOPIC_DATA "esp32c3/data"
```

All devices publish to the same topic. n8n workflows must parse `ID_DISPOSITIVO` from the payload to route correctly.

**Impact:** No topic-level filtering. Adding device-specific subscriptions is impossible. Message ordering is not guaranteed across devices.

**Fix approach:** Use per-device topics: `esp32c3/data/{device_id}`. Keep a wildcard subscription `esp32c3/data/+` for n8n.

### No Rate Limiting on Dashboard API

**Files:** `dashboard/server.js:131-188`

The `/api/sensors` POST endpoint writes to a JSON file on every request with no rate limiting, no authentication, and no input validation beyond a try/catch.

**Risk:** Disk exhaustion from rapid requests. File corruption from concurrent writes.

**Fix approach:** Add rate limiting, input validation, and atomic file writes (write to temp, then rename).

## Missing Critical Features

### No Health Check Endpoint

The dashboard server (`server.js`) has no `/health` endpoint. n8n and monitoring systems cannot verify the dashboard is operational.

**Fix approach:** Add `GET /health` returning `{ status: "ok", uptime: process.uptime() }`.

### No Audit Trail for Configuration Changes

Configuration changes via MQTT commands are logged to `events` table but without the previous values. There's no way to audit who changed what and when.

**Fix approach:** Store before/after values in the events table for all configuration changes.

### No Backup Strategy

No automated backup exists for Supabase data, Firebase users, or n8n workflows.

**Fix approach:** Implement Supabase automated backups, export n8n workflows to version control, document Firebase export procedures.

## Test Coverage Gaps

### ESP32 Firmware: No Automated Tests

**Files:** `esp32/src/` (no test files)

The firmware has zero unit tests, integration tests, or hardware-in-the-loop tests.

**Risk:** Regressions in relay control, temperature reading, or alert logic go undetected until deployed.

**Priority:** High

### n8n Workflows: No Test Harness

**Files:** `mqtt receive.json`, `n8n_*.json`

n8n workflows are tested manually only. No automated workflow testing.

**Risk:** Broken workflows after n8n version upgrades or credential changes.

**Priority:** Medium

### Dashboard: Minimal Test Coverage

**Files:** `dashboard/src/services/__tests__/TelemetryService.test.ts`

Only one test file exists (`TelemetryService.test.ts`). No tests for components, hooks, contexts, or the server.js Express routes.

**Risk:** UI regressions, broken auth flow, API endpoint failures.

**Priority:** Medium

## Dependencies at Risk

### ESP32: ArduinoJson StaticJsonDocument Size Limits

**Files:** `esp32/src/main.cpp:129`, `esp32/src/main.cpp:257`, `esp32/src/main.cpp:1101`, `esp32/src/main.cpp:1193`, `esp32/src/main.cpp:1322`

Multiple `StaticJsonDocument` instances with sizes 256, 512, and 1024 bytes. Adding fields to MQTT payloads risks stack overflow on the ESP32-C3 (limited RAM).

**Risk:** Hard crashes when payload exceeds document size. Silent data loss if fields are truncated.

**Fix approach:** Use `DynamicJsonDocument` for large payloads. Monitor actual payload sizes.

### Dashboard: Firebase Admin SDK Private Key Rotation

**Files:** `dashboard/.env:5`

The Firebase service account key has no expiration date visible. If compromised, it must be manually rotated.

**Risk:** Long-lived credential with no rotation policy.

**Fix approach:** Implement key rotation schedule. Use short-lived tokens where possible.

---

*Concerns audit: 2026-05-20*
