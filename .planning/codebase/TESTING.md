# TESTING.md — Sensor IoT Dashboard
<!-- last_mapped: 2026-05-05 -->

## Framework e Configuração

| Item | Valor |
|------|-------|
| **Framework** | Vitest 4.1.5 |
| **Ambiente DOM** | jsdom 29.1 |
| **Testing Library** | @testing-library/react 16.3 + @testing-library/jest-dom 6.9 |
| **Config** | `dashboard/vitest.config.ts` |
| **Comando** | `npm test` (no diretório `dashboard/`) |

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

---

## Localização dos Testes

```
dashboard/src/
├── application/
│   ├── ProcessMqttUpdateUseCase.test.ts   # Use Case tests
│   ├── GetDevicesUseCase.test.ts
│   ├── GetEventsUseCase.test.ts
│   └── GenerateReportUseCase.test.ts
├── infrastructure/
│   └── EmqxMqttService.test.ts            # Service tests
└── tests/                                 # Testes de integração (pasta separada)
```

**Padrão:** testes co-localizados com o código-fonte (`.test.ts` ao lado do arquivo testado).

---

## Exemplos de Testes

### Use Case Test (ProcessMqttUpdateUseCase)
```typescript
// ProcessMqttUpdateUseCase.test.ts
import { describe, it, expect } from 'vitest';
import { ProcessMqttUpdateUseCase } from './ProcessMqttUpdateUseCase';
import type { Device } from '../domain/entities/Device';

const makeDevice = (overrides: Partial<Device> = {}): Device => ({
  id: 'dev-001',
  name: 'Sensor A',
  tenantId: 'tenant-1',
  type: 'sensor',
  status: 'online',
  location: 'Sala 1',
  lastSeen: '2026-05-05T00:00:00Z',
  telemetry: { temp: 25 },
  ...overrides,
});

describe('ProcessMqttUpdateUseCase', () => {
  const useCase = new ProcessMqttUpdateUseCase();

  it('deve encontrar dispositivo por ID exato (case-insensitive)', () => {
    const devices = [makeDevice({ id: 'DEV-001' })];
    const result = useCase.execute({ deviceId: 'dev-001', telemetry: { temp: 30 } }, devices);
    expect(result.index).toBe(0);
    expect(result.updatedDevice.telemetry.temp).toBe(30);
  });

  it('não deve sobrescrever telemetria existente com undefined', () => {
    const devices = [makeDevice({ telemetry: { temp: 25, humidity: 60 } })];
    const result = useCase.execute({ deviceId: 'dev-001', telemetry: { temp: 30 } }, devices);
    expect(result.updatedDevice.telemetry.humidity).toBe(60); // preservado
  });
});
```

### Service Test (EmqxMqttService)
```typescript
// EmqxMqttService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { EmqxMqttService, ConnectionState } from './EmqxMqttService';

vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(() => ({
      on: vi.fn(),
      subscribe: vi.fn(),
      publish: vi.fn(),
      end: vi.fn(),
    }))
  }
}));

describe('EmqxMqttService', () => {
  it('deve iniciar com estado Disconnected', () => {
    const service = new EmqxMqttService();
    expect(service.getState()).toBe(ConnectionState.Disconnected);
  });

  it('deve retornar função de cleanup ao registrar handler', () => {
    const service = new EmqxMqttService();
    const handler = vi.fn();
    const unsub = service.onMessage(handler);
    expect(typeof unsub).toBe('function');
  });
});
```

---

## Padrões de Mocking

### Mock de módulos externos
```typescript
// vi.mock() no topo do arquivo de teste
vi.mock('mqtt', () => ({
  default: { connect: vi.fn(() => mockClient) }
}));

vi.mock('../supabase/config', () => ({
  supabase: { from: vi.fn() }
}));
```

### Factory Functions para entidades
```typescript
// Para criar devices com apenas os campos necessários
const makeDevice = (overrides: Partial<Device> = {}): Device => ({
  id: 'test-id',
  name: 'Test Device',
  ...defaultValues,
  ...overrides,
});
```

---

## Cobertura Atual

| Módulo | Cobertura | Testes |
|--------|-----------|--------|
| `ProcessMqttUpdateUseCase` | ✅ Parcial | .test.ts existente |
| `GetDevicesUseCase` | ✅ Parcial | .test.ts existente |
| `GetEventsUseCase` | ✅ Parcial | .test.ts existente |
| `GenerateReportUseCase` | ✅ Parcial | .test.ts existente |
| `EmqxMqttService` | ✅ Parcial | .test.ts existente |
| Componentes React | ❌ Ausente | Nenhum teste de componente |
| Hooks | ❌ Ausente | Nenhum teste de hook |
| Repositórios Supabase | ❌ Ausente | Dependem de conexão real |
| Firmware ESP32 | ❌ Ausente | Sem framework de testes |

---

## Gaps e Recomendações

### Crítico
- **Componentes sem teste**: `DeviceDetails.tsx`, `ManagerPanel.tsx`, `Reports.tsx` são os mais complexos e não têm nenhum teste
- **Hooks sem teste**: `useMqttData`, `useSupabaseData`, `useTelemetryData` — lógica crítica não coberta
- **Integração MQTT de ponta a ponta**: Não há teste que valide o fluxo completo (MQTT → UseCase → State → UI)

### Recomendado
- Adicionar testes para `ProcessMqttUpdateUseCase` cobrindo:
  - Merge parcial sem undefined
  - Fuzzy match de ID parcial (3ª estratégia)
  - Device não encontrado (isNew: true)
- Mock do `emqxMqttService` singleton para testes de hooks
- Considerar `msw` (Mock Service Worker) para mock das chamadas Supabase
- Verificar se `ALERT_REPEAT` do firmware é respeitado (issue recorrente)
