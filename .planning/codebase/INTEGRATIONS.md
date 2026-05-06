# INTEGRATIONS.md — Sensor IoT Dashboard
<!-- last_mapped: 2026-05-05 -->

## Mapa de Integrações

```
ESP32 ──MQTT 1883──► EMQX v5 ──Rule Engine──► PostgreSQL (telemetria)
                         │                 └──► n8n Webhook ──► WhatsApp (Evolution API)
                         │
                    WebSocket 8083/8084
                         │
                    Dashboard React
                    ├── Supabase (devices_status, events, reports)
                    └── Firebase Auth (usuários)
```

---

## 1. EMQX v5 (Broker MQTT)

| Atributo | Valor |
|----------|-------|
| **Host** | `mqtt.nikaotech.com` |
| **Porta TCP** | 1883 (ESP32) |
| **Porta WS** | 8083 (Dashboard HTTP) |
| **Porta WSS** | 8084 (Dashboard HTTPS) |
| **Auth** | Username/Password |
| **Usuário ESP32** | `esp32_device` / `EmqxDevice@2025` |
| **Usuário Dashboard** | Configurado em `.env` via `VITE_EMQX_USER` |
| **Tópicos** | `telemetria/{device_id}`, `esp32c3/#`, `nikaotec/#` |

### Como o Dashboard conecta
- `dashboard/src/infrastructure/EmqxMqttService.ts` — singleton `emqxMqttService`
- Usa lib `mqtt` v5 com WebSocket
- Backoff exponencial: `[1s, 2s, 4s, 8s, 16s, 30s]`
- QoS 1 por padrão para publicações

### Comandos MQTT enviados pelo Dashboard → ESP32
| Tópico | Payload | Ação |
|--------|---------|------|
| `esp32c3/web/action` | `{"acao":"silenciar", "ID_DISPOSITIVO":"..."}` | Silencia alarme |
| `esp32c3/web/action` | `{"acao":"configurar_rele", ...}` | Configura relay |
| `esp32c3/web/action` | `{"acao":"configurar", ...}` | Atualiza thresholds |
| `esp32c3/web/action` | `{"acao":"ligar_alarme"/"desligar_alarme", "tipo":"..."}` | Toggle alarme (chkVolt/chkBat/chkTemp/chkDoor) |

---

## 2. Supabase (PostgreSQL gerenciado)

| Atributo | Valor |
|----------|-------|
| **SDK** | `@supabase/supabase-js` ^2.101 |
| **Config** | `dashboard/src/supabase/config.ts` |
| **Auth** | Firebase (NÃO Supabase Auth) |

### Tabelas Principais
| Tabela | Propósito |
|--------|-----------|
| `devices_status` | Estado atual dos dispositivos (telemetria + config) |
| `events` | Log de alertas e eventos (audit) |
| `telemetry_history` | Histórico de leituras (intervalo por device_id) |
| `reports` / `report_configs` | Configurações de relatórios PDF |
| `tenants` | Multi-tenant (empresa/cliente) |
| `users` | Usuários com roles (admin/manager/user) |

### Repositórios Supabase
- `SupabaseDeviceRepository.ts` — CRUD de dispositivos
- `SupabaseTelemetryRepository.ts` — Histórico de telemetria
- `SupabaseEventRepository.ts` — Log de eventos
- `SupabaseUserRepository.ts` — Gestão de usuários
- `SupabaseReportRepository.ts` — Relatórios

---

## 3. Firebase

| Atributo | Valor |
|----------|-------|
| **SDK** | `firebase` ^12.10 |
| **Config** | `dashboard/src/firebase/` |
| **Uso** | Exclusivamente Firebase Authentication |
| **Providers** | Email/Password |
| **Firestore** | Configurado mas Firebase Auth é o principal |

---

## 4. n8n (Orquestração de Workflows)

### Workflows no Repositório
| Arquivo | Função |
|---------|--------|
| `mqtt receive.json` | Recebe telemetria MQTT, persiste no Supabase |
| `n8n_alerta_temperatura_critica.json` | Alerta crítico de temperatura |
| `n8n_dashboard_actions.json` | Ações do dashboard (comandos MQTT → ESP32) |
| `n8n_events_logger.json` | Logger de eventos no Supabase |
| `n8n_hourly_snapshot.json` | Snapshot horário de telemetria |
| `n8n_hourly_telemetry.json` | Telemetria horária |
| `gerador-relatorios-pdf.json` | Geração de PDF via Puppeteer |

### Webhook para alertas
- EMQX Rule Engine dispara webhook n8n quando telemetria chega (`emqx/rule_telemetria.sql`)
- n8n processa e envia WhatsApp via Evolution API

---

## 5. Evolution API (WhatsApp)

| Atributo | Valor |
|----------|-------|
| **Localização** | `evolution-api-main/` (Docker completo) |
| **Proxy** | nginx-docker.conf |
| **Propósito** | Envio de alertas WhatsApp |

---

## 6. Nginx (Reverse Proxy)

- Arquivo: `evolution-api-main/nginx-docker.conf`
- Proxy para Evolution API
- Headers CORS configurados (historicamente causou bug de duplicate `Access-Control-Allow-Origin`)

---

## 7. Servidor Express (Produção)

- Arquivo: `dashboard/server.js`
- Serve build estático do Vite
- Proxy de requisições para n8n (relatórios PDF)
- Resolve CORS em ambiente de produção
