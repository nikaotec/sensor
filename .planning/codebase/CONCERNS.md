# Concerns

**Mapped:** 2026-05-08

## Technical Debt

### ESP32 Firmware
| Issue | Impact | Remediation |
|-------|--------|-------------|
| Large `esp32.ino` (1185 lines) | Hard to maintain | Split into manager classes |
| Hardcoded WiFi credentials | Security risk | Move to Config.h constants |
| Battery sensor deprecated | Confusion | Remove `BatterySensor.h` |
| No watchdog timer | Stability risk | Add ESP.reset() on hangs |

### Dashboard
| Issue | Impact | Remediation |
|-------|--------|-------------|
| Firebase legacy code | Confusion | Deprecate Firestore, use Auth only |
| Duplicate MQTT hooks | Inconsistency | Consolidate `useMqttData.ts` |
| No error boundaries | Crash risk | Add React error boundaries |

### n8n Workflows
| Issue | Impact | Remediation |
|-------|--------|-------------|
| Duplicate Supabase nodes | Maintenance | Create reusable sub-workflow |
| Hardcoded instance names | Portability | Use credentials |
| No error handling in AI Agent | Silent failures | Add fallback responses |

## Known Issues

### Current Problems
1. **ESP32 display paging** - Requires static paging logic (task.md id:0)
2. **Min temp display** - 0.0 treated as valid (fixed in StorageManager)
3. **Voltage calibration** - Factor calculation complex

### Historical Fixes (task.md)
- ✓ Standardized timezone to America/Sao_Paulo
- ✓ Added Device Name to Dashboard Alerts
- ✓ Implemented Static Paging Logic
- ✓ Fixed Min Temp Display Layout
- ✓ Improved Command Feedback
- ✓ Implemented Calibration by Reference
- ✓ Implemented Voltage Alarm Logic
- ✓ Fixed n8n Firebase OAuth2 (Service Account)
- ✓ Fixed Hourly Telemetry Logging

## Security Concerns

| Area | Concern | Mitigation |
|------|---------|------------|
| ESP32 | Hardcoded WiFi/MQTT credentials | Config.h constants (acceptable for device) |
| Dashboard | Exposed Supabase keys | Use RLS + anon key only |
| WhatsApp | Bot runs on shared Evolution API | Per-instance authentication |
| VPS | SSH root access | Key-based auth required |
| Git | No `.env` protection | `.gitignore` exists |

## Performance Issues

| Area | Issue | Impact |
|------|-------|--------|
| MQTT | No QoS 2 | Possible message loss on network issues |
| Supabase | No query pagination | Large result sets load slowly |
| Dashboard | Recharts re-render | 100+ devices may lag |
| ESP32 | Voltage sampling blocks | 100ms blocking task |

## Fragile Areas

### High Risk
1. **ESP32 WiFi reconnection** - Reconnection logic untested
2. **n8n AI Agent prompt** - Tightly coupled to specific model
3. **Supabase RLS policies** - Complex, easy to misconfigure

### Medium Risk
1. **Evolution API WhatsApp** - External dependency
2. **Realtime subscriptions** - Connection drops
3. **EEPROM addressing** - No magic numbers validation

## Architecture Concerns

| Concern | Description |
|---------|-------------|
| No offline support | Dashboard requires internet |
| No message queuing | MQTT drops if n8n down |
| Single point of failure | VPS hosts everything |
| No monitoring | No uptime checks, no alerts |

## Deprecation Notes

| Item | Status | Replacement |
|------|--------|-------------|
| Firestore logging | Deprecated | Supabase only |
| BatterySensor.h | Unused | Remove on refactor |
| Firebase SDK for DB | Deprecated | Supabase JS only |

## Pending Refactors

1. **ESP32 module extraction** - Move logic from esp32.ino to managers
2. **n8n reusable workflows** - Create sub-workflows for Supabase operations
3. **Dashboard component split** - Separate ReportModal logic
4. **Database indexing review** - Verify index usage in Supabase