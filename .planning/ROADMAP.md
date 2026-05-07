# ROADMAP.md — IoT Sensor Monitoring Platform

*Granularidade: Fina | Modo: Interativo | Criado: 2026-05-05*

---

## Milestone 1 — Estabilidade e Escalabilidade

> **Objetivo:** Resolver o bug crítico de alarm flags, viabilizar atualização remota de firmware em centenas de devices, e garantir a base de testes para não regredir.

---

### Fase 1 — Corrigir AlarmManager (Firmware)

**Objetivo:** O ESP32 deve respeitar as flags `chkVolt`, `chkBat`, `chkTemp`, `chkDoor` ao decidir disparar ou continuar um alarme. Desabilitar uma flag = sem buzzer, sem LED de alerta e sem notificação MQTT para aquele tipo.

**Planos:**
1. Auditar `AlertManager.cpp` — mapear todos os pontos onde alarme é disparado/sustentado sem checar flags
2. Implementar verificação de flag em todas as condições de alarme (disparar + continuar + silenciar)
3. Garantir que o comando `desligar_alarme` do dashboard persiste na EEPROM via `StorageManager`
4. Garantir que silenciar via dashboard para esta ocorrência não bloqueia futuros alarmes da mesma condição
5. Teste em bancada: simular cada condição com flag habilitada/desabilitada e verificar comportamento

**Critérios de Aceite:**
- [ ] `chkVolt = false` → tensão fora do limite não dispara buzzer nem envia MQTT
- [ ] `chkBat = false` → bateria crítica não dispara buzzer nem envia MQTT
- [ ] `chkTemp = false` → temperatura fora do limite não dispara buzzer nem envia MQTT
- [ ] `chkDoor = false` → porta aberta não dispara buzzer nem envia MQTT
- [ ] Silenciar via dashboard → buzzer para, flag permanece habilitada, novo ciclo pode disparar se condição persistir
- [ ] Todos os estados persistidos na EEPROM após reboot

---

### Fase 2 — OTA Firmware Update (Infraestrutura)

**Objetivo:** Implementar atualização de firmware Over-the-Air via WiFi no ESP32, sem necessidade de cabo USB. Pré-requisito para rollout seguro em centenas de devices.

**Planos:**
1. Integrar `ArduinoOTA` no `AppNetworkManager` — escutar atualizações após conexão WiFi
2. Adicionar autenticação OTA (senha) para evitar updates não autorizados
3. Implementar confirmação de versão via MQTT após update (`telemetria/{id}` com campo `fw_version`)
4. Adicionar watchdog reset caso o novo firmware trave antes de confirmar versão
5. Documentar processo de build e upload OTA

**Critérios de Aceite:**
- [ ] Dispositivo aceita novo .bin via ArduinoOTA na mesma rede WiFi
- [ ] Update protegido por senha
- [ ] Após update, dispositivo publica versão de firmware no tópico telemetria
- [ ] Dashboard exibe versão atual de firmware por dispositivo
- [ ] Watchdog ativo: se firmware não confirmar em X segundos, reboota para versão anterior (se possível via dual-bank)

---

### Fase 3 — Pipeline de Rollout de Firmware

**Objetivo:** Processo definido e seguro para atualizar centenas de dispositivos em campo de forma staged (lote por lote), com capacidade de monitorar sucesso/falha por device.

**Planos:**
1. Criar tópico MQTT `nikaotec/ota/command/{device_id}` para acionar OTA remoto
2. Criar endpoint n8n que envia comando OTA para lista de devices (com delay entre lotes)
3. Adicionar coluna `fw_version` e `last_ota_at` na tabela `devices_status` do Supabase
4. Adicionar painel de rollout no `ManagerPanel` (selecionar devices, acompanhar progresso)
5. Alertas de falha de OTA via WhatsApp (Evolution API) para o administrador

**Critérios de Aceite:**
- [ ] Admin pode selecionar grupo de devices e acionar OTA pelo dashboard
- [ ] Rollout em lotes configuráveis (ex: 10 devices por vez, 30s entre lotes)
- [ ] Dashboard exibe status em tempo real: `pendente`, `atualizando`, `atualizado`, `falhou`
- [ ] Falha de OTA gera alerta no painel e notificação WhatsApp ao admin

