# Coding Conventions

**Analysis Date:** 2026-05-20

## Languages & Runtimes

**C++ (Arduino/ESP32):**
- Firmware in `esp32/src/` — PlatformIO-style project
- Uses Arduino framework, `ArduinoJson`, `PubSubClient`, `WiFiManager`
- No formal C++ standard enforced; mixes C-style macros with C++ classes

**TypeScript/React (Dashboard):**
- React 19 + Vite 7 + TypeScript 5.9
- Strict mode enabled via `tsconfig.app.json`
- ESM modules (`"type": "module"` in `package.json`)

**Python (Utility Scripts):**
- Ad-hoc scripts at repo root (`edit_dashboard.py`, `revert.py`, `patch_n8n_telemetry.py`)
- No virtualenv conventions enforced; `.venv/` directory exists but unused by scripts
- No type hints, no linting

**JavaScript (Test Scripts):**
- Standalone Node.js scripts (`test_user_flow.js`, `test_number.js`) run with `node`
- No test framework; manual `console.log` + `process.exit(1)` pattern

## Naming Patterns

**Files:**
- C++: `PascalCase.cpp` / `PascalCase.h` — e.g., `MqttManager.cpp`, `AlertManager.h`
- TypeScript: `PascalCase.tsx` for components, `camelCase.ts` for services/hooks/utils
  - Components: `CalibrationControl.tsx`, `DeviceCard.tsx`
  - Services: `TelemetryService.ts`, `OtaService.ts`, `SupabaseMapper.ts`
  - Hooks: `useMqttData.ts`, `useTelemetryData.ts`, `useOtaManager.ts`
  - Utils: `reportValidation.ts`, `statusUtils.ts`
- SQL: `snake_case.sql` — e.g., `supabase_schema.sql`, `add_alarm_columns.sql`
- Python: `snake_case.py` — e.g., `edit_dashboard.py`
- n8n workflows: `kebab-case.json` — e.g., `mqtt receive.json`, `n8n_events_logger.json`

**Functions:**
- C++: `camelCase` — e.g., `firmware_setup()`, `enviarDadosMqtt()`, `lerTemperaturaPT100()`
  - Portuguese names used extensively: `enviarDadosWeb`, `notificarUsuario`, `getIdDispositivo`
- TypeScript: `camelCase` — e.g., `normalizePayload()`, `mapRowToDevice()`, `validateReportSelection()`
- Python: `snake_case` — standard Python convention

**Variables:**
- C++: `camelCase` for locals, `UPPER_SNAKE_CASE` for macros/constants
  - Globals at top of `main.cpp`: `temperaturaAtual`, `releEstado`, `modoManual` (Portuguese)
  - Config constants: `FIRMWARE_VERSION`, `MSG_TOPIC_DATA`, `DS18B20_PIN_1`
- TypeScript: `camelCase` — e.g., `mqttClient`, `displayDevices`, `currentTenant`
  - Type aliases: `PascalCase` — `DeviceTelemetry`, `SupabaseDeviceRow`
  - Interfaces: `PascalCase` — `CalibrationControlProps`, `ReportValidationResult`

**Types/Interfaces:**
- TypeScript interfaces end with descriptive nouns: `SupabaseDeviceRow`, `OtaMqttProgressPayload`
- Type aliases use `PascalCase`: `TempSensorType`, `DeviceTelemetry`
- Enums in C++: `PascalCase` — `SensorType`, `RelayFunc`, `AlertStatus`

## Code Style

**Formatting:**
- No Prettier configured
- ESLint flat config at `dashboard/eslint.config.js` with:
  - `@eslint/js` recommended
  - `typescript-eslint` recommended
  - `eslint-plugin-react-hooks` recommended
  - `eslint-plugin-react-refresh` Vite plugin
- 2-space indentation in TypeScript/JSX files
- Semicolons used consistently in TypeScript
- Single quotes for strings in TypeScript, double quotes in JSX attributes

**Linting:**
- `npm run lint` → `eslint .` — runs flat config
- No custom rules beyond recommended presets
- No ESLint overrides or per-file rules

## Import Organization

**Order (TypeScript):**
1. External libraries (React, mqtt, lucide-react, @supabase)
2. Internal absolute/relative imports (services, hooks, components, contexts)
3. Type imports use `import type` syntax

**Path Aliases:**
- No path aliases configured — all imports use relative paths (`../services/TelemetryService`)
- `tsconfig.app.json` uses default module resolution

