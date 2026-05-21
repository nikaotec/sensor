# Testing Patterns

**Analysis Date:** 2026-05-20

## Test Framework

**Runner:**
- Vitest 4.1.5
- Config: `dashboard/vite.config.ts` (inline `test` block)
- Environment: `jsdom`
- Setup file: `dashboard/src/tests/setup.ts` (imports `@testing-library/jest-dom`)

**Assertion Library:**
- Vitest built-in `expect` (Jest-compatible)

**Testing Library:**
- `@testing-library/react` 16.3.2 for component testing
- `@testing-library/user-event` 14.6.1 for user interaction simulation
- `@testing-library/jest-dom` 6.9.1 for DOM assertions (`toBeInTheDocument()`, etc.)

**Run Commands:**
```bash
npm run test              # Run all tests (vitest run)
npx vitest                # Watch mode
npx vitest --coverage     # Coverage (not configured)
```

## Test File Organization

**Location:**
- Two patterns coexist:
  1. Co-located `__tests__/` directories: `dashboard/src/services/__tests__/TelemetryService.test.ts`
  2. Centralized `tests/` directory: `dashboard/src/tests/OtaService.test.ts`

**Naming:**
- `*.test.ts` for service/unit tests
- `*.test.tsx` for component tests
- Test files mirror source file names: `TelemetryService.ts` → `TelemetryService.test.ts`

**Structure:**
```
dashboard/src/
├── services/
│   ├── TelemetryService.ts
│   └── __tests__/
│       ├── TelemetryService.test.ts
│       └── VersionService.test.ts
├── tests/
│   ├── setup.ts
│   ├── OtaService.test.ts
│   ├── SupabaseMapper.test.ts
│   ├── useMqttData.test.ts
│   └── CalibrationControl.test.tsx
└── utils/
    └── reportValidation.test.ts
```

**Total test files:** 8 (6 in dashboard, 2 standalone JS scripts at repo root)

## Test Structure

**Service Tests (describe/it pattern):**
```typescript
import { describe, it, expect } from 'vitest';
import { TelemetryService } from '../TelemetryService';

describe('TelemetryService', () => {
    it('should normalize telemetry from legacy firmware (uppercase keys)', () => {
        const payload = { ID_DISPOSITIVO: 'ESP32_MAC', ... };
        const result = TelemetryService.normalizePayload(payload);
        expect(result.id).toBe('ESP32_MAC');
        expect(result.temp).toBe(25.5);
    });
});
```

**Component Tests (test function pattern):**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import CalibrationControl from '../components/device/CalibrationControl';

