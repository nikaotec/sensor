# STRUCTURE - Directory Layout & Key Locations

**Last Mapped:** 2026-05-09  
**Project:** IoT Sensor Monitoring System

## Root Structure

```
sensor/
├── dashboard/              # React SPA application
├── docs/                   # Configuration files (nginx, deploy)
├── esp32/                  # ESP32-C3 firmware
├── esp32.7z                # Compressed firmware
├── esp32.json              # n8n workflow for ESP32 config
├── evolution-api-main/     # WhatsApp bot API
├── frontend/               # Legacy frontend (likely obsolete)
├── inspirations/           # Design inspiration images
├── .planning/              # GSD planning docs
├── .venv/                  # Python virtual environment
├── n8n_*.json              # n8n workflow exports
├── relatorio.html          # Standalone report generator
├── supabase_schema.sql      # Database schema
└── *.sql                   # Migration scripts
```

## Dashboard Structure

```
dashboard/
├── index.html              # Entry point
├── server.js               # Express proxy server (production)
├── package.json            # Dependencies
├── tailwind.config.cjs     # Tailwind configuration
├── postcss.config.cjs      # PostCSS configuration
├── vite.config.ts          # Vite build config
├── eslint.config.js        # ESLint config
├── firebase.json           # Firebase hosting config
├── firestore.*.json        # Firestore rules/indexes
├── dist/                   # Production build output
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Main app component + routing
│   ├── components/         # React components
│   │   ├── Login.tsx       # Authentication
│   │   ├── SignUp.tsx      # Registration
│   │   ├── Dashboard.tsx   # Main dashboard view
│   │   ├── DeviceList.tsx  # Device listing
│   │   ├── DeviceDetails.tsx  # Individual device view
│   │   ├── Alerts.tsx      # Alert history
│   │   ├── Reports.tsx     # Report generation
│   │   ├── Settings.tsx    # User settings
│   │   ├── ManagerPanel.tsx  # Manager controls
│   │   ├── AdminUserPanel.tsx  # Admin user management
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   ├── ErrorBoundary.tsx  # Error handling
│   │   ├── dashboard/      # Dashboard sub-components
│   │   │   ├── DeviceCard.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── DashboardHeader.tsx
│   │   │   └── ReportModal.tsx
│   │   └── device/          # Device detail sub-components
│   │       ├── DeviceTelemetryCard.tsx
│   │       ├── RelayControl.tsx
│   │       ├── AlarmSettings.tsx
│   │       ├── CalibrationControl.tsx
│   │       ├── HysteresisControl.tsx
│   │       ├── DeviceHistoryChart.tsx
│   │       ├── SystemInfo.tsx
│   │       └── RecentEvents.tsx
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── TenantContext.tsx
│   │   └── NotificationContext.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useMqttData.ts
│   │   ├── useSupabaseData.ts
│   │   ├── useTelemetryData.ts
│   │   ├── useMqtt.ts
│   │   └── useSettings.ts
│   ├── services/            # Business logic
│   │   ├── TelemetryService.ts
│   │   ├── SupabaseMapper.ts
│   │   └── firebaseAuth.ts
│   ├── supabase/           # Supabase config
│   │   └── config.ts
│   ├── firebase/           # Firebase config
│   │   └── config.ts
│   ├── utils/              # Utilities
│   │   └── statusUtils.ts
│   ├── data/               # Static data
│   │   └── mockData.ts
│   ├── templates/           # Component templates
│   │   └── component-template.tsx
│   ├── tests/              # Test files
│   │   ├── SupabaseMapper.test.ts
│   │   └── setup.ts
│   └── __tests__/           # Service tests
│       └── TelemetryService.test.ts
├── test_*.js               # Test scripts (MQTT, Supabase, Firebase)
├── query_*.js              # Query utilities
├── temp/                   # Temporary/legacy files
│   ├── login.html
│   ├── dashboard-v1.html
│   └── ...
└── queue/                  # Queue-related files
    └── Settings.html
```

## ESP32 Firmware Structure

```
esp32/
├── src/
│   ├── main.cpp
│   ├── Config.h
│   ├── Sensor.h
│   ├── MQTT.h
│   └── ...
└── platformio.ini
```

## n8n Workflows

| File | Purpose |
|------|---------|
| `n8n_hourly_telemetry.json` | Log periodic sensor data to Supabase |
| `n8n_dashboard_actions.json` | Process device commands |
| `n8n_events_logger.json` | Log alert events |
| `n8n_hourly_snapshot.json` | Hourly data snapshots |
| `gerador-relatorios-pdf.json` | PDF report generation |
| `mqtt receive.json` | Generic MQTT listener |

## SQL Migrations

| File | Purpose |
|------|---------|
| `supabase_schema.sql` | Main schema creation |
| `apply_triggers.sql` | Database triggers |
| `add_telemetry_columns.sql` | Add columns to telemetry |
| `add_phone_column.sql` | Add phone to users |
| `add_chk_columns.sql` | Add checkbox fields |
| `add_alarm_columns.sql` | Add alarm settings |
| `create_report_configs.sql` | Report configuration |
| `report_logs_table.sql` | Report audit logs |
| `fix_telemetry_types.sql` | Type fixes |
| `migrate_telemetry_datetime.sql` | DateTime migration |

## Key Files

| File | Purpose |
|------|---------|
| `Guia_Integracao_Firebase_N8N.md` | Integration documentation |
| `COMPLETE_PROJECT_ANALYSIS.md` | Project analysis document |
| `alterar-layout-relatorio.md` | Report layout changes |
| `task.md` | Task documentation |

## Naming Conventions

| Pattern | Example |
|---------|---------|
| Components | PascalCase: `DeviceCard.tsx`, `Alerts.tsx` |
| Hooks | camelCase with `use`: `useMqttData.ts` |
| Services | PascalCase: `TelemetryService.ts` |
| Contexts | PascalCase: `AuthContext.tsx` |
| Utilities | camelCase: `statusUtils.ts` |
| SQL files | snake_case: `add_telemetry_columns.sql` |
| n8n files | snake_case: `n8n_hourly_telemetry.json` |