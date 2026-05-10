<!-- refreshed: 2026-05-10 -->
# Codebase Structure

**Analysis Date:** 2026-05-10

## Directory Layout

```
sensor/                          # Project root
├── dashboard/                   # React frontend application
│   ├── src/
│   │   ├── components/         # React UI components
│   │   ├── contexts/           # React context providers
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # Data/service layer
│   │   ├── supabase/          # Supabase client config
│   │   ├── firebase/          # Firebase config
│   │   ├── styles/            # CSS and style guides
│   │   ├── data/              # Static data and mocks
│   │   ├── utils/             # Helper functions
│   │   ├── tests/             # Test utilities
│   │   ├── App.tsx            # Main app component
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Global styles
│   ├── dist/                  # Built output
│   ├── server.js              # Express proxy server
│   ├── package.json           # Frontend dependencies
│   └── vite.config.ts         # Vite build config
├── esp32/                     # ESP32 Arduino firmware
│   ├── esp32.ino              # Main sketch
│   ├── *.h                    # Header files
│   ├── *.cpp                  # Implementation files
│   └── .vscode/               # Arduino IDE config
├── evolution-api-main/        # WhatsApp Business API
├── docs/                     # Deployment configs (nginx)
├── *.json                    # n8n workflow exports
├── *.sql                     # Database migrations
├── supabase_schema.sql        # Database schema definition
└── frontend/                  # Legacy/deprecated frontend
```

## Directory Purposes

**dashboard/src/components/:**
- Purpose: React UI components organized by feature
- Contains: TSX components, some with subdirectories
- Key files: `Dashboard.tsx`, `DeviceDetails.tsx`, `DeviceList.tsx`, `Login.tsx`, `Alerts.tsx`, `Reports.tsx`

**dashboard/src/contexts/:**
- Purpose: React Context providers for global state
- Key files: `AuthContext.tsx` (Firebase auth), `TenantContext.tsx` (multi-tenant), `NotificationContext.tsx` (alerts)

**dashboard/src/hooks/:**
- Purpose: Custom React hooks for data fetching and subscriptions
- Key files: `useMqttData.ts` (WebSocket), `useSupabaseData.ts`, `useTelemetryData.ts`, `useReportGenerator.ts`

**dashboard/src/services/:**
- Purpose: Business logic and data abstraction layer
- Key files: `TelemetryService.ts` (sensor data), `SupabaseMapper.ts`, `firebaseAuth.ts`

**esp32/:**
- Purpose: ESP32 firmware for temperature/humidity sensor
- Contains: Arduino C++ files (.ino, .h, .cpp)
- Key files: `esp32.ino` (main 800+ line sketch), `Config.h`, `AlertManager.*`, `StorageManager.*`

## Key File Locations

**Entry Points:**
- `dashboard/src/main.tsx`: React app bootstrap
- `dashboard/server.js`: Express server start
- `esp32/esp32.ino`: ESP32 firmware main
- `mqtt receive.json`: n8n workflow trigger

**Configuration:**
- `dashboard/package.json`: Frontend dependencies (React 19, Vite 7, Supabase, MQTT)
- `dashboard/.env`: Environment variables (Supabase URL/keys, Firebase config)
- `dashboard/vite.config.ts`: Build and proxy configuration
- `esp32/Config.h`: WiFi credentials, MQTT broker settings

**Core Logic:**
- `dashboard/src/App.tsx`: Main component with navigation and alert handling
- `dashboard/src/services/TelemetryService.ts`: Data service layer
- `mqtt receive.json`: n8n workflow for processing MQTT messages

**Testing:**
- `dashboard/src/services/__tests__/`: Service unit tests
- `dashboard/src/tests/`: Integration/test utilities
- `dashboard/vitest.config.ts`: Test runner config

## Naming Conventions

**Files:**
- Components: PascalCase (`DeviceDetails.tsx`, `Dashboard.tsx`)
- Hooks: camelCase with `use` prefix (`useMqttData.ts`, `useSupabaseData.ts`)
- Services: PascalCase (`TelemetryService.ts`, `SupabaseMapper.ts`)
- Contexts: PascalCase with `Context` suffix (`AuthContext.tsx`)
- Config: camelCase (`config.ts`, `firebase/config.ts`)

**Directories:**
- Lowercase, hyphenated for compound names: `src/components`, `src/services`, `src/hooks`

**Types/Interfaces:**
- PascalCase (`interface DeviceStatus`, `type Screen`)
- Co-located with usage (in same file as component/service)

## Where to Add New Code

**New Feature (Frontend):**
- Primary code: `dashboard/src/components/` (create new component)
- Logic/services: `dashboard/src/services/` (if reusable)
- Data hooks: `dashboard/src/hooks/` (if data fetching needed)
- Tests: `dashboard/src/services/__tests__/`

**New n8n Workflow:**
- Location: Root directory (e.g., `n8n_alert_handler.json`)
- Register in n8n UI for triggers (MQTT, HTTP, cron)

**New ESP32 Feature:**
- Implementation: `esp32/esp32.ino` (add to main sketch) or new `.cpp/.h` files
- Config: `esp32/Config.h` (for constants)

**Database Changes:**
- Schema: Append to `supabase_schema.sql`
- Migrations: Create new `*.sql` files in root

## Special Directories

**dashboard/dist/:**
- Purpose: Production build output
- Generated: Yes (via `npm run build`)
- Committed: Yes (for deployment)

**dashboard/node_modules/:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No (in .gitignore)

**esp32/.vscode/:**
- Purpose: Arduino IDE IntelliSense configuration
- Contains: `c_cpp_properties.json`

**.planning/:**
- Purpose: GSD planning documents (not part of deployed app)
- Generated: Yes (by GSD agents)
- Committed: Yes (for project documentation)

---

*Structure analysis: 2026-05-10*