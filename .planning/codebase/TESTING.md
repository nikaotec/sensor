# Testing

**Mapped:** 2026-05-08

## Testing Stack

### Dashboard (React)
| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | 4.1.5 | Test runner |
| **React Testing Library** | 16.3.2 | Component testing |
| **Jest DOM** | 6.9.1 | DOM assertions |
| **User Event** | 14.6.1 | User interaction simulation |
| **jsdom** | 29.1.1 | DOM environment |

### ESP32
- **No automated tests** (hardware-dependent)
- Manual testing via Serial Monitor
- OTA updates for field testing

## Test Structure

```
dashboard/src/
├── tests/
│   ├── setup.ts           # Test configuration
│   └── SupabaseMapper.test.ts
├── services/
│   └── __tests__/
│       └── TelemetryService.test.ts
└── components/           # Manual testing
```

## Test Patterns

### Hook Testing
```typescript
// tests/SupabaseMapper.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useSupabaseData } from '../hooks/useSupabaseData';

describe('useSupabaseData', () => {
  it('fetches telemetry data', async () => {
    const { result } = renderHook(() => useSupabaseData('device1'));
    
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});
```

### Service Testing
```typescript
// services/__tests__/TelemetryService.test.ts
import { describe, it, expect } from 'vitest';
import { TelemetryService } from '../TelemetryService';

describe('TelemetryService', () => {
  it('aggregates hourly averages', () => {
    const data = [
      { timestamp: '2024-01-01T00:00:00Z', temperature: 25 },
      { timestamp: '2024-01-01T01:00:00Z', temperature: 26 },
    ];
    const result = TelemetryService.aggregateHourly(data);
    expect(result[0].avg).toBe(25.5);
  });
});
```

## Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific file
npm test -- TelemetryService.test.ts

# Watch mode
npm test -- --watch
```

## Manual Testing

### ESP32 Testing
1. Serial Monitor at 115200 baud
2. Test commands via MQTT (MQTT.fx)
3. Physical sensor manipulation
4. Alert trigger verification

### Dashboard Testing
1. `npm run dev` for local development
2. Supabase emulator for local DB
3. Mock MQTT messages for real-time tests

## Coverage

- **Dashboard:** Services and hooks tested
- **Components:** Manual verification
- **ESP32:** No automated coverage

## Test Data

| Type | Location |
|------|----------|
| Mock devices | `dashboard/src/data/mockData.ts` |
| Mock telemetry | `dashboard/src/data/telemetry.json` |
| SQL fixtures | Not present |