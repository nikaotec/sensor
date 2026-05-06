# PROJECT.md — IoT Sensor Monitoring Platform

## O que é isso

Sistema multi-tenant de monitoramento IoT industrial para temperatura, tensão, bateria e porta. Centenas de dispositivos ESP32 em campo enviando telemetria via MQTT (EMQX v5) para um dashboard React/TypeScript com persistência no Supabase. Alertas críticos entregues via WhatsApp (Evolution API) orquestrados pelo n8n.

## Core Value

**Operadores de instalações industriais recebem alertas confiáveis e controlam remotamente dispositivos ESP32** — sem falsos positivos, sem alarmes que não silenciam, sem intervenção técnica presencial para atualizações de firmware.

## Contexto

- **Projeto:** brownfield — codebase funcionando em produção
- **Clientes:** Múltiplos tenants (empresas), centenas de dispositivos em campo
- **Stack:** ESP32 C++ | EMQX v5 MQTT | React 19 + TypeScript | Supabase | Firebase Auth | n8n | Evolution API
- **Arquitetura Dashboard:** Clean Architecture (domain / application / infrastructure / components)
- **Última atividade:** Bug de alarm flags (chkVolt/chkBat/chkTemp/chkDoor) em campo, parcialmente trabalhado

## Problema Principal

Dispositivos em campo emitem alarme físico (buzzer) mesmo quando o operador desabilita o alarme no dashboard. O `AlertManager.cpp` não verifica corretamente as flags de habilitação de alarme (`chkVolt`, `chkBat`, `chkTemp`, `chkDoor`) antes de disparar ou continuar um alarme. Isso afeta centenas de dispositivos e não há mecanismo de atualização OTA — firmware atualizado apenas via cabo USB.

## Objetivos do Ciclo

1. **Corrigir o bug de alarm flags** — comportamento correto: flag desabilitada = sem alarme físico nem notificação MQTT
2. **Implementar OTA firmware** — viabilizar atualização de centenas de devices sem visita técnica
3. **Aumentar cobertura de testes** — garantir que a lógica crítica não reegride
4. **Refatorar componentes gigantes** — DeviceDetails (89KB), ManagerPanel (71KB), Reports (59KB)
5. **Migrar para React Router** — URLs que refletem a tela para bookmark e deep-link
6. **Consolidar bancos de dados** — eliminar dual PostgreSQL (Supabase + EMQX) com fonte de verdade única
7. **Segurança** — remover credenciais hardcoded do firmware e scripts de deploy

## Requirements

### Validated (já existente e funcionando)

- ✓ Telemetria MQTT em tempo real via EMQX v5 WebSocket — `EmqxMqttService` com backoff exponencial
- ✓ Persistência de dispositivos, eventos e relatórios no Supabase
- ✓ Firebase Authentication com RBAC (admin / manager / user)
- ✓ Multi-tenant (tenants isolados por empresa)
- ✓ Dashboard React com Recharts (gráficos históricos)
- ✓ Alertas MQTT com som (Web Audio API) e notificação WhatsApp
- ✓ Configuração remota de thresholds e relés via MQTT
- ✓ Geração de relatórios PDF via n8n webhook
- ✓ Clean Architecture no frontend (domain → application → infrastructure)
- ✓ Firmware ESP32 com 4 relés, sensores de temperatura/umidade/tensão/bateria/porta
- ✓ EEPROM persistência de configurações no firmware

### Active (a implementar neste ciclo)

- [ ] Alarm flags respeitadas pelo firmware (chkVolt/chkBat/chkTemp/chkDoor)
- [ ] Silenciar via dashboard para esta ocorrência (buzzer para, volta se condição persistir)
- [ ] OTA firmware update via WiFi (ArduinoOTA ou ESP-IDF OTA)
- [ ] Rollout staged de firmware (lote por lote, não todos de una vez)
- [ ] Testes unitários para hooks críticos (useMqttData, useSupabaseData)
- [ ] Testes de componente para DeviceDetails e ManagerPanel
- [ ] Decomposição de god components (DeviceDetails, ManagerPanel, Reports)
- [ ] React Router v7 com rotas tipadas
- [ ] Fonte única de verdade para telemetria (consolidar Supabase + EMQX PostgreSQL)
- [ ] Remoção de credenciais hardcoded (WiFi, MQTT) do firmware
- [ ] Lazy loading de componentes pesados (React.lazy + Suspense)

### Out of Scope

- App mobile nativo — não mencionado pelo usuário neste ciclo
- Novos tipos de sensor além dos já suportados — não prioridade
- Migração de banco de dados (troca de Supabase ou Firebase) — risco alto, fora do escopo
- Rewrite completo do firmware em ESP-IDF — muito disruptivo

## Key Decisions

| Decisão | Rationale | Outcome |
|---------|-----------|---------|
| OTA antes do rollout do bugfix | Centenas de devices, sem rollback, sem OTA = risco operacional insustentável | — Pending |
| React Router v7 (não v6) | Já compatível com React 19, suporte a rotas tipadas | — Pending |
| Manter Supabase como fonte de verdade | EMQX PostgreSQL é intermediário, não substituto | — Pending |
| Granularidade fina (8-12 fases) | Projeto crítico em produção: mudanças pequenas e verificáveis | — Confirmado |
| Modo interativo | Confirmação a cada fase para produção com centenas de devices | — Confirmado |

## Evolution

Este documento evolui a cada transição de fase.

**Após cada fase:**
1. Requisitos invalidados? → Mover para Out of Scope com razão
2. Requisitos validados? → Mover para Validated com referência da fase
3. Novos requisitos? → Adicionar em Active
4. Decisões a registrar? → Adicionar em Key Decisions

---
*Último update: 2026-05-05 — inicialização do projeto*
