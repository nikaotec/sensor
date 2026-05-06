# STACK.md — Sensor IoT Dashboard
<!-- last_mapped: 2026-05-05 -->

## Visão Geral

Projeto multi-camada de IoT industrial: firmware em C++ no ESP32, broker MQTT EMQX v5, backend n8n + Supabase + Firebase, e dashboard React/TypeScript. Serve ao monitoramento de temperatura, tensão, bateria e porta para clientes multi-tenant (nikaotech.com).

---

## 1. Dashboard (Frontend)

| Item | Detalhes |
|------|----------|
| **Runtime** | Node.js v20+ (ESM) |
| **Framework** | React 19.2 |
| **Linguagem** | TypeScript ~5.9.3 (strict) |
| **Build** | Vite 7.3.1 + `@vitejs/plugin-react` 5.1.1 |
| **Estilização** | Tailwind CSS 3.4 + PostCSS + clsx + tailwind-merge |
| **Animações** | Framer Motion 12.35 |
| **Ícones** | lucide-react 0.575 |
| **Gráficos** | Recharts 3.7 |
| **Servidor (prod)** | Express 5.2 (`server.js`) + http-proxy-middleware |

### Dependências Principais
```json
"dependencies": {
  "@supabase/supabase-js": "^2.101.0",
  "firebase": "^12.10.0",
  "mqtt": "^5.15.0",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "recharts": "^3.7.0",
  "framer-motion": "^12.35.2",
  "lucide-react": "^0.575.0",
  "express": "^5.2.1"
}
```

### Dev / Testes
```json
"devDependencies": {
  "vitest": "^4.1.5",
  "@testing-library/react": "^16.3.2",
  "@testing-library/jest-dom": "^6.9.1",
  "jsdom": "^29.1.0",
  "typescript-eslint": "^8.48.0"
}
```

---

## 2. Firmware ESP32

| Item | Detalhes |
|------|----------|
| **Hardware** | ESP32 (Xtensa dual-core) / ESP32-C3 |
| **Linguagem** | C++ (Arduino) |
| **IDE** | Arduino IDE / PlatformIO |
| **MQTT lib** | PubSubClient |
| **Sensores** | DS18B20 (temp), AHT10/DHT11 (umidade), ZMPT101B (tensão), ADC (bateria) |
| **Display** | I2C (SDA=21, SCL=22), PCF8574 (expansor GPIO) |
| **Armazenamento** | EEPROM 256 bytes |
| **Atuadores** | 4× Relés (pinos 23, 19, 18, 5) + Buzzer (pino 14) |

---

## 3. Infra EMQX v5

| Item | Detalhes |
|------|----------|
| **Broker** | EMQX 5 (Docker) — `mqtt.nikaotech.com` |
| **Portas** | 1883 (TCP/MQTT), 8083 (WebSocket), 8084 (WSS) |
| **Auth** | Username/Password (`esp32_device` / `dashboard_*`) |
| **Rule Engine** | SQL → persist telemetria → PostgreSQL + webhook n8n |
| **Database** | PostgreSQL (embutido na stack EMQX Docker) |

---

## 4. Backend / Workflows

| Item | Detalhes |
|------|----------|
| **Orquestração** | n8n (workflows JSON no repo) |
| **Database principal** | Supabase (PostgreSQL gerenciado) |
| **Auth** | Firebase Authentication (Email/Password) |
| **Alertas** | WhatsApp via Evolution API (Docker) |
| **Nginx** | Reverse proxy (`nginx-docker.conf`) |

---

## 5. Scripts & Utilitários

| Arquivo | Propósito |
|---------|-----------|
| `dashboard/server.js` | Express prod server com proxy CORS |
| `patch_n8n_telemetry.py` | Patch de workflow n8n |
| `edit_dashboard.py` | Edição programática de componentes |
| `deploy_dashboard.sh` | Deploy SSH → VPS (root@109.123.240.215) |
| `supabase_schema.sql` | Schema base Supabase |
| `emqx/init_postgres.sql` | Schema PostgreSQL para EMQX Rule Engine |
| `emqx/rule_telemetria.sql` | SQL Rule Engine para persistência |
| `emqx/docker-compose.yml` | Stack EMQX + PostgreSQL |

---

## 6. Variáveis de Ambiente (Dashboard)

```env
VITE_EMQX_WS_URL=wss://mqtt.nikaotech.com:8084/mqtt   # ou ws://...:8083
VITE_EMQX_USER=<username>
VITE_EMQX_PASS=<password>
VITE_MQTT_BROKER_URL=<fallback>
# Firebase + Supabase configurados via firebase/ e supabase/config.ts
```

---

## 7. CI/CD & Deploy

- **Frontend**: `npm run build` → `tsc -b && vite build` → scp para VPS → `pm2 restart dashboard`
- **Firebase Hosting**: Alternativo via `firebase.json` + `deploy_dashboard.sh`
- **ESP32**: Flash manual via USB/Arduino IDE
- **n8n**: Workflows importados manualmente via UI