---

### Fase 4 — Cobertura de Testes (Crítica)

**Objetivo:** Garantir que a lógica de alarme e MQTT não regride. Cobertura mínima nas áreas de maior risco.

**Planos:**
1. Testes para `ProcessMqttUpdateUseCase` — cobrir merge seletivo, fuzzy match, edge cases
2. Testes para `EmqxMqttService` — reconexão com backoff, handler cleanup, publish sem conexão
3. Testes para `useMqttData` hook — alarmes, updates de telemetria, handlers de estado
4. Testes para `useSupabaseData` — carregamento de devices, erros de rede
5. Mock de `emqxMqttService` singleton para testes de hooks

**Critérios de Aceite:**
- [ ] `ProcessMqttUpdateUseCase`: >90% de cobertura de branches
- [ ] `EmqxMqttService`: estados de conexão e reconexão testados
- [ ] Hooks: mock correto de singleton, sem teste de integração real com MQTT
- [ ] `npm test` passa sem warnings
- [ ] Nenhum teste usa `any` sem justificativa

---

### Fase 5 — Segurança: Remover Credenciais Hardcoded

**Objetivo:** Eliminar credenciais WiFi, MQTT e deploy hardcoded no código-fonte, sem quebrar o processo de build/flash existente.

**Planos:**
1. Migrar WiFi SSID/PASS para EEPROM com provisioning via Serial (primeira configuração)
2. Migrar MQTT_USER/PASS para EEPROM com provisioning via Serial
3. Criar modo de configuração inicial (botão físico por 5s) que abre Serial prompt para configurar rede
4. Remover IP de produção e credenciais root do `deploy_dashboard.sh` → variáveis de ambiente
5. Rever `nginx-docker.conf` para garantir que headers CORS não são duplicados

**Critérios de Aceite:**
- [ ] `Config.h` sem credenciais reais de WiFi e MQTT
- [ ] Device sem EEPROM configurada exibe mensagem no display: "Configurar via Serial"
- [ ] Script de deploy usa variáveis de ambiente, não hardcoded
- [ ] Build do firmware passa sem warnings de segurança

---

## Milestone 2 — Qualidade e Experiência

> **Objetivo:** Reduzir complexidade do frontend, melhorar navegabilidade e consolidar a infraestrutura de dados.

---

### Fase 6 — Decomposição: DeviceDetails

**Objetivo:** Quebrar `DeviceDetails.tsx` (89KB, ~2500 linhas) em sub-componentes focados sem alterar comportamento.

**Planos:**
1. Mapear seções atuais: telemetria, gráficos, config de thresholds, config de relés, config de alarme, histórico
2. Extrair `<TelemetryCards />` — leitura atual de sensores
3. Extrair `<TelemetryChart />` — gráfico histórico Recharts
4. Extrair `<AlarmControls />` — toggles chkVolt/chkBat/chkTemp/chkDoor
5. Extrair `<RelayPanel />` — controles de relé
6. Testes de regressão visual: screenshots antes/depois dos sub-componentes

**Critérios de Aceite:**
- [ ] `DeviceDetails.tsx` < 200 linhas (orquestrando sub-componentes)
- [ ] Cada sub-componente tem props tipadas, sem `any` nas props
- [ ] Comportamento idêntico ao anterior validado em bancada
- [ ] Sub-componentes no diretório `components/device-details/`

---

### Fase 7 — Decomposição: ManagerPanel e Reports

**Objetivo:** Quebrar `ManagerPanel.tsx` (71KB) e `Reports.tsx` (59KB) seguindo o mesmo padrão da Fase 6.

**Planos:**
1. Extrair de ManagerPanel: `<DeviceCommandBar />`, `<BulkConfigPanel />`, `<DeviceStatusGrid />`
2. Extrair de Reports: `<ReportFilters />`, `<ReportPreview />`, `<ReportList />`
3. Mover lógica de geração PDF de `Reports.tsx` para `GenerateReportUseCase` (já existente, fortalecer)
4. Testes para sub-componentes extraídos

