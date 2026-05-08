<!-- refreshed: 2026-05-07 -->
# Codebase Structure

**Analysis Date:** 2026-05-07

## Directory Layout

```
sensor/                          # Project root
├── .stitch/                    # Stitch design system
├── .opencode/                  # OpenCode AI configuration and skills
├── .planning/                  # Planning artifacts (generated)
├── dashboard/                  # React frontend application
├── esp32/                      # ESP32 firmware (C++)
├── docs/                       # Documentation and deployment guides
├── evolution-api-main/         # WhatsApp API integration
├── frontend/                   # Legacy frontend (deprecated)
├── test_env/                   # Test environment files
├── inspirations/               # Design inspiration images
├── n8n_*.json                  # n8n workflow definitions
├── supabase_schema.sql         # Database schema
├── *.sql                       # Database migrations and patches
├── *.py                        # Utility scripts
├── *.js                        # Test and utility scripts
└── *.md                        # Documentation files
```

## Directory Purposes

**dashboard/:**
- Purpose: Main React web application
- Contains: Frontend source code, build configuration, Express server
- Key files: `[dashboard/package.json]`, `[dashboard/server.js]`, `[dashboard/vite.config.ts]`

**esp32/:**
- Purpose: ESP32-C3 firmware for sensor devices
- Contains: Arduino C++ source files, configuration
- Key files: `[esp32/esp32.ino]`, `[esp32/Config.h]`, `[esp32/AlertManager.cpp]`

**docs/:**
- Purpose: Deployment guides and configuration examples
- Contains: Nginx configs, VPS deployment docs
- Key files: `[docs/DEPLOY_VPS.md]`, `[docs/nginx-*.conf]`

**n8n workflows (root JSON files):**
- Purpose: Automation workflows for data processing
- Contains: Workflow definitions with nodes and connections
- Key files: `[n8n_hourly_telemetry.json]`, `[mqtt receive.json]`, `[n8n_events_logger.json]`

## Key File Locations

**Entry Points:**
- `[dashboard/src/main.tsx]`: React app entry point
- `[dashboard/server.js]`: Express server entry point (line 173)
- `[esp32/esp32.ino]`: ESP32 firmware entry (setup/loop functions)
- `[dashboard/vite.config.ts]`: Vite build configuration

**Configuration:**
- `[dashboard/package.json]`: NPM dependencies and scripts
- `[dashboard/vite.config.ts]`: Vite bundler config
- `[esp32/Config.h]`: ESP32 WiFi/MQTT configuration
- `[supabase_schema.sql]`: Database schema and RLS policies

**Core Logic:**
- `[dashboard/src/App.tsx]`: Main React component with routing
- `[dashboard/src/components/Dashboard.tsx]`: Dashboard view component
- `[dashboard/src/hooks/useMqttData.ts]`: MQTT connection and message handling
- `[esp32/esp32.ino]`: Main ESP32 firmware (41KB)

**Testing:**
- `[dashboard/src/tests/]`: Test files directory
- `[test_user_flow.js]`: User flow tests
- `[test_number.js]`: Number utility tests

## Naming Conventions

**Files:**
- React components: PascalCase (`Dashboard.tsx`, `DeviceDetails.tsx`)
- Hooks: camelCase with `use` prefix (`useMqttData.ts`)
- Contexts: PascalCase (`AuthContext.tsx`, `TenantContext.tsx`)
- Services: camelCase (`firebaseAuth.ts`)
- n8n workflows: snake_case with descriptive prefix (`n8n_hourly_telemetry.json`)
- SQL migrations: snake_case (`add_alarm_columns.sql`)
- ESP32: PascalCase for classes (`AlertManager.h`), snake_case for files

**Directories:**
- kebab-case: `dashboard/src/components/`, `esp32/`
- PascalCase for contexts and hooks: `dashboard/src/contexts/`, `dashboard/src/hooks/`

## Where to Add New Code

**New Feature (Frontend):**
- Primary code: `[dashboard/src/components/]`
- Hooks: `[dashboard/src/hooks/]`
- Contexts: `[dashboard/src/contexts/]`
- Tests: `[dashboard/src/tests/]`

**New Feature (Backend/n8n):**
- Workflow: Root directory `[*.json]` files
- Code snippets: Use Code node within n8n UI
- Database changes: `[*.sql]` migration files

**New ESP32 Feature:**
- Implementation: `[esp32/]` directory
- New sensor: Create `SensorName.h` and `.cpp` files
- Configuration: Edit `[esp32/Config.h]`

**Utilities:**
- Shared helpers: `[dashboard/src/services/]`
- Shared types: Add to existing files or create `[dashboard/src/types.ts]`

## Special Directories

**.stitch/:**
- Purpose: Design system from Stitch (AI website builder)
- Contains: `DESIGN.md`, `next-prompt.md`
- Generated: Yes (by Stitch AI)
- Committed: Yes

**.opencode/:**
- Purpose: OpenCode AI agent skills and configuration
- Contains: Skills for different domains (tailwind-patterns, powershell-windows, etc.)
- Generated: Yes (by OpenCode setup)
- Committed: Yes

**evolution-api-main/:**
- Purpose: WhatsApp Business API integration
- Contains: Docker-based API server
- Generated: No (external dependency)
- Committed: Yes (for reference)

**frontend/:**
- Purpose: Deprecated legacy frontend
- Contains: Old build output in `dist/`
- Generated: Deprecated
- Committed: Yes (for reference)

**node_modules/:**
- Purpose: NPM dependencies (not committed to git)
- Generated: Yes (by `npm install`)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-05-07*