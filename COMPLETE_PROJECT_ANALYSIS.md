# Sistema IoT SmartRF - Análise Completa do Projeto

## Visão Geral do Sistema

Sistema IoT de monitoramento de temperatura, umidade, tensão e bateria para câmaras frias e refrigeradores comerciais. O projeto é composto por firmware ESP32-C3, workflows n8n, banco de dados Supabase e dashboard React.

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ARQUITETURA SmartRF                              │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐         WiFi + MQTT         ┌───────────────┐
  │              │   ──────────────────────▶   │               │
  │   ESP32-C3   │                           │   Mosquitto    │
  │   Sensores  │                           │   (Docker)     │
  │              │                           │               │
  └──────────────┘                           └───────────────┘
       │                                            │
       │                                            ▼
       │                                    ┌───────────────┐
       │                                    │     n8n      │
       │                                    │  Workflows   │
       │                                    └───────┬───────┘
       │                                            │
       ▼                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         TÓPICOS MQTT                                    │
│  esp32c3/data           - Telemetria principal                         │
│  esp32c3/dashboard    - Dados para dashboard                        │
│  esp32c3/web_status/action - Status tempo real web                  │
│  esp32c3/status/action - Comandos (WhatsApp)                       │
└─────────────────────────────────────────────────────────────────────┬───────────┘
                                                         │
                                                         ▼
                                              ┌──────────────────────┐
                                              │     SUPABASE         │
                                              │  PostgreSQL + Realtime│
                                              │  ueyizghzblngswgukfmr│
                                              └──────────┬───────────┘
                                                         │
                    ┌────────────────────────────────────┼────────────────────┐
                    ▼                                    ▼                    ▼
          ┌──────────────────┐              ┌──────────────────┐      ┌──────────────────┐
          │   DASHBOARD     │              │   WhatsApp Bot   │      │   Relatórios     │
          │   (React)       │              │ (Evolution API)  │      │   (PDF)          │
          └──────────────────┘              └──────────────────┘      └──────────────────┘
