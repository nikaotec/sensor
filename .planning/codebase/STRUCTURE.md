# Codebase Structure

**Analysis Date:** 2026-05-20

## Directory Layout

```
sensor/
├── esp32/                      # ESP32-C3 firmware (Arduino/C++)
│   ├── esp32.ino               # Entry point (delegates to src/)
│   └── src/
│       ├── main.cpp            # Main firmware logic (1357 lines)
│       ├── main.h              # Entry point declarations
│       ├── AlertManager.cpp    # Alert state machine implementation
│       ├── AlertManager.h      # Alert states: STARTED, REPEATED, NORMALIZED
│       ├── config/
│       │   └── Config.h        # Pin definitions, thresholds, defaults
│       ├── display/            # OLED display management
│       ├── mqtt/               # MQTT connection and message handling
│       │   ├── MqttManager.cpp
│       │   ├── MqttManager.h
│       │   ├── AppNetworkManager.cpp
│       │   └── AppNetworkManager.h
│       ├── ota/                # OTA update handling
│       ├── sensors/            # Sensor abstraction layer
│       │   ├── AmbientSensor.h # DHT11 temperature/humidity
│       │   ├── BatterySensor.h # Battery voltage sensing
│       │   └── VoltageSensor.h # Mains voltage sensing (ZMPT)
│       ├── storage/            # EEPROM configuration persistence
│       └── utils/              # Button management utilities
├── dashboard/                  # React 19 + Vite + TypeScript SPA
│   ├── src/
│   │   ├── main.tsx            # React entry point
│   │   ├── App.tsx             # Root component with routing and providers
│   │   ├── App.css             # Global styles
│   │   ├── index.css           # Tailwind imports, CSS variables
│   │   ├── components/         # UI components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DeviceList.tsx
│   │   │   ├── DeviceDetails.tsx
│   │   │   ├── Alerts.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── SignUp.tsx
│   │   │   ├── ManagerPanel.tsx
│   │   │   ├── AdminUserPanel.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── dashboard/      # Dashboard-specific subcomponents
│   │   │   ├── device/         # Device-specific subcomponents
│   │   │   └── ota/            # OTA panel components
│   │   ├── contexts/           # React Context providers
│   │   │   ├── AuthContext.tsx       # Firebase Auth state
│   │   │   ├── TenantContext.tsx     # Multi-tenant state
│   │   │   └── NotificationContext.tsx  # Alert notification state
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useMqttData.ts        # MQTT subscription + device state
│   │   │   ├── useMqtt.ts            # Raw MQTT connection
│   │   │   ├── useSupabaseData.ts    # Supabase queries + realtime
│   │   │   ├── useTelemetryData.ts   # Telemetry-specific data fetching
│   │   │   ├── useOtaManager.ts      # OTA update orchestration
│   │   │   ├── useReportGenerator.ts # PDF report generation
│   │   │   └── useSettings.ts        # Settings state management
│   │   ├── services/           # Business logic services
│   │   │   ├── TelemetryService.ts   # Payload normalization
│   │   │   ├── SupabaseMapper.ts     # DB row → Device mapping
│   │   │   ├── ChannelManager.ts     # Supabase Realtime channel dedup
│   │   │   ├── firebaseAuth.ts       # Firebase Auth helpers
│   │   │   ├── userService.ts        # User CRUD operations
│   │   │   ├── OtaService.ts         # OTA update service
│   │   │   ├── VersionService.ts     # Firmware version tracking
│   │   │   └── FirmwareRegistryService.ts  # Firmware registry
│   │   ├── supabase/
│   │   │   └── config.ts       # Supabase client initialization
│   │   ├── data/               # Mock data and type definitions
│   │   ├── templates/          # Report templates
│   │   ├── types/              # TypeScript type definitions
│   │   ├── utils/              # Utility functions
│   │   ├── styles/             # Style utilities
│   │   ├── firebase/           # Firebase configuration
│   │   └── tests/              # Test files
│   ├── server.js               # Express production server
│   ├── vite.config.ts          # Vite + Vitest configuration
│   ├── tailwind.config.cjs     # Tailwind CSS configuration
│   ├── postcss.config.cjs      # PostCSS configuration
│   ├── tsconfig.json           # TypeScript configuration
│   ├── eslint.config.js        # ESLint configuration
│   ├── firebase.json           # Firebase project config
│   ├── firebaserc              # Firebase project alias
│   ├── firestore.rules         # Firestore security rules
│   ├── firestore.indexes.json  # Firestore composite indexes
│   ├── package.json            # Dependencies and scripts
│   ├── index.html              # HTML entry point
│   └── public/                 # Static assets
├── evolution-api-main/         # WhatsApp Business API gateway (cloned)
│   ├── src/                    # TypeScript source
│   ├── prisma/                 # Database schema
│   ├── Dockerfile              # Docker build configuration
│   ├── docker-compose.yaml     # Docker Compose setup
│   └── package.json            # Dependencies
├── docs/                       # Documentation
│   ├── DEPLOY_VPS.md           # VPS deployment guide
│   ├── nginx-*.conf            # Nginx configuration files
│   └── walkthrough.md          # Project walkthrough
├── mqtt receive.json           # n8n: WhatsApp → AI → MQTT command workflow
├── n8n_hourly_telemetry.json   # n8n: MQTT → Supabase telemetry logging
├── n8n_hourly_snapshot.json    # n8n: Schedule → Supabase device snapshot
├── n8n_events_logger.json      # n8n: MQTT alerts → Supabase events
├── n8n_dashboard_actions.json  # n8n: Dashboard actions → Supabase events
├── supabase_schema.sql         # Database schema definition
├── add_alarm_columns.sql       # Migration: add alarm columns
├── add_chk_columns.sql         # Migration: add check columns
├── add_phone_column.sql        # Migration: add phone to users
├── add_telemetry_columns.sql   # Migration: add telemetry columns
├── apply_triggers.sql          # Migration: database triggers
├── create_report_configs.sql   # Migration: report configs table
├── fix_telemetry_types.sql     # Migration: fix telemetry column types
├── migrate_telemetry_datetime.sql  # Migration: datetime conversion
├── report_logs_table.sql       # Migration: report logs table
├── sync_users_devices.sql      # Migration: sync users and devices
├── dashboard_feed.json         # Dashboard feed configuration
├── dashboard_stitch.html       # Stitch-generated dashboard prototype
├── relatorio.html              # HTML report template
├── gerador-relatorios-pdf.json # n8n: PDF report generation workflow
├── Untitled-1770388346356.n8n  # Untitled n8n workflow
├── esp32_modified.json         # Modified ESP32 configuration
├── edit_dashboard.py           # Python script: dashboard editing
├── edit_device_list.py         # Python script: device list editing
├── patch_dashboard.py          # Python script: dashboard patching
├── patch_n8n_telemetry.py      # Python script: n8n telemetry patching
├── revert.py                   # Python script: revert changes
├── format.js                   # JavaScript: formatting utility
├── test_number.js              # JavaScript: number testing
├── test_user_flow.js           # JavaScript: user flow testing
├── Guia_Integracao_Firebase_N8N.md  # Firebase-n8n integration guide
├── COMPLETE_PROJECT_ANALYSIS.md     # Full project analysis document
└── task.md                     # Task tracking document
```

