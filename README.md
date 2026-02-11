# Monitoramento de Temperatura IoT - Secretaria de Saúde PE (v2.0)

Este projeto evoluiu de um monitor simplificado para uma plataforma multi-dispositivo profissional com dashboard web e automação via IA.

## 🏗️ Arquitetura Moderna
1. **IoT Edge (ESP32)**: Captive Portal para configuração, identificação única por MAC e comunicação MQTT dinâmica.
2. **Backend Bridge (Node.js/PostgreSQL)**: Recebe dados MQTT e armazena em série temporal no PostgreSQL (tabelas `readings` e `devices`).
3. **Web Dashboard (React/Vite)**: Interface premium em tempo real com gráficos históricos e status de todos os dispositivos.
4. **AI Automation (n8n)**: 
   - **Memória de Chat**: Robô WhatsApp com memória contextual (PostgreSQL).
   - **Alertas Preditivos**: Detecção de subida rápida de temperatura.
   - **Relatórios VIP**: Geração de PDF com gráficos (Chart.js) e insights de IA.

## 🔒 Hardening & Segurança
- **Identidade Única**: MQTT baseada no endereço MAC do hardware.
- **Provisionamento Dinâmico**: Sem senhas WiFi hardcoded (WiFiManager).
- **Banco de Dados**: Migração completa de Google Sheets para PostgreSQL local.
- **Memória de Conversa**: Histórico de chat persistente para assistente IA.

## ⚙️ Configuração Rápida

### 1. Banco de Dados & Backend
```bash
cd backend
npm install
docker-compose up -d  # Sobe o Postgres
npm start             # Inicia o Bridge MQTT
```

### 2. Dashboard
```bash
cd frontend
npm install
npm run dev
```

### 3. n8n
- Importe os arquivos `.json` na pasta raiz.
- Configure as variáveis `WEBHOOK_TOKEN` e `WHATSAPP_NUMBERS`.

## 📋 Comandos WhatsApp Inteligentes
- "Como está a temperatura agora?"
- "O que aconteceu nos últimos 10 minutos?" (Memória IA)
- "Gere o relatório da última semana" (PDF com Gráfico + Resumo IA)
- "Ajuste o teto para 8 graus"

---
Projeto desenvolvido em parceria com a Secretaria de Saúde de Pernambuco para garantir a integridade da rede de frio e imunobiológicos.