**Critérios de Aceite:**
- [ ] `ManagerPanel.tsx` < 200 linhas
- [ ] `Reports.tsx` < 200 linhas
- [ ] Lógica de negócio de relatório no Use Case, não no componente
- [ ] Comportamento idêntico ao anterior

---

### Fase 8 — React Router v7

**Objetivo:** Substituir o sistema de navegação por estado (`useState<Screen>`) por React Router v7 com rotas reais, permitindo URLs com bookmark e botão voltar.

**Planos:**
1. Instalar `react-router-dom` v7 e configurar `BrowserRouter`
2. Mapear rotas: `/`, `/devices`, `/devices/:id`, `/alerts`, `/reports`, `/settings`, `/manager`, `/admin`
3. Migrar `App.tsx` para `<Routes>` + `<Route>` declarativos
4. Proteger rotas por role (HOC `<ProtectedRoute role="admin">`)
5. Migrar `selectedDeviceId` para parâmetro de URL (`:id`)

**Critérios de Aceite:**
- [ ] URL muda ao navegar entre telas
- [ ] Recarregar a URL vai para a tela correta
- [ ] Botão voltar do browser funciona
- [ ] Rotas protegidas redirecionam para `/login` se não autenticado
- [ ] `currentScreen` state removido do App.tsx

---

### Fase 9 — Consolidação do Banco de Dados

**Objetivo:** Eliminar dual PostgreSQL (Supabase + EMQX PostgreSQL) definindo Supabase como fonte única de verdade para telemetria.

**Planos:**
1. Auditar o que EMQX PostgreSQL persiste vs o que Supabase já tem
2. Redirecionar EMQX Rule Engine para usar webhook n8n ao invés de INSERT direto no PostgreSQL
3. n8n recebe telemetria → persiste no Supabase → descontinua tabelas do EMQX PostgreSQL
4. Plano de migração de dados históricos do EMQX PostgreSQL para Supabase (se necessário)
5. Remover container PostgreSQL do `emqx/docker-compose.yml`

**Critérios de Aceite:**
- [ ] Todo histórico de telemetria lido de Supabase (`telemetry_history`)
- [ ] EMQX PostgreSQL desativado sem perda de dados
- [ ] Rule Engine do EMQX atualizado para webhook n8n
- [ ] Dashboard continua exibindo histórico corretamente

---

### Fase 10 — Performance e Lazy Loading

**Objetivo:** Reduzir tempo de carregamento inicial e re-renders desnecessários por updates MQTT.

**Planos:**
1. Implementar `React.lazy()` + `Suspense` para `DeviceDetails`, `ManagerPanel`, `Reports`, `AdminUserPanel`
2. Debounce de updates de state MQTT (50ms) para evitar re-renders por burst de mensagens
3. Memoizar `useMqttData` com `useCallback` e `useMemo` nos callbacks
4. Analisar bundle com `vite-bundle-analyzer` e eliminar imports desnecessários
5. Adicionar `loading="lazy"` em imagens e otimizar assets do `public/`

**Critérios de Aceite:**
- [ ] Lighthouse Performance score > 80 na tela de Dashboard
- [ ] Bundle inicial < 500KB (atualmente não medido)
- [ ] Re-renders por mensagem MQTT visíveis apenas no componente afetado (React DevTools)
- [ ] Nenhuma regressão funcional

---

### Fase 11 — Limpeza e Documentação

**Objetivo:** Remover artefatos temporários, deprecar código legado, documentar arquitetura atualizada.

**Planos:**
1. Remover `MqttService.ts` legado (substituído pelo `EmqxMqttService`)
2. Limpar `dashboard/temp/`, `output.txt`, scripts de debug avulsos
3. Mover `HISTORICO_CONVERSA.md` para fora do repo (ou adicionar ao .gitignore)
4. Atualizar `dashboard/README.md` com arquitetura atual, variáveis de ambiente e instruções de deploy
5. Adicionar `CONTRIBUTING.md` com fluxo de trabalho para novos desenvolvedores

