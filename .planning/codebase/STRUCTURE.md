# STRUCTURE.md — Sensor IoT Dashboard
<!-- last_mapped: 2026-05-05 -->

## Árvore de Diretórios

```
sensor/
├── dashboard/                        # Frontend React + Express server
│   ├── src/
│   │   ├── main.tsx                  # Entry point (monta App em #root)
│   │   ├── App.tsx                   # Roteamento por estado + Providers
│   │   ├── App.css / index.css       # Estilos globais
│   │   │
│   │   ├── domain/                   # [DOMÍNIO] Lógica de negócio pura
│   │   │   ├── entities/             # Tipos TypeScript (Device, Telemetry…)
│   │   │   │   ├── Device.ts
│   │   │   │   ├── Telemetry.ts
│   │   │   │   ├── Event.ts
│   │   │   │   ├── User.ts
│   │   │   │   └── ReportConfig.ts
│   │   │   ├── repositories.ts       # Interfaces dos repositórios
│   │   │   └── services/             # MqttPayloadNormalizer
│   │   │
│   │   ├── application/              # [APLICAÇÃO] Use Cases
│   │   │   ├── ProcessMqttUpdateUseCase.ts
│   │   │   ├── GetDevicesUseCase.ts
│   │   │   ├── GetEventsUseCase.ts
│   │   │   ├── GetTelemetryHistoryUseCase.ts
│   │   │   ├── GenerateReportUseCase.ts
│   │   │   ├── GetUsersUseCase.ts
│   │   │   ├── GetReportsUseCase.ts
│   │   │   ├── DeleteReportUseCase.ts
│   │   │   ├── SaveReportUseCase.ts
│   │   │   └── *.test.ts             # Testes unitários dos use cases
│   │   │
│   │   ├── infrastructure/           # [INFRA] Implementações externas
│   │   │   ├── EmqxMqttService.ts    # MQTT WebSocket (singleton)
│   │   │   ├── EmqxMqttService.test.ts
│   │   │   ├── MqttService.ts        # Serviço MQTT legado
│   │   │   ├── SupabaseDeviceRepository.ts
│   │   │   ├── SupabaseTelemetryRepository.ts
│   │   │   ├── SupabaseEventRepository.ts
│   │   │   ├── SupabaseUserRepository.ts
│   │   │   └── SupabaseReportRepository.ts
│   │   │
│   │   ├── components/               # [UI] Componentes React
│   │   │   ├── Dashboard.tsx         # Tela principal (cards + stats)
│   │   │   ├── DeviceDetails.tsx     # Detalhes + controles (89KB!)
│   │   │   ├── DeviceList.tsx        # Lista de dispositivos
│   │   │   ├── ManagerPanel.tsx      # Painel gerente (71KB!)
│   │   │   ├── AdminUserPanel.tsx    # Gestão de usuários (admin)
│   │   │   ├── Alerts.tsx            # Central de alertas
│   │   │   ├── Reports.tsx           # Relatórios PDF (59KB!)
│   │   │   ├── Settings.tsx          # Configurações do perfil
│   │   │   ├── Login.tsx / SignUp.tsx# Autenticação
│   │   │   ├── Sidebar.tsx           # Navegação lateral
│   │   │   ├── ErrorBoundary.tsx     # Error boundary React
│   │   │   └── dashboard/            # Sub-componentes do Dashboard
│   │   │
│   │   ├── hooks/                    # Custom Hooks
│   │   │   ├── useMqtt.ts            # Hook MQTT genérico
│   │   │   ├── useMqttData.ts        # Dados MQTT + ProcessMqttUpdateUseCase
│   │   │   ├── useSupabaseData.ts    # Dados Supabase (devices, events)
│   │   │   ├── useTelemetryData.ts   # Histórico de telemetria
│   │   │   ├── useReportGenerator.ts # Geração PDF via n8n
│   │   │   ├── useReports.ts         # CRUD de relatórios
│   │   │   └── useSettings.ts        # Configurações do usuário
│   │   │
│   │   ├── contexts/                 # React Contexts
│   │   │   ├── AuthContext.tsx        # Firebase Auth
│   │   │   ├── TenantContext.tsx      # Multi-tenant
│   │   │   └── NotificationContext.tsx# Fila de alertas MQTT
│   │   │
│   │   ├── supabase/
│   │   │   └── config.ts             # Cliente Supabase (createClient)
│   │   │
│   │   ├── firebase/
│   │   │   └── config.ts             # Firebase App + Auth
│   │   │
│   │   ├── services/                 # Serviços auxiliares da UI
│   │   ├── data/                     # Dados estáticos / mocks
│   │   ├── styles/                   # CSS adicional
│   │   ├── templates/                # Templates HTML para relatórios
│   │   └── tests/                    # Testes de integração
│   │
│   ├── server.js                     # Express prod server + proxy
│   ├── vite.config.ts                # Vite (proxy /api → n8n)
│   ├── vitest.config.ts              # Vitest (jsdom)
│   ├── tailwind.config.cjs           # Tailwind design tokens
│   ├── package.json                  # Dependências
│   ├── tsconfig.app.json             # TypeScript config
│   └── .env                          # Variáveis de ambiente
│
├── esp32/                            # Firmware Arduino C++
│   ├── esp32.ino                     # Loop principal (41KB)
│   ├── Config.h                      # Config centralizada + structs
│   ├── AlertManager.cpp / .h         # Lógica de alarme
│   ├── AppNetworkManager.cpp / .h    # WiFi + MQTT
│   ├── StorageManager.cpp / .h       # EEPROM
│   ├── DisplayManager.cpp / .h       # Display I2C
│   ├── AmbientSensor.h               # DHT11 / AHT10
│   ├── BatterySensor.h               # Bateria ADC
│   ├── VoltageSensor.h               # ZMPT101B
│   └── ButtonManager.h               # PCF8574
│
├── emqx/                             # Infra EMQX v5
│   ├── docker-compose.yml            # EMQX + PostgreSQL
│   ├── init_postgres.sql             # Schema PostgreSQL
│   └── rule_telemetria.sql           # Rule Engine SQL
│
├── evolution-api-main/               # WhatsApp API (Docker)
│   └── nginx-docker.conf             # Nginx reverse proxy
│
├── *.json                            # Workflows n8n (importar via UI)
├── supabase_schema.sql               # Schema base Supabase
├── *.sql                             # Migrações/patches SQL
└── docs/                            # Documentação adicional
```

