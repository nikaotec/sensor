# Structure

**Mapped:** 2026-05-08

## Directory Layout

```
sensor/
├── .planning/              # GSD workflow artifacts
│   ├── codebase/          # Codebase maps
│   ├── PROJECT.md
│   ├── ROADMAP.md
│   └── STATE.md
├── esp32/                # ESP32-C3 firmware
│   ├── esp32.ino         # Main program
│   ├── Config.h          # Constants & pins
│   ├── AppNetworkManager.h/cpp
│   ├── AlertManager.h/cpp
│   ├── DisplayManager.h/cpp
│   ├── StorageManager.h/cpp
│   ├── VoltageSensor.h
│   ├── AmbientSensor.h
│   ├── BatterySensor.h
│   └── ButtonManager.h
├── dashboard/            # React dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DeviceList.tsx
│   │   │   ├── DeviceDetails.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── ManagerPanel.tsx
│   │   │   └── device/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── firebase/
│   │   └── supabase/
│   ├── package.json
│   └── vite.config.ts
├── *.json               # n8n workflows
├── *.sql                # Database migrations
├── docs/                # Documentation
└── evolution-api-main/  # WhatsApp bot (external)
```

## Key File Locations

### ESP32 Firmware

| File | Purpose |
|------|---------|
| `esp32/esp32.ino` | Main program (1185 lines) |
| `esp32/Config.h` | Pin definitions, constants |
| `esp32/AppNetworkManager.cpp` | WiFi + MQTT + callbacks |
| `esp32/AlertManager.cpp` | Alert debounce logic |
| `esp32/StorageManager.cpp` | EEPROM read/write |

### Dashboard

| File | Purpose |
|------|---------|
| `dashboard/src/App.tsx` | Root component |
| `dashboard/src/main.tsx` | Entry point |
| `dashboard/src/contexts/AuthContext.tsx` | Firebase auth |
| `dashboard/src/hooks/useMqttData.ts` | MQTT subscription |
| `dashboard/src/components/DeviceDetails.tsx` | Device view + charts |

### n8n Workflows

| File | Purpose |
|------|---------|
| `n8n_mqtt_to_supabase.json` | Telemetry ingestion |
| `n8n_events_logger.json` | Alert logging |
| `n8n_dashboard_actions.json` | Dashboard updates |
| `gerador-relatorios-pdf.json` | PDF generation |
| `mqtt receive.json` | WhatsApp bot |

### Database

| File | Purpose |
|------|---------|
| `supabase_schema.sql` | Full schema |
| `add_telemetry_columns.sql` | Migration |
| `add_alarm_columns.sql` | Migration |
| `apply_triggers.sql` | Row protection |

## Naming Conventions

### ESP32 (Arduino)
- **Files:** `PascalCase.h/cpp`, `lowercase.ino`
- **Classes:** `PascalCase`
- **Methods:** `camelCase`
- **Constants:** `SCREAMING_SNAKE_CASE`
- **Variables:** `camelCase` with type prefix (`fVoltage`, `iRelay`)

### React Dashboard
- **Components:** `PascalCase.tsx`
- **Hooks:** `camelCase.ts` (use prefix)
- **Utilities:** `camelCase.ts`
- **Types:** `PascalCase` in `types.ts`

### n8n Workflows
- **Files:** `kebab-case.json`
- **Nodes:** Descriptive names in snake_case
- **Variables:** $json.fieldName

## Subdirectories Worth Noting

| Directory | Description |
|-----------|-------------|
| `dashboard/src/components/device/` | Device-related subcomponents |
| `dashboard/src/hooks/` | Custom React hooks |
| `dashboard/src/services/` | API services |
| `esp32/` | All ESP32 source files (flat) |
| `docs/` | Project documentation |

## Git Structure

```
sensor/
├── .git/                 # Single git repo
├── esp32/               # Firmware subdir
├── dashboard/          # Frontend subdir
└── *.json              # Workflows at root
```

Note: Single repo with ESP32 and Dashboard in subdirectories. Evolution API is separate repo.