**Critérios de Aceite:**
- [ ] `MqttService.ts` removido sem quebrar nenhum import
- [ ] Arquivos temporários removidos e em `.gitignore`
- [ ] `README.md` atualizado e completo
- [ ] `CONTRIBUTING.md` criado com setup, testes, deploy e convenções

---

## Ordem de Execução

```
Milestone 1 (Crítico — produção)
├── Fase 1: AlarmManager fix         ← começar aqui
├── Fase 2: OTA infraestrutura
├── Fase 3: Pipeline de rollout
├── Fase 4: Testes críticos
└── Fase 5: Segurança

Milestone 2 (Qualidade)
├── Fase 6: DeviceDetails decomp.
├── Fase 7: ManagerPanel + Reports
├── Fase 8: React Router
├── Fase 9: DB consolidation
├── Fase 10: Performance
└── Fase 11: Limpeza
```

## Milestone 2 — Telemetria e Relatórios

> **Objetivo:** Restaurar a visibilidade da telemetria, corrigir o status offline falso e aprimorar relatórios com foco em SOLID e TDD.

---

### Fase 12 — Debug e Fix: Status Offline

**Objetivo:** Identificar por que os dispositivos aparecem como "Offline" mesmo enviando mensagens e corrigir a lógica de detecção de presença.

**Planos:**
1. Auditar `EmqxMqttService` e o hook de detecção de presença.
2. Verificar se o tópico LWT (Last Will and Testament) está sendo processado corretamente.
3. Criar teste unitário que simula mensagem de "Online" e verifica se o estado do card muda.
4. Corrigir lógica de timeout ou parsing de status.

**Critérios de Aceite:**
- [ ] Cards mostram "Online" quando o dispositivo publica telemetria.
- [ ] Cards mostram "Offline" apenas quando há desconexão real ou timeout expirado.
- [ ] Teste unitário para `PresenceService` (ou equivalente) passando.

---

### Fase 13 — Restauração do Fluxo de Dados MQTT

**Objetivo:** Garantir que os dados de sensores cheguem aos cards e sejam exibidos sem atraso ou inconsistência.

**Planos:**
1. Mapear o trajeto do dado: `MQTT Message` -> `Service` -> `Use Case` -> `Hook` -> `Component`.
2. Implementar testes (TDD) para cada etapa dessa cadeia.
3. Corrigir falhas de merge de payload (problema comum onde campos parciais sobrescrevem dados existentes).
4. Validar exibição em tempo real nos cards de temperatura, tensão e bateria.

**Critérios de Aceite:**
- [ ] Valores mudam no dashboard instantaneamente ao receber MQTT.
- [ ] Sem perda de dados ao receber updates parciais.
- [ ] Cobertura de testes aumentada na camada de aplicação.

---

### Fase 14 — Refatoração Modular (SOLID)

**Objetivo:** Desacoplar a lógica de MQTT da UI para evitar que mudanças futuras quebrem o dashboard.

**Planos:**
1. Isolar a lógica de parsing em classes puras (Domain).
2. Criar interfaces para os serviços de MQTT para facilitar mocks.
3. Reduzir o tamanho dos hooks injetando dependências.

**Critérios de Aceite:**
- [ ] Camada de domínio isolada da infraestrutura.
- [ ] Código modular e fácil de testar isoladamente.

---

### Fase 15 — Melhorias no Sistema de Relatórios

**Objetivo:** Corrigir a geração de PDFs e melhorar a UX de visualização de histórico.

**Planos:**
1. Investigar falhas no webhook do n8n para relatórios.
2. Corrigir o processamento de dados para o template HTML do relatório.
3. Adicionar feedback visual ("Gerando relatório...") no dashboard.

**Critérios de Aceite:**
- [ ] PDF gerado com dados corretos e completos.
- [ ] Status de geração visível para o usuário.

---

## Ordem de Execução Atualizada

```
Milestone 2 (Prioridade: Telemetria)
├── Fase 12: Debug Status Offline   ← COMEÇAR AQUI
├── Fase 13: Reparo Fluxo MQTT
├── Fase 14: Refatoração SOLID
└── Fase 15: Relatórios
```

---
*Último update: 2026-05-07 | Próximo: `/gsd-plan-phase 12`*