```

## 2. Hardware ESP32-C3

### 2.1 Pinagem GPIO

| Pino | Função | Hardware |
|------|--------|----------|
| GPIO 13 | DS18B20 | Sensor temperatura 1-Wire |
| GPIO 23 | Relé 0 | Compressor/Motor |
| GPIO 19 | Relé 1 | Reservado |
| GPIO 18 | Relé 2 | Reservado |
| GPIO 5 | Relé 3 | Reservado |
| GPIO 35 | ZMPT101B | Sensor tensão AC (ADC) |
| GPIO 34 | Bateria | Divisor tensão bateria |
| GPIO 32 | Porta | Sensor magnético |
| GPIO 14 | Buzzer | Alarme sonoro |
| GPIO 0 | DHT11/AHT10 | Temp/umidade ambiente |
| GPIO 21 | I2C SDA | PCF8574 + AHT10 |
| GPIO 22 | I2C SCL | PCF8574 + AHT10 |

### 2.2 Endereços I2C

- PCF8574: 0x20 (expansor de botões)
- AHT10: 0x38 (temperatura/umidade)

### 2.3 Estrutura de Arquivos do Firmware

```
esp32/
├── esp32.ino              # Programa principal (1185 linhas)
├── Config.h               # Constantes, pinos, estruturas
├── DisplayManager.h/cpp # Display OLED SH1106
├── StorageManager.h/cpp  # Persistência EEPROM
├── AppNetworkManager.h/cpp # WiFi + MQTT
├── VoltageSensor.h/cpp  # ZMPT101B + bateria (FreeRTOS)
├── AmbientSensor.h      # AHT10 (temp/umidade I2C)
├── BatterySensor.h       # Leitura bateria (deprecated)
├── ButtonManager.h       # PCF8574 botões
└── AlertManager.h/cpp   # Debounce de alertas
```

### 2.4 Sistema de sensores

**DS18B20 (Temperatura interna)**
- Protocolo 1-Wire
- Biblioteca DallasTemperature
- Offset de calibração ajustável

**AHT10 (Temperatura/umidade ambiente)**
- Protocolo I2C
- Endereço 0x38
- Precisão: ±0.3°C, ±2% UR

**ZMPT101B (Tensão AC)**
- Sensor transformador de corrente
- Leitura via ADC com algoritmo Welford RMS
- Task FreeRTOS dedicada no Core 0
- 100ms de amostragem (~10000 amostras)
- Filtro EMA com alpha = 0.3

**Bateria**
- Divisor de tensão resistor
- Leitura sequencial na mesma task do VoltageSensor

### 2.5 Sistema de Alertas (AlertManager)

```cpp
enum AlertStatus {
    ALERT_NONE,        // Sem mudança
    ALERT_STARTED,     // Alerta detectado após debounce
    ALERT_REPEATED,    // Alerta ativo, intervalo cumprido
    ALERT_NORMALIZED   // Condição normalizada
};
```

- Tempo de debounce: 5000ms (padrão)
- Intervalo de repetição: 1000ms (padrão)
- Tipos: Temperatura alta/baixa, Tensão alta/baixa, Bateria baixa, Falta energia, Porta aberta

### 2.6 Controle de Relés

4 relés com três modos:
- OFF (0): Desativado
- AUTO (1): Controle automático por temperatura
- MANUAL (2): Controle manualLigado/Desligado

Histerese configurável por relé (tempOn/tempOff)

### 2.7 Payload MQTT (esp32c3/data)

```json
{
  "TIPO": "REALTIME",
  "DISPOSITIVO": "ESP32 Sensor",
  "ID_DISPOSITIVO": "AABBCCDDEEFF",
  "EMPRESA": "Nome da Empresa",
  "TEMP_C": 25.0,
  "TEMP_MAX": 26.5,
  "TEMP_MIN": 24.0,
  "UMIDADE": 60,
  "BATERIA": 12.5,
  "VOLTAGEM": 220.0,
  "RSSI": -45,
  "PORTA": "FECHADA",
  "CHK_VOLT": true,
  "CHK_BAT": true,
  "CHK_TEMP": true,
  "CHK_DOOR": true,
  "RELES": {"R0": false, "R1": false, "R2": false, "R3": false},
  "IS_REPEAT": false
}
```

### 2.8 Comandos MQTT suportados

| Comando | Parâmetros | Descrição |
|---------|------------|-----------|
| configurar_limites | temp_max, temp_min, volt_max, volt_min, bat_min | Define limites |
| modo_manutencao | - | Ativa modo manutenção |
| modo_operacional | - | Desativa modo manutenção |
| silenciar_alarme | - | Silencia alertas |
| reativar_alarme | - | Reativa alertas |
| calibrar_tensao | nova_tensao | Calibra tensão |
| calibrar_bateria | nova_tensao | Calibra bateria |
| calibrar_temperatura | offset | Ajusta offset |
| configurar_rele | rele_index, func, temp_on, temp_off | Config relé |
| ligar_rele | rele_index | Liga relé |
| desligar_rele | rele_index | Desliga relé |
| habilitar_tensao | - | Habilita monitoramento |
| desabilitar_tensao | - | Desabilita monitoramento |
| habilitar_bateria | - | Habilita monitoramento |
| desabilitar_bateria | - | Desabilita monitoramento |
| habilitar_porta | - | Habilita monitoramento |
| desabilitar_porta | - | Desabilita monitoramento |
| alterar_nome | novo_nome | Altera nome dispositivo |
| obter_status_atual | - | Retorna status completo |
| obter_ambiente | - | Retorna temp/umidade |

### 2.9 Display OLED (SH1106 128x64)

Layout:
- Linha 1: HH:MM:SS | Tensão | WiFi RSSI
- Linha 2-3: Temperatura grande (24pt)
- Linha 4: Máx/Mín registradas
- Linha 5: Divisor
- Linha 6: Mensagem de rodapé (paging)

Menu local (5 opções):
1. SET_TEMP_MAX - Ajustar limite alta
2. SET_TEMP_MIN - Ajustar limite baixa
3. TOGGLE_ALARM - Habilitar/desabilitar
4. TEST_RELAY - Testar primeiro relé
5. RESET_WIFI - Resetar WiFi

## 3. Banco de Dados Supabase

### 3.1 Tabelas

**users**
```sql
id TEXT PRIMARY KEY,           -- Firebase UID
name TEXT,
email TEXT UNIQUE,
phone TEXT,
role TEXT DEFAULT 'admin',    -- admin, manager, gestor, user, viewer
tenant_ids TEXT[],            -- Array de UUIDs
avatar_url TEXT,
created_at TIMESTAMPTZ,
provisioned_by TEXT
```

**tenants**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
status TEXT DEFAULT 'active',
plan TEXT DEFAULT 'pro',
colors JSONB,
created_at TIMESTAMPTZ
```

**devices_status**
```sql
id TEXT PRIMARY KEY,           -- MAC address
name TEXT,
tenant_id TEXT,
status TEXT DEFAULT 'offline',
location TEXT,
last_seen TIMESTAMPTZ,
temperature REAL,
humidity REAL,
battery REAL,
voltage REAL,
signal INTEGER,
door_open BOOLEAN,
temp_max REAL,
temp_min REAL,
temp_ext REAL,
updated_at TIMESTAMPTZ
```

