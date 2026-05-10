# Codebase Concerns

**Analysis Date:** 2026-05-10

## Tech Debt

**ESP32 Hardcoded WiFi Credentials:**
- Issue: WiFi password hardcoded directly in source code
- Files: `esp32/Config.h:15`
- Impact: Security vulnerability - credentials exposed in repository
- Fix approach: Use WiFi manager library or EEPROM/stored credentials with secure provisioning

**Dashboard Hardcoded Firebase API Key:**
- Issue: Firebase API key hardcoded in source code instead of environment variables
- Files: `dashboard/src/firebase/config.ts:6`
- Impact: Exposes Firebase project credentials publicly
- Fix approach: Move to environment variables (VITE_FIREBASE_API_KEY)

**Environment Variables Not Gitignored:**
- Issue: `.env` file with Supabase credentials is not in `.gitignore`
- Files: `dashboard/.env`, `dashboard/.gitignore`
- Impact: Sensitive API keys and URLs committed to version control
- Fix approach: Add `.env*` to `.gitignore`

**ESP32 MQTT Credentials Empty:**
- Issue: MQTT username/password are empty strings
- Files: `esp32/Config.h:19-20`
- Impact: No authentication on MQTT broker - potential security risk
- Fix approach: Add proper MQTT authentication credentials

## Known Bugs

**Empty Catch Blocks Silencing Errors:**
- Symptoms: Errors are silently caught without logging or handling
- Files: `dashboard/src/hooks/useMqttData.ts:25`, `dashboard/src/hooks/useMqttData.ts:253`
- Trigger: When localStorage data is corrupted or JSON parsing fails
- Workaround: Add error logging to catch blocks

**Missing Error Boundary Fallback:**
- Components may fail to render without graceful error handling for specific edge cases
- Files: `dashboard/src/components/DeviceDetails.tsx`

## Security Considerations

**Hardcoded Credentials in ESP32:**
- Risk: WiFi SSID and password exposed in source code
- Files: `esp32/Config.h:14-15`
- Current mitigation: None
- Recommendations: Implement secure credential storage using WiFi Manager or secure provisioning

**CORS Configuration:**
- Risk: Server uses permissive CORS settings in `server.js`
- Files: `dashboard/server.js:78`
- Current mitigation: CSP headers present but use 'unsafe-inline'
- Recommendations: Tighten CORS to specific domains

**CSP Allows Unsafe Eval:**
- Risk: Content Security Policy allows 'unsafe-eval' which enables XSS attacks
- Files: `dashboard/server.js:85-90`
- Current mitigation: None
- Recommendations: Remove 'unsafe-eval' from CSP header

## Performance Bottlenecks

**MQTT Reconnection on Every Mount:**
- Problem: MQTT client reconnects on component remount without connection pooling
- Files: `dashboard/src/hooks/useMqttData.ts`
- Cause: No singleton connection management
- Improvement path: Implement connection singleton or context provider

**Device List Filtering on Every Render:**
- Problem: Large device arrays filtered in useMemo but with complex dependency chains
- Files: `dashboard/src/hooks/useTelemetryData.ts:33-61`
- Cause: Multiple filter passes and array operations
- Improvement path: Pre-filter at database level with proper indexes

## Fragile Areas

**Supabase Query Logic:**
- Files: `dashboard/src/hooks/useSupabaseData.ts`
- Why fragile: Complex query construction with string concatenation for tenant filtering
- Safe modification: Add TypeScript types for query builders
- Test coverage: Unit tests needed for query building

**MQTT Message Parsing:**
- Files: `dashboard/src/hooks/useMqttData.ts:200-260`
- Why fragile: JSON parsing assumes specific payload structure without validation
- Safe modification: Add schema validation before processing
- Test coverage: No test coverage for message parsing

## Scaling Limits

**Supabase Free Tier:**
- Current capacity: Limited database rows and API calls
- Limit: Will hit limits with >500 devices or high frequency telemetry
- Scaling path: Implement pagination, data aggregation, and consider upgrading tier

**Memory Storage on ESP32:**
- Current capacity: 288 bytes EEPROM
- Limit: Configuration data growing - risk of overflow
- Scaling path: Use external SPIFFS or SD card for larger config storage

## Dependencies at Risk

**Vite 7.x (Beta):**
- Risk: Using Vite version 7.3.1 which is in beta
- Impact: Potential breaking changes or instability
- Migration plan: Monitor stable releases and update to stable version

**React 19 (New):**
- Risk: React 19.2.0 is very new with potential compatibility issues
- Impact: Component lifecycle changes, possible breaking changes in libraries
- Migration plan: Test thoroughly, consider downgrading to React 18 until stable

**Tailwind 3.x:**
- Risk: Using Tailwind 3.4.x while Tailwind 4.x is available
- Impact: Old version, may miss security patches
- Migration plan: Upgrade to Tailwind 4.x following migration guide

## Missing Critical Features

**No Authentication Token Refresh:**
- Problem: Firebase auth tokens may expire without refresh handling
- Blocks: Long-running dashboard sessions
- Priority: High

**No Offline Support:**
- Problem: Dashboard doesn't work when MQTT broker is unreachable
- Blocks: Device monitoring during network issues
- Priority: Medium

**No Data Validation on MQTT Messages:**
- Problem: Invalid telemetry data can crash components
- Blocks: Reliable monitoring
- Priority: High

## Test Coverage Gaps

**MQTT Connection Handling:**
- What's not tested: Reconnection logic, message parsing, error states
- Files: `dashboard/src/hooks/useMqttData.ts`
- Risk: Connection issues go undetected
- Priority: High

**Device Filtering Logic:**
- What's not tested: Tenant-based filtering, role-based access control
- Files: `dashboard/src/hooks/useTelemetryData.ts`
- Risk: Security bypass - users seeing wrong devices
- Priority: High

**Service Layer:**
- What's not tested: SupabaseMapper, TelemetryService
- Files: `dashboard/src/services/SupabaseMapper.ts`, `dashboard/src/services/TelemetryService.ts`
- Risk: Data transformation bugs go unnoticed
- Priority: Medium

---

*Concerns audit: 2026-05-10*