test('renders sensor selection buttons and allows selecting PT100', () => {
    const handleSensorChange = vi.fn();
    const props = { ... };
    render(<CalibrationControl {...props} />);
    const ptButton = screen.getByText(/PT100/i);
    fireEvent.click(ptButton);
    expect(handleSensorChange).toHaveBeenCalledWith('PT100');
});
```

**Patterns:**
- No explicit teardown — Vitest handles cleanup
- No `beforeAll`/`afterAll` in current tests
- `beforeEach` used for service instantiation: `service = new OtaService()`
- `vi.clearAllMocks()` in `beforeEach` blocks

## Mocking

**Framework:** Vitest `vi` module

**Patterns:**

**Mock functions (vi.fn()):**
```typescript
const handleSensorChange = vi.fn();
const handleCalibration = vi.fn();
```

**Mock object factories:**
```typescript
const makeMockClient = (connected = true) => ({
    connected,
    publish: vi.fn(),
});
```

**Type assertion for mocks:**
```typescript
const client = makeMockClient() as any;
```

**Mock inspection:**
```typescript
expect(client.publish).toHaveBeenCalledTimes(2);
expect(client.publish).toHaveBeenCalledWith(
    'devices/device-1/commands',
    expect.stringContaining('"otaupdate"'),
    expect.any(Object)
);
```

**What to Mock:**
- MQTT client (`publish` method)
- Event handlers passed as props
- External service calls (Supabase not yet mocked in tests)

**What NOT to Mock:**
- `TelemetryService.normalizePayload()` — tested directly with real logic
- Component rendering — uses real React render

## Fixtures and Factories

**Test Data:**
- Inline test data in each test — no shared fixture files
- Payload objects constructed per-test with relevant fields only
- `SupabaseDeviceRow` type used for type-safe test data:
  ```typescript
  const row: SupabaseDeviceRow = {
      id: 'dev_123',
      name: 'Sensor Geladeira',
      tenant_id: 'tenant_abc',
      ...
  };
  ```

**Location:**
- No centralized fixtures directory
- `dashboard/src/data/mockData.ts` exists but contains type definitions, not test fixtures

## Coverage

**Requirements:** None enforced
- No coverage threshold configured in `vite.config.ts`
- No `@vitest/coverage-*` package installed

**View Coverage:**
```bash
npx vitest run --coverage  # Would fail — coverage not installed
```

## Test Types

**Unit Tests:**
- Service logic: `TelemetryService`, `OtaService`, `VersionService`, `SupabaseMapper`
- Utility functions: `reportValidation`
- Scope: Pure functions with input/output assertions
- 6 test files, ~20+ individual test cases

**Component Tests:**
- `CalibrationControl.test.tsx` — renders component, fires events, verifies callbacks
- Only 1 component test file currently

**Integration Tests:**
- Not used — no Supabase mocking, no MQTT broker integration tests
- `useMqttData.test.ts` exists but content not analyzed

**E2E Tests:**
- Not used — no Playwright, no Cypress
- Standalone JS scripts (`test_user_flow.js`, `test_number.js`) are manual smoke tests, not E2E

## Common Patterns

**Async Testing:**
- Not heavily used — most services are synchronous
- Supabase calls in components use `async/await` but are not tested async

**Error Testing:**
```typescript
it('throws when client is not connected', () => {
    const client = makeMockClient(false) as any;
    expect(() =>
        service.publishOtaCommand(client, ['d1'], 'https://cdn.com/fw.bin')
    ).toThrow('[OtaService] MQTT client not connected');
});

it('throws for invalid URL', () => {
    const client = makeMockClient() as any;
    expect(() =>
        service.publishOtaCommand(client, ['d1'], 'ftp://bad.url')
    ).toThrow('[OtaService] Invalid firmware URL');
});
```

**Parameterized Testing:**
- Manual iteration pattern in standalone scripts:
  ```javascript
  testCases.forEach(tc => {
      const result = formatPhone(tc.input);
      const status = result === tc.expected ? 'PASS' : 'FAIL';
      if (status === 'FAIL') process.exit(1);
  });
  ```
- Vitest `it.each` not used

**Edge Case Testing:**
- Partial payloads: `it('should NOT include keys with undefined values for partial payloads')`
- Null/undefined handling: `it('deve usar valores padrão quando campos opcionais estão ausentes')`
- Fallback chains: `it('deve priorizar daily_stats se temp_max/min forem nulos')`

## Standalone Test Scripts

**`test_user_flow.js`** (repo root):
- Tests phone number formatting function
- Manual assertion with `process.exit(1)` on failure
- Run with: `node test_user_flow.js`

**`test_number.js`** (repo root):
- Similar pattern — manual test execution
- No framework dependency

**`dashboard/test_*.js`** files:
- `test_supabase.js`, `test_supabase2.js`, `test_mqtt_ws.js`, `test_dates.js`, `test_firebase.js`
- Ad-hoc connectivity/debug scripts, not structured tests
- Run manually for debugging, not part of CI

## C++ (ESP32) Testing

**No automated tests** for ESP32 firmware.
- Testing done via Serial output verification
- No Unity, PlatformIO test framework, or hardware-in-the-loop tests
- `main.cpp` (1357 lines) has no test coverage

## Test Gaps

| Area | Coverage | Notes |
|------|----------|-------|
| Services | Good | `TelemetryService`, `OtaService`, `VersionService`, `SupabaseMapper` tested |
| Hooks | Partial | `useMqttData.test.ts` exists but not verified |
| Components | Minimal | Only `CalibrationControl` has tests |
| Utils | Partial | `reportValidation.test.ts` exists |
| ESP32 firmware | None | No C++ tests |
| n8n workflows | None | JSON workflows not tested |
| SQL migrations | None | No migration tests |
| Python scripts | None | No Python tests |
| Integration | None | No Supabase/MQTT integration tests |
| E2E | None | No browser automation |

---

*Testing analysis: 2026-05-20*
