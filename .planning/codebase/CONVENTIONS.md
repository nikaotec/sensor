# Coding Conventions

**Analysis Date:** 2026-05-07

## Project Overview

This codebase is a mixed-technology IoT sensor monitoring system consisting of:
- **Dashboard**: React/TypeScript frontend with Vite
- **ESP32**: Arduino C++ firmware
- **n8n Workflows**: JSON workflow definitions
- **Python Scripts**: Utility scripts for database and workflow patches

---

## Language-Specific Conventions

### TypeScript / React (`dashboard/`)

**Files:**
- Naming: `camelCase.ts` for source files
- Examples: `useTelemetryData.ts`, `useMqttData.ts`, `useSupabaseData.ts`

**Functions:**
- Naming: `camelCase`
- React hooks: Prefixed with `use` (e.g., `useTelemetryData`, `useMqttData`, `useSupabaseData`)
- Custom hooks return objects with camelCase properties

**Types/Interfaces:**
- Naming: `PascalCase`
- Examples: `TelemetryData`, `DeviceEvent`, `Device`, `MqttMessageHandler`
- Interfaces defined with `export interface`

**Variables:**
- Naming: `camelCase`
- Examples: `currentTenant`, `tenantDevices`, `mqttConnected`

**Constants:**
- Naming: `UPPER_SNAKE_CASE` for environment-driven constants
- Examples: `MQTT_BROKER_URL`, `VITE_SUPABASE_URL`

```typescript
// TypeScript conventions
export interface TelemetryData {
    devices: any[];
    displayDevices: any[];
    mqttConnected: boolean;
}

export const useTelemetryData = (
    currentTenant: any,
    availableTenants: any[],
    currentUser: any
) => {
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'gestor';
    // ...
};
```

### Python Scripts (`.py` files)

**Files:**
- Naming: `snake_case.py`
- Examples: `patch_n8n_telemetry.py`, `edit_device_list.py`, `edit_dashboard.py`

**Functions:**
- Naming: `snake_case`
- No type hints in most scripts (Python 3.x without annotations)

**Variables:**
- Naming: `snake_case`

```python
# Python conventions
file_path = "/path/to/file.json"

with open(file_path, "r") as f:
    data = json.load(f)
```

### ESP32 C++ (`esp32/`)

**Files:**
- Header files: `.h` suffix (e.g., `Config.h`, `AlertManager.h`)
- Implementation: `.cpp` suffix
- Main sketch: `.ino`

**Preprocessor Defines:**
- Naming: `UPPER_SNAKE_CASE`
- Examples: `#define WIFI_SSID`, `#define MQTT_PORT`, `#define DS18B20_PIN`

**Structs:**
- Naming: `PascalCase`
- Example: `struct RelayConfig`, `struct SystemSettings`

**Enums:**
- Naming: `PascalCase` with UPPER_SNAKE_CASE values
- Example: `enum RelayFunc { RELAY_FUNC_OFF = 0, RELAY_FUNC_AUTO = 1, ... }`

**Constants (non-preprocessor):**
- Naming: `camelCase` (e.g., `const int RELAY_COUNT`)

```cpp
// C++ conventions
#define DEFAULT_DEVICE_NAME "ESP32 Sensor"
#define DEFAULT_COMPANY_NAME "Nikaotec"

enum RelayFunc {
  RELAY_FUNC_OFF = 0,
  RELAY_FUNC_AUTO = 1,
  RELAY_FUNC_MANUAL = 2
};

struct RelayConfig {
  char name[17];
  uint8_t func;
  float tempOn;
};
```

---

## Code Style

### TypeScript/React

**Formatting:**
- Tool: ESLint + TypeScript ESLint
- Config: `dashboard/eslint.config.js`
- Indentation: Spaces (default from ESLint/Vite)

**Linting:**
- Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Framework: Flat config format (`eslint.config.js`)
- Ignored: `dist/` directory

**Comments:**
- Language: Mix of English (code) and Portuguese (business logic)
- Example: `"Banco de dados tem prioridade — preservar nome do Supabase sobre o MQTT"`

### Python

**Style:**
- No enforced formatting tool detected
- Basic PEP8-like indentation

### C++ (ESP32)

**Style:**
- Arduino framework conventions
- Comments in Portuguese for hardware-specific logic

---

## Import Organization

### TypeScript

```typescript
// React imports
import { useState, useEffect, useRef, useCallback } from 'react';

// External libraries
import mqtt from 'mqtt';

// Internal modules - relative paths
import type { Device } from '../data/mockData';
import { supabase } from '../supabase/config';
import { useTenant } from '../contexts/TenantContext';
```

**Order:**
1. React core hooks
2. External libraries
3. Internal relative imports (type imports first when using `type` keyword)

---

## Error Handling

### TypeScript

**Pattern:** Console-based with no custom exception classes