**telemetry**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
device_id TEXT NOT NULL,
temperature REAL,
temp_max REAL,
temp_min REAL,
humidity REAL,
battery REAL,
voltage REAL,
signal INTEGER,
timestamp TIMESTAMPTZ DEFAULT NOW()
```

**events**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
device_id TEXT,
tenant_id TEXT,
type TEXT,
msg TEXT,
message TEXT,
severity TEXT,               -- critical, warning, info
value TEXT,
details JSONB,
user_name TEXT,
user_email TEXT,
source TEXT,
timestamp TIMESTAMPTZ DEFAULT NOW(),
created_at TIMESTAMPTZ DEFAULT NOW()
```

### 3.2 Índices

```sql
CREATE INDEX idx_telemetry_device_time ON telemetry(device_id, timestamp DESC);
CREATE INDEX idx_events_device_time ON events(device_id, timestamp DESC);
CREATE INDEX idx_events_tenant_time ON events(tenant_id, timestamp DESC);
CREATE INDEX idx_devices_tenant ON devices_status(tenant_id);
```

### 3.3 Realtime

Tabelas habilitadas:
- devices_status
- telemetry
- events
- tenants
- users

## 4. Workflows n8n

### 4.1 Principais workflows

| Workflow | Gatilho | Função |
|----------|---------|--------|
| n8n_mqtt_to_supabase | MQTT | Telemetria em tempo real |
| n8n_events_logger_supabase | MQTT | Log de alertas |
| n8n_dashboard_actions_supabase | MQTT | Ações do dashboard |
| n8n_hourly_telemetry_supabase | MQTT | Filtro periódicos |
| n8n_hourly_snapshot_supabase | Schedule | Snapshots horários |
| gerador-relatorios-pdf | Webhook | Geração PDF |
| mqtt receive | Webhook | Bot WhatsApp completo |

### 4.2 Fluxo n8n_mqtt_to_supabase

```
MQTT Trigger (esp32c3/data, esp32c3/dashboard)
    ↓
Parse Payload (Code) - JSON.parse
    ↓
Validate Data (IF) - Verifica DISPOSITIVO e ID_DISPOSITIVO
    ↓
Upsert devices_status (Supabase)
    ↓
Insert telemetry (Supabase)
    ↓
Publish sensor/telemetry/data (MQTT)
```

### 4.3 Fluxo do Bot WhatsApp (mqtt receive)

```
Webhook (POST /esp32)
    ↓
Validate Message (IF) - fromMe=false
    ↓
Edit Fields - Extrai conversation, remoteJid
    ↓
Get row(s) in sheet1 (Google Sheets) - Valida usuário
    ↓
AI Agent (OpenRouter) - Classifica intenção
    ↓
Code (Parse + Permission Check)
    ↓
Switch Validation - Roteia por destino
    ├── whatsapp → Responder via Evolution API
    ├── mqtt → Publicar comando
    └── sheets → Gerenciar usuários
```

Intenções suportadas:
- adicionar_usuario, alterar_regra_usuario, excluir_usuario
- configurar_limites, ligar_rele, desligar_rele
- modo_manutencao, modo_operacional, silenciar_alarme
- calibrar_tensao, calibrar_bateria
- obter_status_atual, consultar_relatorio

## 5. Dashboard React

### 5.1 Stack Tecnológico

- **Framework:** React 19.2.0
- **Build:** Vite 7.3.1
- **Linguagem:** TypeScript 5.9.3
- **Estilização:** TailwindCSS 3.4.19
- **Gráficos:** Recharts 3.7.0
- **MQTT:** mqtt.js 5.15.0
- **Auth:** Firebase 12.10.0
- **Banco:** Supabase 2.101.0
- **Animações:** Framer Motion 12.35.2
- **Ícones:** Lucide React 0.575.0

### 5.2 Estrutura de Diretórios