---

## Localizações Chave

| O que procurar | Onde |
|---------------|------|
| Config MQTT (topics, broker URL) | `dashboard/src/infrastructure/EmqxMqttService.ts` linha 42-49 |
| Config Supabase | `dashboard/src/supabase/config.ts` |
| Config Firebase | `dashboard/src/firebase/config.ts` |
| Entidade Device (campos telemetria) | `dashboard/src/domain/entities/Device.ts` |
| Interfaces repositórios | `dashboard/src/domain/repositories.ts` |
| Merge telemetria MQTT | `dashboard/src/application/ProcessMqttUpdateUseCase.ts` |
| Pinos ESP32 | `esp32/Config.h` linhas 33-43 |
| Endereços EEPROM | `esp32/Config.h` linhas 58-83 |
| Thresholds padrão | `esp32/Config.h` linhas 85-96 |
| Lógica de alarme | `esp32/AlertManager.cpp` |
| Deploy script | `dashboard/deploy_dashboard.sh` |
| Proxy dev | `dashboard/vite.config.ts` (seção `server.proxy`) |

---

## Convenções de Nomenclatura

| Item | Padrão | Exemplo |
|------|--------|---------|
| Componentes React | PascalCase | `DeviceDetails.tsx` |
| Hooks | camelCase com prefixo `use` | `useMqttData.ts` |
| Use Cases | PascalCase + `UseCase` | `ProcessMqttUpdateUseCase.ts` |
| Repositórios | PascalCase + `Repository` | `SupabaseDeviceRepository.ts` |
| Interfaces domínio | PascalCase com prefixo `I` | `IDeviceRepository` |
| Contextos React | PascalCase + `Context` | `AuthContext.tsx` |
| Tópicos MQTT | `snake_case` / `kebab-case` | `telemetria/{device_id}` |
| Tabelas Supabase | `snake_case` | `devices_status`, `telemetry_history` |

---

## Arquivos Grandes (Atenção Especial)

| Arquivo | Tamanho | Observação |
|---------|---------|------------|
| `dashboard/src/components/DeviceDetails.tsx` | 89 KB | "God component" — candidato a refatoração |
| `dashboard/src/components/ManagerPanel.tsx` | 71 KB | Alta complexidade |
| `dashboard/src/components/Reports.tsx` | 59 KB | Lógica de PDF embutida |
| `dashboard/src/components/AdminUserPanel.tsx` | 36 KB | Gestão full de usuários |
| `esp32/esp32.ino` | 41 KB | Loop principal do firmware |
| `dashboard/package-lock.json` | 293 KB | Lock file (não editar manualmente) |