## Directory Purposes

**`esp32/`:**
- Purpose: ESP32-C3 firmware source code
- Contains: C++ source files for sensor reading, MQTT communication, alert management, OTA updates, display control
- Key files: `src/main.cpp` (core logic), `src/config/Config.h` (pin definitions, thresholds)

**`dashboard/`:**
- Purpose: React-based monitoring dashboard application
- Contains: TypeScript/React source, build configuration, production server
- Key files: `src/App.tsx` (root component), `server.js` (Express production server), `vite.config.ts` (build config)

**`dashboard/src/components/`:**
- Purpose: React UI components
- Contains: Screen-level components (Dashboard, DeviceList, Alerts, Reports, Settings, Login, etc.)
- Key files: `Dashboard.tsx`, `DeviceDetails.tsx`, `Alerts.tsx`

**`dashboard/src/hooks/`:**
- Purpose: Custom React hooks for data fetching and state management
- Contains: MQTT subscription, Supabase queries, OTA management, report generation
- Key files: `useMqttData.ts` (real-time device state), `useSupabaseData.ts` (database queries)

**`dashboard/src/services/`:**
- Purpose: Business logic and data transformation
- Contains: Telemetry normalization, Supabase mapping, channel management, auth helpers
- Key files: `TelemetryService.ts` (payload normalization), `SupabaseMapper.ts` (row-to-device mapping)