```
dashboard/src/
├── App.tsx                    # Componente raiz
├── main.tsx                   # Entry point
├── index.css                  # Estilos globais
├── contexts/
│   ├── AuthContext.tsx        # Firebase Auth
│   ├── TenantContext.tsx      # Multi-tenant
│   └── NotificationContext.tsx # Notificações toast
├── hooks/
│   ├── useMqttData.ts         # MQTT WebSocket
│   ├── useSupabaseData.ts     # Supabase queries
│   ├── useTelemetryData.ts     # Dados agregados
│   ├── useSettings.ts         # Configurações
│   └── useReportGenerator.ts  # Relatórios
├── components/
│   ├── Dashboard.tsx         # Visão principal
│   ├── DeviceList.tsx        # Lista dispositivos
│   ├── DeviceDetails.tsx     # Detalhes + gráficos
│   ├── Alerts.tsx            # Histórico alertas
│   ├── Reports.tsx          # Relatórios
│   ├── Settings.tsx          # Configurações
│   ├── Login.tsx            # Login
│   ├── SignUp.tsx           # Cadastro
│   ├── ManagerPanel.tsx     # Painel gerenciador
│   └── AdminUserPanel.tsx   # Admin usuários
├── data/
│   └── mockData.ts          # Types + mock data
├── firebase/
│   └── config.ts             # Firebase setup
└── supabase/
    └── config.ts            # Supabase setup
```

### 5.3 Contextos

**AuthContext**
- signIn(email, password)
- signInWithGoogle()
- signOut()
- createAccount(email, password)
- Roles: admin, manager, gestor, user, viewer

**TenantContext**
- Gerenciamento multi-tenant
- Filtro por role:
  - manager/gestor/admin: Todos os tenants
  - user/viewer: Apenas tenants atribuídos

**NotificationContext**
- Sistema de toast notifications
- Max 10 simultâneas
- Deduplicação por device_id + tipo
- Auto-dismiss 5 segundos

### 5.4 Sistema de Áudio de Alerta

```typescript
// Sirene de dois tons: 880Hz + 554Hz
// Alterna a cada 250ms
// Web Audio API
```

### 5.5 useMqttData Hook

Conexão WebSocket MQTT:
- Broker: wss://nikaotech.com/mqtt
- Tópicos: sensor/telemetry/#, esp32c3/#

Sistema de Device Lock:
- 30 segundos de lock para name/tenant overrides
- Armazenado em localStorage

## 6. Fluxo de Dados

### 6.1 Telemetria

```
Sensores → ESP32 → MQTT (esp32c3/data)
    → Mosquitto → n8n
    → Supabase (devices_status + telemetry)
    → Dashboard (Supabase Realtime + MQTT WebSocket)
    → UI React (atualização tempo real)
```

### 6.2 Alertas

```
Condição detectada (ESP32)
    → AlertManager (debounce 5s)
    → MQTT (esp32c3/data com TIPO=ALERTA_*)
    → n8n_events_logger_supabase
    → Supabase (events table)
    → Dashboard (toast + áudio sirene)
```

### 6.3 Comandos

```
Usuário (WhatsApp/Dashboard)
    → Evolution API
    → n8n mqtt receive
    → AI Agent (classificação)
    → MQTT (esp32c3/status/action)
    → ESP32 (MQTT Callback)
    → Execução comando
    → Feedback (Display + MQTT)
```

## 7. Integrações

### 7.1 MQTT (Mosquitto)

- Docker: eclipse-mosquitto
- Portas: 1883 (MQTT), 9001 (WebSocket)
- Sem autenticação (dev)

### 7.2 Supabase

- URL: https://ueyizghzblngswgukfmr.supabase.co
- Pooler: ueyizghzblngswgukfmr.supabase.co:6543

### 7.3 Firebase

- Projeto: smartrf-f9962
- Serviços: Authentication + Firestore (legacy)

### 7.4 Evolution API (WhatsApp)

- Instância: sensor_temperatura
- Endpoints:
  - POST /message/sendText/{instance}
  - POST /message/sendFile/{instance}

### 7.5 Google Sheets

- Documento: 1HTEAOfzwIQqUdf3bywOHMFVmktT3N51mtiLzpbP3Lm4
- Aba: users_casinhas
- Colunas: NUMERO, RULE

### 7.6 OpenRouter (AI)

- Modelo: qwen/qwen3-235b-a22b-2507
- Uso: Classificação de intenções WhatsApp

## 8. Configurações

### 8.1 Variáveis de Ambiente

**Dashboard**
```
VITE_SUPABASE_URL=https://ueyizghzblngswgukfmr.supabase.co
VITE_SUPABASE_ANON_KEY=<chave-anonima>
VITE_MQTT_BROKER_URL=wss://nikaotech.com/mqtt
```

**ESP32 (Config.h)**
```cpp
#define WIFI_SSID "VENANCIO"
#define WIFI_PASS "liza1980"
#define MQTT_SERVER "mqtt.nikaotech.com"
#define MQTT_PORT 1883
```

### 8.2 Parâmetros Padrão