**Example pattern** (`dashboard/src/App.tsx`):
```typescript
import { useState, useEffect, useRef } from 'react'
import Login from './components/Login'
import { TenantProvider, useTenant } from './contexts/TenantContext'
import { useMqttData } from './hooks/useMqttData'
import { X, AlertOctagon } from 'lucide-react'
```

## Error Handling

**C++ (ESP32):**
- Serial logging for debugging: `Serial.println("[MQTT RX] ...")`
- No exceptions — uses return values and guards
- Connection failures trigger `ESP.restart()` (e.g., WiFiManager timeout)
- MQTT publish guards: `if (!mqtt.isConnected()) return;`
- JSON deserialization checked: `if (error) { Serial.println(...); return; }`

**TypeScript (Dashboard):**
- Try/catch blocks with `console.error` / `console.warn`
- Supabase errors handled inline: `const { error } = await supabase...; if (error) console.error(...)`
- MQTT message parsing wrapped in try/catch
- Error boundary component at `dashboard/src/components/ErrorBoundary.tsx`
- No custom error classes — uses string messages and console output

**Python Scripts:**
- No error handling — scripts assume file paths exist
- `edit_dashboard.py` has a fallback print but no try/catch

**JavaScript Test Scripts:**
- Manual assertion: `if (status === 'FAIL') process.exit(1)`
- No try/catch — failures crash the process

## Logging

**C++:**
- `Serial.println()` / `Serial.printf()` with bracketed prefixes:
  - `[NET]`, `[MQTT]`, `[OTA]`, `[RELE]`, `[TIMER]`, `[DATA]`, `[SILENCIO]`
- `F()` macro for string literals in flash: `Serial.print(F("[ENVIAR_WEB] ..."))`

**TypeScript:**
- `console.log()` for info, `console.warn()` for warnings, `console.error()` for errors
- Tagged prefixes: `[MQTT]`, `[Nome Alterado]`, `[OtaService]`
- No structured logging framework

## Comments

**C++:**
- Section dividers: `// ---------- OBJETO GLOBAIS ----------`
- Inline comments in Portuguese explaining logic
- JSDoc-style not used

**TypeScript:**
- JSDoc comments on public service methods:
  ```typescript
  /**
   * Normaliza o payload recebido via MQTT para o formato padrão do sistema.
   * Suporta múltiplas versões de firmware (campos em maiúsculas e minúsculas).
   */
  ```
- Inline comments in Portuguese for complex logic
- Test files use separator comments: `// ──────────────────────────────────────────────`

## Function Design

**C++:**
- `main.cpp` is 1357 lines — large monolithic file
- `handleCommand()` is ~400 lines with deeply nested if/else chains
- Helper functions extracted: `emitirBipe()`, `notificarUsuario()`, `getIdDispositivo()`
- Forward declarations used for mutual references

**TypeScript:**
- Services use static methods: `TelemetryService.normalizePayload()`
- Hooks return objects with state + actions: `{ devices, isConnected, publish, updateDeviceLocal, mqttClient }`
- Components use functional style with explicit prop interfaces
- Props drilling common — no context for device state (uses hooks + state lifting)

## Module Design

**C++:**
- Manager pattern: `MqttManager`, `StorageManager`, `DisplayManager`, `OtaManager`
- Each manager has `.h` declaration + `.cpp` implementation
- Singleton pattern for `MqttManager` (static `_instance` for static callback)
- Header guards: `#ifndef MQTT_MANAGER_H / #define ... / #endif`

**TypeScript:**
- Barrel files not used — direct imports from file paths
- Services are class-based with static methods or instance methods
- Hooks are composable: `useMqttData` used inside `useTelemetryData`
- Context providers for cross-cutting concerns: `AuthProvider`, `TenantProvider`, `NotificationProvider`

## SQL Conventions

**Schema files:**
- Section dividers: `-- ============================================`
- Table names: `snake_case` — `devices_status`, `telemetry`, `events`
- Column names: `snake_case` — `tenant_id`, `last_seen`, `temp_max`
- Primary keys: `TEXT` (MAC address) or `UUID DEFAULT gen_random_uuid()`
- Timestamps: `TIMESTAMPTZ DEFAULT NOW()`
- Indexes named: `idx_<table>_<columns>` — `idx_telemetry_device_time`
- RLS policies enabled but permissive: `CREATE POLICY "Allow all for ..." ON ... FOR ALL USING (true)`

**Migration files:**
- Ad-hoc `ALTER TABLE ADD COLUMN` scripts at repo root
- Named by purpose: `add_alarm_columns.sql`, `fix_telemetry_types.sql`
- No migration framework (no Prisma, no flyway) — manual execution

---

*Convention analysis: 2026-05-20*
