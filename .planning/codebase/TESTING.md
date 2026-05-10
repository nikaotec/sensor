# TESTING - Test Structure & Practices

**Last Mapped:** 2026-05-09  
**Project:** IoT Sensor Monitoring System

## Test Framework

| Framework | Version | Purpose |
|-----------|---------|---------|
| Vitest | 4.1.5 | Unit testing |
| Testing Library | 16.3.2 | React component testing |
| JSDOM | 29.1.1 | DOM simulation |

## Test Structure

```
dashboard/src/
├── __tests__/                  # Service tests
│   └── TelemetryService.test.ts
├── tests/                      # Component tests
│   ├── SupabaseMapper.test.ts
│   └── setup.ts
```

## Running Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Single run (CI)
npm test -- run
```

## Test Patterns

### Service Tests (Vitest)
```typescript
// dashboard/src/__tests__/TelemetryService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { TelemetryService } from '../services/TelemetryService'

describe('TelemetryService', () => {
  it('should fetch telemetry data', async () => {
    const data = await TelemetryService.getLatest('device-123')
    expect(data).toBeDefined()
  })
})
```

### Component Tests
```typescript
// dashboard/src/tests/SupabaseMapper.test.ts
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SupabaseMapper } from '../services/SupabaseMapper'

describe('SupabaseMapper', () => {
  it('should map telemetry data correctly', () => {
    const input = { device_id: '123', temperature: 25.5 }
    const result = SupabaseMapper.mapTelemetry(input)
    expect(result.temperature).toBe(25.5)
  })
})
```

### Test Setup
```typescript
// dashboard/src/tests/setup.ts
import '@testing-library/jest-dom'
import { beforeAll, afterAll } from 'vitest'
```

## Manual Testing Scripts

The project includes several JavaScript test scripts:

| Script | Purpose |
|--------|---------|
| `test_mqtt_ws.js` | Test MQTT WebSocket connection |
| `test_supabase.js` | Test Supabase connection |
| `test_firebase.js` | Test Firebase connection |
| `test_dates.js` | Date formatting tests |
| `test_number.js` | Number formatting tests |
| `test_user_flow.js` | End-to-end user flow |
| `query_*.js` | Database query tests |

## Run Manual Tests

```bash
# From dashboard directory
cd dashboard

# Test Supabase
node test_supabase.js

# Test MQTT
node test_mqtt_ws.js

# Test Firebase
node test_firebase.js

# Query specific data
node query_telemetry_hours.js
```

## CI/CD Test Commands

```bash
# Build for production
npm run build

# Lint check
npm run lint

# Type check (via tsc)
tsc -b
```

## Coverage

No explicit coverage requirements found. Tests are primarily for:
- Service logic validation
- Data transformation accuracy
- Component rendering

## Current Test Status

- **Services**: 2 test files (`TelemetryService.test.ts`, `SupabaseMapper.test.ts`)
- **Components**: Minimal component testing
- **Integration**: Manual scripts only

## Recommendations

1. Add component tests for critical UI (Dashboard, DeviceCard)
2. Add integration tests for Supabase/MQTT flows
3. Set up coverage reporting
4. Add E2E tests with Playwright for critical flows