**`dashboard/src/contexts/`:**
- Purpose: React Context providers for global state
- Contains: Authentication, tenant selection, notification management
- Key files: `AuthContext.tsx`, `TenantContext.tsx`, `NotificationContext.tsx`

**`evolution-api-main/`:**
- Purpose: WhatsApp Business API gateway (external project, cloned)
- Contains: Full Evolution API codebase for WhatsApp integration
- Key files: `src/` (TypeScript source), `docker-compose.yaml` (container setup)

**`docs/`:**
- Purpose: Deployment and configuration documentation
- Contains: VPS deployment guide, Nginx configurations, walkthrough
- Key files: `DEPLOY_VPS.md`, `nginx-mqtt-final.conf`, `nginx-n8n-https.conf`

**Root-level SQL files:**
- Purpose: Database migrations and schema definitions
- Contains: Supabase schema, incremental migrations
- Key files: `supabase_schema.sql` (full schema), `add_*.sql` (incremental changes)

**Root-level n8n JSON files:**
- Purpose: n8n workflow definitions
- Contains: Exported workflow JSON for import into n8n instance
- Key files: `mqtt receive.json` (WhatsApp command processing), `n8n_hourly_telemetry.json` (data logging)

## Key File Locations

**Entry Points:**
- `esp32/esp32.ino`: Arduino IDE entry point (delegates to `src/main.cpp`)
- `dashboard/src/main.tsx`: React application entry point
- `dashboard/server.js`: Express production server entry point
- `evolution-api-main/src/`: WhatsApp API entry point

**Configuration:**
- `esp32/src/config/Config.h`: ESP32 pin definitions, thresholds, defaults
- `dashboard/.env`: Environment variables (Supabase, Firebase, MQTT URLs)
- `dashboard/vite.config.ts`: Vite build and test configuration
- `dashboard/tailwind.config.cjs`: Tailwind CSS theme configuration
- `dashboard/firebase.json`: Firebase project configuration
- `docs/nginx-*.conf`: Nginx reverse proxy configurations

**Core Logic:**
- `esp32/src/main.cpp`: ESP32 firmware main loop, sensor reading, MQTT handling (1357 lines)
- `dashboard/src/App.tsx`: Dashboard routing, provider nesting, alert handling (304 lines)
- `dashboard/src/hooks/useMqttData.ts`: MQTT subscription, device state management (384 lines)
- `dashboard/src/hooks/useSupabaseData.ts`: Supabase queries, realtime subscriptions (331 lines)
- `dashboard/src/services/TelemetryService.ts`: Payload field normalization (113 lines)

**Database:**
- `supabase_schema.sql`: Complete database schema (5 tables, indexes, RLS policies)
- `add_alarm_columns.sql`, `add_chk_columns.sql`, etc.: Incremental migrations

**Testing:**
- `dashboard/src/tests/`: Dashboard test files
- `dashboard/src/services/__tests__/`: Service unit tests

## Naming Conventions

**Files:**
- ESP32: PascalCase for classes (`AlertManager`, `MqttManager`), `Config.h` for configuration
- Dashboard: PascalCase for React components (`DeviceList.tsx`, `AuthContext.tsx`), camelCase for hooks (`useMqttData.ts`), PascalCase for services (`TelemetryService.ts`)
- n8n workflows: kebab-case with descriptive names (`n8n_hourly_telemetry.json`)
- SQL migrations: verb_noun pattern (`add_alarm_columns.sql`, `fix_telemetry_types.sql`)

