# Testing Patterns

**Analysis Date:** 2026-05-07

## Test Framework Status

**Critical Finding:** This codebase has **no test framework or test files** implemented.

The project lacks:
- Unit tests
- Integration tests
- E2E tests
- Test configuration files
- Test scripts in `package.json`

---

## Dashboard (TypeScript/React)

### Current State

**Framework:** Not configured

**Package.json test scripts:** None
```json
// Current package.json scripts (no test commands)
{
  "scripts": {
    "start": "node server.js",
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "deploy": "npm run build && tar -czvf ...",
    "preview": "vite preview"
  }
}
```

**Linting only:** Only `npm run lint` is configured (ESLint)

### Recommended Testing Setup

**Runner:** Vitest (matches Vite ecosystem)
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

**Configuration:** Add to `vite.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

**Run commands:**
```bash
npm run test              # Run all tests
npm run test -- --watch  # Watch mode
npm run test -- --coverage # Coverage report
```

### Test File Organization

**Location:** Co-located with source files
```
dashboard/src/
├── hooks/
│   ├── useTelemetryData.ts
│   └── useTelemetryData.test.ts  # Co-located test
├── components/
│   └── DeviceCard.tsx
│   └── DeviceCard.test.tsx
└── test/
    └── setup.ts           # Test configuration
```

**Naming:** `{filename}.test.ts` or `{filename}.spec.ts`

### Test Structure Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTelemetryData } from './useTelemetryData';

describe('useTelemetryData', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  it('should return devices from Supabase', () => {
    const { result } = renderHook(() => useTelemetryData(
      { id: 'tenant-1' },
      [],
      { role: 'manager' }
    ));

    expect(result.current.supabaseDevices).toEqual([]);
  });

  it('should filter unlinked devices', () => {
    // Test filtering logic
  });
});
```

---

## Mocking Patterns (Recommended)

### What to Mock

**External services:**
- Supabase client
- MQTT client
- Firebase Auth

**Approach:** Create mock modules in `__mocks__/` directories

```typescript
// dashboard/src/__mocks__/supabase.ts
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
  removeChannel: vi.fn(),
};

export const supabase = mockSupabase;
```

### Test Fixtures

**Location:** `dashboard/src/test/fixtures/`

```typescript
// dashboard/src/test/fixtures/devices.ts
export const mockDevices = [
  {
    id: 'device-001',
    name: 'Sensor A1',
    tenantId: 'tenant-1',
    type: 'sensor_temp',
    status: 'online',
    telemetry: {
      temp: 25.5,
      humidity: 60,
      batteryVoltage: 12.1,
    },
  },
];

export const mockTenant = {
  id: 'tenant-1',
  name: 'Nikaotec',
};
```

---

## Python Scripts

### Current State

**No test framework detected**

Test files for Python utilities: None found

### Recommended Pattern (if tests are added)

**Framework:** pytest

**Structure:**
```
scripts/
├── test_patch_n8n_telemetry.py
├── patch_n8n_telemetry.py
└── fixtures/
    └── sample_workflow.json
```

**Pattern:**
```python
import pytest
import json
from patch_n8n_telemetry import modify_workflow

def test_add_filter_node():
    with open('fixtures/sample_workflow.json') as f:
        data = json.load(f)

    result = modify_workflow(data)

    assert 'Filter Telemetry' in [n['name'] for n in result['nodes']]
```

---

## ESP32 / Arduino

### Current State

**No test framework for embedded code**

Unit testing for microcontroller code requires platform-specific tooling (e.g., Arduino Unit Testing framework)

### Recommended Approach

**For ESP32 testing:**
- Use Arduino Unit Testing library
- Test logic separately (pure C++ functions)
- Integration tests via actual hardware

---

## n8n Workflows

### Current State

**No automated testing**

Workflows are JSON files that can be validated structurally

### Recommended Pattern

**Schema validation:** Use n8n CLI or JSON Schema
```bash
# Validate workflow JSON structure
n8n import:workflow --input workflow.json
```

**Manual testing:** Deploy to test environment and run test triggers

---

## Test Coverage Gaps

### Critical Gaps

| Area | Risk | Priority |
|------|------|----------|
| React hooks (useMqttData, useSupabaseData) | High - core data flow untested | High |
| Device filtering logic | High - permission filtering critical | High |
| MQTT message parsing | Medium - complex normalization | Medium |
| Supabase queries | High - database access untested | High |
| Server.js API endpoints | Medium - backend logic untested | Medium |
| Python scripts | Low - simple transformations | Low |
| ESP32 firmware | Low - requires hardware | Low |

---

## Recommended Next Steps

### 1. Add Testing Framework

```bash
# Dashboard - Install Vitest
cd dashboard
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### 2. Create First Test

Test the simplest hook: `useTelemetryData.ts`
- Test role-based filtering
- Test device assignment logic

### 3. Add CI/CD Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test -- --coverage
```

---

## Existing Test-Like Files

The codebase contains some test-adjacent files that aren't formal tests:

| File | Purpose |
|------|---------|
| `dashboard/test_firebase.js` | Manual Firebase connection test |
| `dashboard/test_supabase.js` | Manual Supabase query test |
| `dashboard/test_supabase2.js` | Additional Supabase tests |
| `dashboard/test_dates.js` | Date manipulation tests |
| `dashboard/test_mqtt_ws.js` | MQTT WebSocket manual tests |
| `dashboard/query_*.js` | Query debugging scripts |
| `test_user_flow.js` | User flow testing |
| `test_number.js` | Utility testing |

**Pattern:** These are standalone scripts, not proper test suite

---

*Testing analysis: 2026-05-07*