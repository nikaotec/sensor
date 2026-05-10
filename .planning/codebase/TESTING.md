# Testing Patterns

**Analysis Date:** 2026-05-10

## Test Framework

**Runner:** Vitest 4.1.5

**Configuration** (`dashboard/vite.config.ts`):
```typescript
test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
}
```

**Supporting Libraries:**
- `@testing-library/jest-dom` 6.9.1 — DOM assertions
- `@testing-library/react` 16.3.2 — React component testing
- `@testing-library/user-event` 14.6.1 — User interaction simulation
- `jsdom` 29.1.1 — DOM environment

**Run Commands:**
```bash
npm test              # Run all tests (vitest run)
npm run dev           # Vite dev server with watch mode
npm run build         # TypeScript check + Vite build (no test in build)
```

## Test File Organization

**Location:** Co-located with source files

**Patterns:**
1. `__tests__/` subdirectory within service directories:
   - `dashboard/src/services/__tests__/TelemetryService.test.ts`
   - `dashboard/src/services/__tests__/TelemetryService.test.ts`

2. `src/tests/` directory for shared test utilities:
   - `dashboard/src/tests/setup.ts`
   - `dashboard/src/tests/SupabaseMapper.test.ts`

**Naming:** `*.test.ts` extension (not `*.spec.ts`)

## Test Structure

**Standard suite:**
```typescript
import { describe, it, expect } from 'vitest';
import { TelemetryService } from '../TelemetryService';

describe('TelemetryService', () => {
    it('should normalize telemetry from legacy firmware (uppercase keys)', () => {
        const payload = { ... };
        const result = TelemetryService.normalizePayload(payload);
        expect(result.id).toBe('ESP32_MAC');
    });
});
```

**Assertions used:**
- `expect(value).toBe(expected)` — equality
- `expect(value).not.toHaveProperty(key)` — property absence
- `expect(result).toBeUndefined()` — undefined check
- `expect(result).toBe(true)` — boolean check

**Setup file** (`dashboard/src/tests/setup.ts`):
```typescript
import '@testing-library/jest-dom';
```

## Mocking

**Framework:** No explicit mocking library configured

**Approach:** Direct instantiation in tests (no mocks visible in codebase tests)

**Mock data:** `dashboard/src/data/mockData.ts` provides typed fixtures:
```typescript
const row: SupabaseDeviceRow = {
    id: 'dev_123',
    name: 'Sensor Geladeira',
    tenant_id: 'tenant_abc',
    status: 'online',
    // ...
};
```

**Mock patterns observed:**
- Direct object creation for test inputs
- No mocking of `supabase` client (tests target mappers/services)
- No React component snapshot testing

## Fixtures and Factories

**Test data location:** `dashboard/src/data/mockData.ts` (shared with development)

**Types for fixtures:**
```typescript
export interface SupabaseDeviceRow {
    id: string;
    name?: string;
    tenant_id: string;
    status?: 'online' | 'offline' | 'warning' | 'error';
    [key: string]: any;
}
```

**Fixture usage in tests:**
```typescript
const row: SupabaseDeviceRow = { ... };
const result = mapRowToDevice(row);
expect(result.telemetry.temp).toBe(5.5);
```

## Coverage

**Requirements:** No coverage enforcement

**Threshold:** Not configured

**View coverage:** Not set up (`vitest run` without `--coverage` flag)

## Test Types

**Unit Tests:**
- Service/mapper tests targeting pure functions
- Input/output validation for data transformations
- Focus on `TelemetryService.normalizePayload()` and `mapRowToDevice()`

**Integration Tests:**
- No explicit integration tests detected
- Supabase queries tested via hooks but not mocked

**E2E Tests:**
- Not configured

## Common Patterns

### Async Testing

Not heavily used — current tests are synchronous mappers.

### Error Testing

```typescript
it('should NOT include keys with undefined values for partial payloads', () => {
    const partialPayload = { id: 'ESP32_PARTIAL', temp: 25.5 };
    const result = TelemetryService.normalizePayload(partialPayload);
    expect(result).not.toHaveProperty('batteryVoltage');
});
```

### Boundary Conditions

Tests cover:
- Legacy firmware payloads (uppercase keys)
- Modern firmware payloads (lowercase keys)
- Partial payloads (only some fields)
- Null/undefined handling
- Relay object format (`RELES.R0`)
- Supabase database row format (snake_case)

## Test Naming

**Pattern:** Descriptive Portuguese and English mixed

**Examples:**
```typescript
it('should normalize telemetry from legacy firmware (uppercase keys)')
it('deve mapear uma linha completa do Supabase para um objeto Device corretamente')
it('should NOT include keys with undefined values for partial payloads')
```

## Known Test Gaps

**Not tested:**
- React hook behavior (`useSupabaseData`, `useMqttData`)
- Supabase client interactions
- MQTT subscription handling
- React component rendering
- User interactions
- Error boundary behavior

**Recommendations:**
1. Add React Testing Library tests for components
2. Mock Supabase client for hook testing
3. Add integration tests for data flow
4. Consider snapshot testing for report output

---

*Testing analysis: 2026-05-10*