```typescript
// Error logging
console.error('MQTT Connection Error:', err);
console.error('Failed to parse MQTT message:', e);
console.error("Supabase Error (devices):", error);

// Warning logging
console.warn('⚠️ Supabase URL ou Anon Key não configurados no .env');

// Info logging
console.log('Connected to MQTT Broker via WebSockets');
```

**No throw/try-catch patterns in hooks** - Errors are logged but don't throw

### Python

```python
try:
    data = json.load(f)
except Exception as e:
    print(f"Error: {e}")
```

### C++ (ESP32)

```cpp
// Serial output for debugging
Serial.println("Error message");
```

---

## Logging Patterns

### Dashboard (TypeScript)

**Framework:** `console` API

**Levels used:**
- `console.log` - General flow (connections, subscriptions)
- `console.error` - Failures (connection errors, parse errors)
- `console.warn` - Configuration warnings

**Pattern:** Prefix with emoji for category
```typescript
console.log('✅ [VPS] Telemetria recebida e salva!');
console.error('❌ [Admin] Erro ao deletar no Firebase:', error.message);
console.log('📡 MQTT WebSocket proxy: /mqtt -> ${MOSQUITTO_WS_TARGET}');
```

---

## Function Design

### React Hooks - Size Guidelines

**Hooks are long (>100 lines)** - `useMqttData.ts` is 432 lines, `useSupabaseData.ts` is 392 lines

**Characteristics:**
- Multiple `useEffect` blocks for different concerns
- Large state management in single file
- Mixed responsibilities (connection, data processing, device management)

**Pattern observed:**
```typescript
export const useMqttData = (
    tenantId: string | null,
    currentUserRole: string | undefined,
    initialDevices: Device[] = [],
    onAlert?: (payload: any) => void,
    onDeviceNameChange?: (deviceId: string, newName: string) => void
) => {
    const [devices, setDevices] = useState<any[]>(...);
    const [isConnected, setIsConnected] = useState(false);
    const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);

    // Multiple useEffect blocks...

    // Public methods
    const publish = (topic: string, message: string) => { ... };
    const updateDeviceLocal = useCallback((deviceId: string, updates: Partial<Device>) => { ... });

    return { devices, isConnected, publish, updateDeviceLocal };
};
```

---

## Module Design

### Exports

**Pattern:** Named exports only

```typescript
// Hooks - default export
export const useTelemetryData = () => { ... };

// Types - named export
export interface TelemetryData { ... };
export type MqttMessageHandler = ...;
```

### Barrel Files

**Not used** - Direct imports from modules

---

## Anti-Patterns

### 1. Mixed Language Comments

**What happens:** Code uses English variable/function names but Portuguese comments
**Why it's wrong:** Inconsistent documentation, harder for international contributors
**Do this instead:** Use English for all comments, or establish clear bilingual standard

```typescript
// Current (mixed)
const getLockedData = (deviceId: string): LockedData | null => {
    try {
        const lockStr = localStorage.getItem(`device_lock_${deviceId}`);
        // Banco de dados tem prioridade — preservar nome do Supabase sobre o MQTT
        // ...
    } catch (e) { }
};
```

### 2. Excessive use of `any` Type

**What happens:** TypeScript interfaces use `any` extensively
**Why it's wrong:** No type safety, defeats TypeScript purpose
**Do this instead:** Define proper interfaces

```typescript
// Current (not recommended)
const [devices, setDevices] = useState<any[]>(initialDevices...);
const currentTenant: any

// Better approach
interface Device {
    id: string;
    name: string;
    tenantId: string;
    // ...
}
```

### 3. Long Files with Mixed Responsibilities

**What happens:** Hook files like `useMqttData.ts` (432 lines) handle connection, data processing, device updates, and MQTT logic
**Why it's wrong:** Hard to maintain, test, and understand
**Do this instead:** Split into smaller, focused modules (e.g., MQTT connection, device state, payload normalization)

### 4. Hardcoded Configuration in Code

**What happens:** Credentials and URLs hardcoded
**Why it's wrong:** Security risk, environment-specific values in source
**Do this instead:** Use environment variables

```typescript
// Current (hardcoded in ESP32/Config.h)
#define WIFI_SSID "VENANCIO"
#define WIFI_PASS "liza1980"
#define MQTT_SERVER "mqtt.nikaotech.com"
```

---

## Where to Add New Code

### Dashboard (TypeScript/React)

**New hooks:**
- Location: `dashboard/src/hooks/`
- Pattern: `use<FeatureName>.ts`

**New services:**
- Location: `dashboard/src/services/`

**New components:**
- Location: `dashboard/src/components/` (if exists)

**Configuration:**
- Environment: `dashboard/.env` (not in git)
- Config files: `dashboard/vite.config.ts`, `dashboard/eslint.config.js`

### Python Scripts

**New scripts:**
- Location: Project root or `scripts/` directory

### ESP32

**New modules:**
- Location: `esp32/` directory
- Pattern: `ModuleName.h` + `ModuleName.cpp`

---

*Convention analysis: 2026-05-07*