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