# STACK - Technology Stack

**Last Mapped:** 2026-05-09  
**Project:** IoT Sensor Monitoring System

## Frontend Dashboard

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI Framework |
| TypeScript | ~5.9.3 | Type Safety |
| Vite | 7.3.1 | Build Tool |
| TailwindCSS | 3.4.19 | Styling |
| Recharts | 3.7.0 | Data Visualization |
| Framer Motion | 12.35.2 | Animations |
| Lucide React | 0.575.0 | Icons |

### State Management
- **React Context** (AuthContext, TenantContext, NotificationContext)
- Custom hooks: `useMqttData`, `useTelemetryData`, `useSupabaseData`, `useSettings`

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.101.0",
  "mqtt": "^5.15.0",
  "firebase": "^12.10.0",
  "cors": "^2.8.6",
  "express": "^5.2.1"
}
```

## Backend / Integrations

| Component | Technology | Purpose |
|-----------|------------|---------|
| n8n | Workflow Automation | MQTT processing, database logging |
| Supabase | PostgreSQL + Realtime | Data storage, RLS, Realtime subscriptions |
| Firebase | Auth + Firestore | User authentication |
| MQTT Broker | - | ESP32 sensor data ingestion |

## ESP32 Firmware

| Component | Technology |
|-----------|------------|
| Arduino Framework | C++ |
| PlatformIO | Build system |
| WiFi/MQTT | Connectivity |

## Deployment

| Environment | Target |
|-------------|--------|
| Dashboard | VPS (109.123.240.215) via PM2 |
| n8n | Self-hosted |
| Supabase | Cloud (ueyizghzblngswgukfmr) |

## File Structure Summary

```
sensor/
├── dashboard/           # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # Auth, Tenant, Notification
│   │   ├── hooks/       # useMqttData, useSupabaseData
│   │   ├── services/    # TelemetryService, SupabaseMapper
│   │   ├── supabase/    # DB configuration
│   │   └── firebase/    # Auth configuration
│   └── server.js        # Express proxy server
├── n8n_*.json           # n8n workflow exports
├── supabase_schema.sql  # Database schema
└── esp32/              # ESP32 firmware
```