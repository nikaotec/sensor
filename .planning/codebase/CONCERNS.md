# CONCERNS - Technical Debt & Issues

**Last Mapped:** 2026-05-09  
**Project:** IoT Sensor Monitoring System

## Critical Issues

### 1. Security Concerns

| Issue | Severity | Location |
|-------|----------|----------|
| RLS disabled for dev | HIGH | `supabase_schema.sql:103-114` |
| Anon key exposed in frontend | MEDIUM | `dashboard/src/supabase/config.ts` |
| No HTTPS on ESP32 | MEDIUM | `esp32/` |
| Hardcoded credentials | HIGH | Multiple files |

### 2. Data Consistency

| Issue | Impact | Status |
|-------|--------|--------|
| Dual storage (Firestore + Supabase) | Confusion, sync issues | Partial migration |
| Null tenants in devices_status | Query failures | `fix-null-tenants.js` exists |
| Timezone handling | Display errors | Uses America/Sao_Paulo |

## Technical Debt

### Legacy Code

| Item | Description | Action |
|------|-------------|--------|
| `frontend/` directory | Obsolete, unused | Remove |
| `temp/*.html` files | Old dashboard versions | Clean up |
| `dashboard_stitch.html` | Abandoned design | Archive or remove |

### n8n Workflows

| Workflow | Issues |
|----------|--------|
| `mqtt receive.json` | Large (116KB), complex |
| Multiple `n8n_*.json` | Redundant functionality |
| No version control | Hard to track changes |

### Database Schema

| Issue | Impact |
|-------|--------|
| No foreign keys | Data integrity risk |
| Missing constraints | Invalid data possible |
| Text vs UUID for IDs | Inconsistent typing |
| No soft deletes | Data retention issues |

## Known Bugs

### 1. Alert System
- **Audio playback requires user interaction** first (browser requirement)
- **Alert value extraction** can fail if payload structure varies

### 2. Multi-Tenancy
- **Tenant filtering** relies on `availableTenants.find()` which can fail
- **"all" tenant** mode may show data across tenants

### 3. Real-time Updates
- **Reconnection logic** not implemented
- **Stale data** possible if subscription drops

## Performance Concerns

| Area | Issue |
|------|-------|
| Telemetry queries | No pagination on large datasets |
| Chart rendering | `DeviceHistoryChart` may lag with 1000+ points |
| MQTT parsing | JSON.parse in n8n can fail silently |
| Bundle size | No code splitting (single bundle) |

## Missing Features

| Feature | Priority |
|---------|----------|
| Offline support | HIGH |
| Mobile responsive (critical screens) | HIGH |
| Report scheduling | MEDIUM |
| Device firmware OTA | LOW |
| Audit logging | MEDIUM |

## Code Quality

| Issue | Evidence |
|-------|----------|
| No TypeScript strict mode | `tsconfig.json` not shown |
| Minimal test coverage | 2 test files only |
| No CI/CD pipeline | Manual deploy |
| Large files (>200 lines) | `App.tsx:286` |

## Configuration Issues

| File | Problem |
|------|---------|
| `eslint.config.js` | May conflict with Prettier |
| `tailwind.config.cjs` | CommonJS vs ESM confusion |
| `.gitignore` | Missing some temp files |

## Deployment Notes

### Current Deploy Process
```bash
# Manual
npm run build
tar -czvf dashboard.tar.gz dist server.js package.json
scp dashboard.tar.gz root@109.123.240.215:/var/www/nikaotech
ssh root@109.123.240.215 "tar -xzvf dashboard.tar.gz && pm2 restart dashboard"
```

### Issues
- **No rollback mechanism**
- **No staging environment**
- **Manual process prone to error**

## Recommendations Priority

1. **HIGH**: Enable RLS policies properly, remove anon key exposure
2. **HIGH**: Complete Firestore → Supabase migration
3. **MEDIUM**: Add pagination to telemetry queries
4. **MEDIUM**: Improve test coverage
5. **LOW**: Set up proper CI/CD pipeline