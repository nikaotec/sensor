# Coding Conventions

**Analysis Date:** 2026-05-10

## Language

**Primary:** TypeScript 5.9.3 with React 19.2

**Target:** Browser (ES2020), React SPA with Vite build

## Formatting

**Tool:** Prettier

**Configuration** (`dashboard/.prettierrc.js`, `evolution-api-main/.prettierrc.js`):
```javascript
{
  semi: true,
  trailingComma: 'all',
  singleQuote: true,
  printWidth: 120,
  arrowParens: 'always',
  tabWidth: 2,
  useTabs: false,
  bracketSameLine: false,
  bracketSpacing: true
}
```

**Key rules:**
- Semicolons required
- Single quotes for strings
- 120 character line width
- Trailing commas on all arguments
- Always wrap arrow function arguments in parentheses

## Linting

**Tool:** ESLint 9 flat config

**Configuration** (`dashboard/eslint.config.js`):
```javascript
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
  },
])
```

**Plugins:** `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`

## Naming Conventions

### Files

- **Components:** PascalCase (`DeviceList.tsx`, `ErrorBoundary.tsx`)
- **Hooks:** camelCase with `use` prefix (`useSupabaseData.ts`, `useMqttData.ts`)
- **Services:** PascalCase with descriptive names (`TelemetryService.ts`, `SupabaseMapper.ts`)
- **Utilities:** camelCase (`statusUtils.ts`, `format.js`)
- **Tests:** `*.test.ts` co-located or in `__tests__/` subdirectory
- **Config:** camelCase or kebab-case (`tsconfig.json`, `vite.config.ts`)

### Components & Classes

- React functional components: PascalCase + `React.FC` type wrapper (`const DeviceList: React.FC<Props> = ...`)
- Class components: PascalCase with `default` export (`class ErrorBoundary extends Component`)
- Service classes: PascalCase with static methods (`TelemetryService.normalizePayload()`)

### Variables & Functions

- **Variables:** camelCase (`searchTerm`, `supabaseDevices`)
- **Functions:** camelCase (`fetchDevices`, `mapRowToDevice`)
- **Private helpers:** camelCase with optional underscore prefix (`_e`, `_parseNumber`)
- **Booleans:** prefix with `is`, `has`, `should`, `can` (`isManager`, `isLoading`, `hasError`)

### Types & Interfaces

- **Interfaces:** PascalCase with descriptive names (`SupabaseDeviceRow`, `DeviceEvent`)
- **Type aliases:** PascalCase (`DeviceTelemetry`)
- **Enum-like unions:** kebab-case string literals in type (`'online' | 'offline' | 'warning' | 'error'`)
- **Props interfaces:** PascalCase named `Props` or `ComponentNameProps`

```typescript
interface SupabaseDeviceRow {
    id: string;
    name?: string;
    tenant_id: string;
    status?: 'online' | 'offline' | 'warning' | 'error';
}

export interface DeviceEvent {
    id: string;
    deviceId: string;
    type: string;
}
```

## Import Organization

**Order:**
1. React/core imports (`import React, { useState } from 'react'`)
2. Third-party libraries (`import { Search, AlertTriangle } from 'lucide-react'`)
3. Internal services/hooks (`import { useSupabaseData } from '../hooks/useSupabaseData'`)
4. Contexts (`import { useTenant } from '../contexts/TenantContext'`)
5. Type imports (`import type { Device } from '../data/mockData'`)
6. Relative path imports

**Path aliases:** Not configured — relative paths used throughout (`../`, `../../`)

## Error Handling

**Frontend React:**
- ErrorBoundary class component for component tree errors (`dashboard/src/components/ErrorBoundary.tsx`)
- Try-catch blocks for async operations in hooks
- Console logging with descriptive messages: `console.error("Supabase Error (devices):", error)`
- Conditional rendering for null states: `if (!currentTenant) return <Loading />`

**Pattern:**
```typescript
try {
    const { data, error } = await supabase.from('devices_status').select('*');
    if (error) {
        console.error("Supabase Error (devices):", error);
        return;
    }
} catch (e) {
    console.error("Error in fetch:", e);
}
```

## Logging

**Framework:** `console` (no external logging library)

**Patterns:**
- `console.error()` for errors
- `console.log()` for development diagnostics
- Descriptive prefixes: `console.log('✅ Telemetria recebida...')`

## Comments

**JSDoc:**
- Used on public methods (`TelemetryService.ts`):
```typescript
/**
 * Normaliza o payload recebido via MQTT para o formato padrão do sistema.
 * Suporta múltiplas versões de firmware (campos em maiúsculas e minúsculas).
 */
static normalizePayload(payload: any): Partial<DeviceTelemetry> & { id?: string } {
```

**Inline comments:** Portuguese, descriptive, explain "why" not "what":
```typescript
// Garantir que chaves não enviadas não existem no objeto (nem como undefined)
// Garantir que chaves não enviadas não existem no objeto (nem como undefined)
expect(result).not.toHaveProperty('batteryVoltage');
```

## Function Design

**Size:** Small, focused functions; complex logic isolated to services

**Parameters:**
- Typed parameters with TypeScript interfaces
- Optional parameters marked with `?`
- Generic `any` used sparingly for flexible payload handling

**Return values:**
- Typed return types on service methods
- `Partial<T>` for flexible payloads
- Union types for variant returns

## Module Design

**Exports:**
- Named exports for utilities and hooks (`export const useSupabaseData = ...`)
- Default exports for React components (`export default DeviceList`)
- Re-exports not used

**Barrel files:** Not used — direct imports throughout

**Service pattern:**
```typescript
export class TelemetryService {
    static normalizePayload(payload: any): Partial<DeviceTelemetry> { ... }
    private static parseNumber(val: any): number | undefined { ... }
}
```

**Hook pattern:**
```typescript
export const useSupabaseData = (tenantId: string, deviceId?: string) => {
    const [devices, setDevices] = useState<Device[]>([]);
    useEffect(() => { ... }, [tenantId]);
    return { devices };
};
```

## React Patterns

**State management:** React hooks (`useState`, `useEffect`, `useMemo`)

**Context usage:** Separate context files (`AuthContext.tsx`, `TenantContext.tsx`, `NotificationContext.tsx`)

**Component composition:** Props drilling for callbacks + context for global state

---

*Convention analysis: 2026-05-10*