```cpp
#define ALERT_DEBOUNCE 5000      // 5 segundos
#define ALERT_REPEAT 1000       // 1 segundo

#define DEFAULT_ALARM_MAX 26.5    // °C
#define DEFAULT_ALARM_MIN 24.0    // °C
#define DEFAULT_VOLT_MAX 240.0   // V
#define DEFAULT_VOLT_MIN 200.0   // V
#define DEFAULT_BAT_MIN 11.5    // V
#define DEFAULT_DOOR_MAX 30     // segundos

#define VOLTAGE_CALIBRATION_DEFAULT 570.0
#define BATTERY_CALIBRATION_DEFAULT 5.28
```

### 8.3 VPS Deploy

- IP: 109.123.240.215
- Stack: Docker + Nginx + PM2
- Dashboard: Porta 4000 (nginx proxy)
- Nginx locations:
  - / → 127.0.0.1:4000
  - /mqtt → 172.18.0.1:9001
  - /api/n8n → n8n.nikaotech.com

## 9. Tipos de Evento

### 9.1 Tipos de Alerta (ESP32 → MQTT)

- ALERTA_TEMP_ALTA
- ALERTA_TEMP_BAIXA
- ALERTA_TENSAO_ALTA
- ALERTA_TENSAO_BAIXA
- ALERTA_BATERIA_BAIXA
- ALERTA_FALTA_ENERGIA
- ALERTA_PORTA_ABERTA
- NORMALIZADA

### 9.2 Tipos de Feedback

- REALTIME
- STATUS_SOLICITADO
- periodico
- relatorio_diario
- feedback_configuracao
- feedback_calibracao_sucesso
- MANUTENCAO_ATIVADA
- MANUTENCAO_DESATIVADA

### 9.3 Roles de Usuário

- admin - Acesso total
- manager - Acesso total
- gestor - Acesso total
- user - Acesso limitado
- viewer - Apenas visualização

### 9.4 Status de Dispositivo

- online - Enviando dados
- offline - Sem comunicação (5+ min)
- warning - Valor fora do normal
- error - Erro de comunicação

## 10. Estrutura deEEPROM

| Endereço | Tamanho | Conteúdo |
|----------|---------|----------|
| 0-3 | 4 bytes | tempMaxRec |
| 4-7 | 4 bytes | tempMinRec |
| 8-11 | 4 bytes | alarmMax |
| 12-15 | 4 bytes | alarmMin |
| 16-19 | 4 bytes | voltMax |
| 20-23 | 4 bytes | voltMin |
| 24-27 | 4 bytes | voltCalFactor |
| 28-31 | 4 bytes | batCalFactor |
| 32-35 | 4 bytes | batMinLimit |
| 36-39 | 4 bytes | doorMaxTime |
| 40 | 1 byte | chkVolt |
| 41 | 1 byte | chkBat |
| 42 | 1 byte | chkTemp |
| 43 | 1 byte | chkDoor |
| 44-47 | 4 bytes | tempCalOffset |
| 48-79 | 32 bytes | deviceName |
| 80-111 | 32 bytes | companyName |
| 112-143 | 32 bytes | deviceLocation |
| 144-167 | 24 bytes | Relay 0 |
| 168-191 | 24 bytes | Relay 1 |
| 192-215 | 24 bytes | Relay 2 |
| 216-239 | 24 bytes | Relay 3 |

## 11. Scripts SQL

### 11.1 Migrações

- add_telemetry_columns.sql - Adiciona colunas datetime
- add_alarm_columns.sql - Adiciona colunas alarm_max/min
- add_phone_column.sql - Adiciona coluna phone
- add_chk_columns.sql - Adiciona colunas chk_*
- migrate_telemetry_datetime.sql - Popula data_registro/hora_registro
- report_logs_table.sql - Cria tabela de logs
- create_report_configs.sql - Cria tabela de relatórios agendados
- apply_triggers.sql - Triggers de proteção

## 12. Resumo de Versões

- ESP32 Core: 2.0.2+
- Arduino: 1.8.13+
- React: 19.2.0
- Vite: 7.3.1
- TypeScript: 5.9.3
- TailwindCSS: 3.4.19
- Supabase: 2.101.0
- MQTT.js: 5.15.0
- Firebase: 12.10.0

---

## Conclusão

O projeto SmartRF é um sistema IoT completo e funcional com:

1. **Firmware ESP32 modular** - Código bem estruturado com managers separados
2. **Workflows n8n completos** - Integração com múltiplos destinos
3. **Banco escalável** - Supabase com Realtime
4. **Dashboard responsivo** - React + Vite + Tailwind
5. **Integrações ricas** - WhatsApp, Firebase, Google Sheets

O sistema está pronto para uso em produção em pequena/média escala.