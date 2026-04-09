# Sessão de Trabalho: Nginx + MQTT + Dashboard VPS

## Contexto do Projeto
- **Domínio**: nikaotech.com
- **IP VPS**: 109.123.240.215
- **Cloudflare**: Ativo (SSL Flexible)
- **Stack**: ESP32 → MQTT → n8n → Dashboard

## Objetivo
Eliminar o n8n do caminho: ESP32 → MQTT Broker → Dashboard (direto)

## Progresso

### ✅ Concluído
1. Nginx configurado com proxy MQTT WebSocket
2. Mosquitto Docker escutando em 1883 e 9001
3. Cloudflare configurado

### ⚠️ Problema Atual
O dashboard (server.js) tenta usar porta 80, mas nginx já usa. Precisa mudar para porta 4000.

### 📋 Próximos Passos
1. Mudar server.js para usar PORT=4000
2. Testar dashboard via nginx
3. Configurar ESP32 para MQTT WebSocket SSL
4. Configurar dashboard para conectar via WebSocket

## Configurações Atuais

### Nginx (/etc/nginx/sites-available/mqtt-proxy)
```nginx
server {
    listen 80;
    server_name nikaotech.com www.nikaotech.com;
    
    location /mqtt {
        proxy_pass http://172.18.0.1:9001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Host $host;
    }
}
```

### PM2 Status
- dashboard: errored (porta 80 em uso)

### Docker Mosquitto
- Porta 1883 (MQTT)
- Porta 9001 (WebSocket)
- Rede: evolution-net (IP: 172.18.0.x)

## Arquivos de Referência
- `/media/venancio/.../sensor/docs/nginx-mqtt-proxy.conf` - config nginx
- `/media/venancio/.../sensor/esp32/Config.h` - config ESP32
- `/media/venancio/.../sensor/dashboard/src/hooks/useMqttData.ts` - MQTT client

---

# Atualização: Correção Hourly Telemetry (07/04/2026)

## Problema Identificado
O sistema de logging hourly não estava funcionando corretamente porque:
1. Os workflows n8n usavam campo `TEMP_ATUAL` que não existe no payload do ESP32
2. O ESP32 envia `TEMP_C` (temperatura atual), `TEMP_MAX` e `TEMP_MIN`
3. A tabela `telemetry` não tinha colunas para temp_max e temp_min

## Correções Aplicadas

### 1. n8n_hourly_telemetry_supabase.json
- Corrigido campo `TEMP_ATUAL` → `TEMP_C`
- Adicionados campos `temp_max` e `temp_min` no insert

### 2. supabase_schema.sql
- Adicionadas colunas `temp_max REAL` e `temp_min REAL` na tabela telemetry

### 3. add_telemetry_columns.sql (novo)
- Script SQL para adicionar colunas em banco existente

### 4. n8n_mqtt_to_supabase.json
- Corrigido campo `TEMP_ATUAL` → `TEMP_C` no devices_status upsert
- Adicionados campos `temp_max` e `temp_min` no devices_status upsert
- Corrigido campo `TEMP_ATUAL` → `TEMP_C` no telemetry insert
- Adicionados campos `temp_max` e `temp_min` no telemetry insert

### 5. ESP32 (esp32.ino)
- Já envia corretamente `TEMP_C`, `TEMP_MAX`, `TEMP_MIN` no evento "periodico"
- Verificado nas linhas 872-874

## Ação Requerida no Supabase
Execute o SQL em `add_telemetry_columns.sql` no SQL Editor do Supabase:
```sql
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS temp_max REAL;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS temp_min REAL;
```

## Skills Utilizadas
- **n8n-workflow-patterns**: Para entender o padrão de scheduled tasks e database operations
- **n8n-node-configuration**: Para configurar corretamente os nodes Supabase com os campos necessários