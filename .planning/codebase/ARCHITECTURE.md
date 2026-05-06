# ARCHITECTURE.md — Sensor IoT Dashboard
<!-- last_mapped: 2026-05-05 -->

## Padrão Arquitetural

**Clean Architecture** (inspirado em Robert Martin) aplicado ao frontend React. As camadas externas dependem das internas; a camada `domain` não conhece nenhuma outra.

```
┌─────────────────────────────────────────────────────────┐
│                     UI Layer                            │
│  components/ (Dashboard, DeviceDetails, ManagerPanel…)  │
│  hooks/      (useMqttData, useSupabaseData…)            │
│  contexts/   (AuthContext, TenantContext…)              │
├─────────────────────────────────────────────────────────┤
│                 Application Layer                        │
│  application/ (Use Cases — GetDevicesUseCase,           │
│               ProcessMqttUpdateUseCase, GenerateReport…) │
├─────────────────────────────────────────────────────────┤
│                  Domain Layer                            │
│  domain/entities/   (Device, Telemetry, Event, User…)   │
│  domain/repositories.ts  (interfaces IDeviceRepository…)│
│  domain/services/   (MqttPayloadNormalizer)             │
├─────────────────────────────────────────────────────────┤
│               Infrastructure Layer                       │
│  infrastructure/ (SupabaseDeviceRepository,             │
│                   EmqxMqttService, …)                   │
└─────────────────────────────────────────────────────────┘
```

---

## Fluxo de Dados Principal

### 1. Telemetria em Tempo Real (MQTT)

```
ESP32 ──► EMQX ──► EmqxMqttService (WebSocket)
                         │
                   useMqttData hook
                         │
              ProcessMqttUpdateUseCase
              (merge seletivo de telemetria)
                         │
                   devices state (React)
                         │
              Dashboard / DeviceDetails
```

### 2. Dados Históricos (Supabase)

```
Supabase ──► useSupabaseData hook
              ├── SupabaseDeviceRepository
              ├── SupabaseTelemetryRepository
              └── SupabaseEventRepository
                        │
                GetDevicesUseCase / GetTelemetryHistoryUseCase
                        │
                   Dashboard / DeviceDetails (Recharts)
```

### 3. Alertas

```
EMQX Rule Engine ──► n8n Webhook ──► WhatsApp (Evolution API)
                                          [notificação externa]

MQTT topic 'nikaotec/#' ──► useMqttData ──► addAlert (NotificationContext)
                                ├── playAlertSound (Web Audio API)
                                └── logAlertToSupabase (events table)
```

### 4. Comandos Dashboard → ESP32

```
ManagerPanel / DeviceDetails
         │
  EmqxMqttService.publish()  ──► EMQX ──► ESP32
  topic: 'esp32c3/web/action'
  payload: {"acao": "...", "ID_DISPOSITIVO": "..."}
```

---

## Camada de Domínio

### Entidades (`domain/entities/`)

| Entidade | Arquivo | Responsabilidade |
|----------|---------|-----------------|
| `Device` | `Device.ts` | Dispositivo com telemetria, status, tenant |
| `DeviceTelemetry` | `Device.ts` | Todos os campos de sensor e config |
| `Telemetry` | `Telemetry.ts` | Registro histórico de telemetria |
| `DeviceEvent` | `Event.ts` | Evento de log/alerta |
| `User` | `User.ts` | Usuário com role (admin/manager/user) |
| `ReportConfig` | `ReportConfig.ts` | Configuração de relatório PDF |
| `Tenant` | `Device.ts` | Empresa/cliente (multi-tenant) |

### Interfaces de Repositório (`domain/repositories.ts`)
```typescript
IDeviceRepository    // getById, listAll, listByTenant, updateStatus
ITelemetryRepository // listByDevice, save
IEventRepository     // listAll, listByTenant, save, listByDevice
IUserRepository      // listAll, getById, save, delete, updateRole
IReportConfigRepository // listByTenant, save, delete
```

---

## Camada de Application (Use Cases)

| Use Case | Arquivo | Propósito |
|----------|---------|-----------|
| `ProcessMqttUpdateUseCase` | `ProcessMqttUpdateUseCase.ts` | Correlaciona update MQTT com lista de devices (3 estratégias: ID exato, nome, ID parcial) + merge seletivo de telemetria |
| `GetDevicesUseCase` | `GetDevicesUseCase.ts` | Lista devices por tenant ou todos |
| `GetEventsUseCase` | `GetEventsUseCase.ts` | Lista eventos por tenant |
| `GetTelemetryHistoryUseCase` | `GetTelemetryHistoryUseCase.ts` | Histórico 24h por device |
| `GenerateReportUseCase` | `GenerateReportUseCase.ts` | Gera relatório PDF via n8n webhook |
| `GetUsersUseCase` / `GetReportsUseCase` | — | CRUD auxiliar |
| `DeleteReportUseCase` / `SaveReportUseCase` | — | Persistência de relatórios |

---

## Camada de Infrastructure

| Arquivo | Propósito |
|---------|-----------|
| `EmqxMqttService.ts` | Singleton MQTT com backoff exponencial, QoS 1, observer pattern |
| `MqttService.ts` | Serviço MQTT legado (substituído pelo EMQXMqttService) |
| `SupabaseDeviceRepository.ts` | Implementa `IDeviceRepository` via Supabase SDK |
| `SupabaseTelemetryRepository.ts` | Implementa `ITelemetryRepository` |
| `SupabaseEventRepository.ts` | Implementa `IEventRepository` |
| `SupabaseUserRepository.ts` | Implementa `IUserRepository` |
| `SupabaseReportRepository.ts` | Implementa `IReportConfigRepository` |

---

## Contextos React (Estado Global)

| Contexto | Arquivo | Responsabilidade |
|----------|---------|-----------------|
| `AuthContext` | `contexts/AuthContext` | Usuário atual, login/logout via Firebase Auth |
| `TenantContext` | `contexts/TenantContext` | Tenant ativo, lista de tenants, switching |
| `NotificationContext` | `contexts/NotificationContext` | Fila de alertas ativos MQTT (badges, popups) |

---

## Firmware ESP32 (Arquitetura)

```
esp32.ino (loop principal)
├── AppNetworkManager  — WiFi + MQTT connect/reconnect
├── StorageManager     — EEPROM read/write (SystemSettings)
├── AlertManager       — Lógica de alarme + debounce + throttle WhatsApp
├── DisplayManager     — I2C display (OLED/LCD)
├── AmbientSensor      — DHT11 / AHT10 (temperatura e umidade)
├── BatterySensor      — ADC bateria (pino 34)
├── VoltageSensor      — ZMPT101B (pino 35)
└── ButtonManager      — PCF8574 (4 botões)
```

### Config centralizada: `Config.h`
- Todos os pinos, endereços EEPROM, constantes, structs em um único header
- `SystemSettings` struct representa estado completo do dispositivo

---

## RBAC (Controle de Acesso)
- **admin**: acesso a DeviceDetails, ManagerPanel, AdminUserPanel
- **manager**: acesso a DeviceList, Alerts, Reports
- **user**: apenas Dashboard e Alerts
- Lógica de roteamento em `App.tsx` por `currentUser.role`

---

## Anti-padrões Observados
- Componentes muito grandes: `DeviceDetails.tsx` (89 KB), `ManagerPanel.tsx` (71 KB), `Reports.tsx` (59 KB) — alta complexidade, difíceis de manter
- `ProcessMqttUpdateUseCase` acessa `(telemetry as any)[key]` — sem type safety na fusão
- Credenciais WiFi hardcoded em `Config.h` (produção)