**Directories:**
- ESP32: lowercase plural (`config/`, `mqtt/`, `sensors/`, `storage/`, `utils/`)
- Dashboard: lowercase plural (`components/`, `hooks/`, `services/`, `contexts/`, `types/`)

**Variables:**
- ESP32: camelCase for variables (`temperaturaAtual`, `modoManual`), UPPER_SNAKE_CASE for constants/macros (`DS18B20_PIN_1`, `ALERT_DEBOUNCE`)
- Dashboard: camelCase for variables and functions, PascalCase for types and interfaces
- MQTT payloads: UPPER_CASE for field names (`TEMP_C`, `VOLTAGEM`, `ID_DISPOSITIVO`)
- Supabase columns: snake_case (`device_id`, `temp_max`, `last_seen`)

## Where to Add New Code

**New ESP32 Feature:**
- Primary code: `esp32/src/` — create new module directory (e.g., `esp32/src/newfeature/`)
- Configuration: `esp32/src/config/Config.h` — add pin definitions and defaults
- Integration: `esp32/src/main.cpp` — add manager instantiation and loop calls
- MQTT topics: Define new topics in `esp32/src/mqtt/MqttManager.h`

**New n8n Workflow:**
- Create JSON file at root: `n8n_<workflow_name>.json`
- Import into n8n instance via UI or API
- Follow existing patterns: MQTT Trigger → Code (parse) → Filter → Supabase node

**New Dashboard Feature:**
- Component: `dashboard/src/components/<FeatureName>.tsx`
- Hook: `dashboard/src/hooks/use<FeatureName>.ts`
- Service: `dashboard/src/services/<FeatureName>Service.ts`
- Context (if global state needed): `dashboard/src/contexts/<FeatureName>Context.tsx`
- Route: Add screen type to `Screen` union in `dashboard/src/App.tsx:24`

**New Database Table:**
- Add to `supabase_schema.sql` or create migration `create_<table>_table.sql`
- Add to Supabase Realtime publication: `ALTER PUBLICATION supabase_realtime ADD TABLE <table>;`
- Add RLS policy: `CREATE POLICY "Allow all for <table>" ON <table> FOR ALL USING (true) WITH CHECK (true);`
- Add index for query patterns: `CREATE INDEX idx_<table>_<column> ON <table>(<column>);`

**New Dashboard Page/Screen:**
- Component: `dashboard/src/components/<PageName>.tsx`
- Add to `Screen` type in `dashboard/src/App.tsx`
- Add conditional render in `AppContent` component
- Add navigation in `Sidebar.tsx`

## Special Directories

**`dashboard/dist/`:**
- Purpose: Production build output (generated by `vite build`)
- Generated: Yes — by Vite build process
- Committed: No — listed in `.gitignore`
- Served by: `dashboard/server.js` via `express.static()`

**`dashboard/node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes — by `npm install`
- Committed: No — listed in `.gitignore`

**`dashboard/queue/`:**
- Purpose: OTA firmware file queue for over-the-air updates
- Generated: No — manually populated with `.bin` files
- Committed: No — binary files excluded

**`dashboard/temp/`:**
- Purpose: Temporary files for report generation and processing
- Generated: Yes — by report generation workflows
- Committed: No

**`esp32/build/`:**
- Purpose: Compiled firmware binaries
- Generated: Yes — by Arduino IDE or PlatformIO
- Committed: No

**`evolution-api-main/`:**
- Purpose: Cloned Evolution API repository for WhatsApp integration
- Generated: No — external project
- Committed: Yes — full clone included in repo
- Note: This is a large external dependency; consider using git submodule or separate deployment

**`.planning/`:**
- Purpose: GSD planning documents and codebase analysis
- Generated: Yes — by `/gsd-map-codebase` and `/gsd-plan-phase` commands
- Committed: No — typically excluded from version control

**Root-level Python scripts (`edit_dashboard.py`, `patch_n8n_telemetry.py`, etc.):**
- Purpose: One-off utility scripts for data manipulation and patching
- Generated: No — manually created
- Committed: Yes
- Note: These are ad-hoc scripts; consider consolidating into a `scripts/` directory

---

*Structure analysis: 2026-05-20*
