# CONCERNS.md — Sensor IoT Dashboard
<!-- last_mapped: 2026-05-05 -->

## Resumo de Riscos

| Severidade | Área | Descrição |
|-----------|------|-----------|
| 🔴 **CRÍTICO** | Segurança | Credenciais WiFi e MQTT hardcoded em `Config.h` |
| 🔴 **CRÍTICO** | Firmware | Flags `chkVolt/chkBat/chkTemp/chkDoor` não respeitadas corretamente pelo `AlertManager` (bug ativo — conv. 92ffc94a) |
| 🟠 **ALTO** | Frontend | Componentes "god": `DeviceDetails.tsx` (89KB), `ManagerPanel.tsx` (71KB) |
| 🟠 **ALTO** | Segurança | IP de VPS de produção hardcoded no script de deploy |
| 🟠 **ALTO** | Testes | Zero cobertura de componentes e hooks críticos |
| 🟡 **MÉDIO** | Manutenção | `MqttService.ts` legado coexistindo com `EmqxMqttService.ts` |
| 🟡 **MÉDIO** | Infra | Dois bancos PostgreSQL: Supabase e PostgreSQL EMQX (telemetria duplicada) |
| 🟡 **MÉDIO** | Navegação | SPA sem router — estado de tela em `useState<Screen>` no App.tsx |
| 🟢 **BAIXO** | DX | Arquivo de histórico `HISTORICO_CONVERSA.md` de 58KB no repositório |

---

## 1. Segurança 🔴

### Credenciais Hardcoded no Firmware
```c
// esp32/Config.h — EXPOSTAS NO REPOSITÓRIO
#define WIFI_SSID "VENANCIO"
#define WIFI_PASS "liza1980"
#define MQTT_USER "esp32_device"
#define MQTT_PASS "EmqxDevice@2025"
```
**Risco:** Acesso não autorizado à rede local e ao broker MQTT.
**Ação:** Usar provisioning via MQTT ou armazenar em EEPROM sem expor no código.

### IP e Deploy Script Hardcoded
```bash
# dashboard/deploy_dashboard.sh
scp ... root@109.123.240.215:/var/www/nikaotech
```
**Risco:** Exposição de endereço de prod, credenciais root no CI/script.

### Headers CORS Duplicados (histórico)
- Nginx adicionava `Access-Control-Allow-Origin` e o servidor Express também
- Causou erro "Failed to fetch" no gerador de PDF (conv. 15244a95)
- `nginx-docker.conf` deve ser verificado após qualquer deploy

---

## 2. Bug Ativo: Alarm Flags não Respeitadas 🔴

**Status:** Bug ativo (último trabalho na conv. 92ffc94a-7f37-4710-8b7f-84ab120dbaec)

**Descrição:** Desabilitar um alarme no dashboard (toggle `chkVolt`, `chkBat`, `chkTemp`, `chkDoor`) não silencia o alarme físico (buzzer) no ESP32. O `AlertManager.cpp` não verifica as flags corretamente ao decidir disparar ou continuar o alarme.

**Archivos Afetados:**
- `esp32/AlertManager.cpp` — lógica principal do alarme
- `esp32/AlertManager.h` — interface
- `dashboard/src/components/ManagerPanel.tsx` — toggle UI (ação MQTT)
- `dashboard/src/components/DeviceDetails.tsx` — toggle UI (ação MQTT)
- Tópico: `esp32c3/web/action` com payload `{"acao": "ligar_alarme" | "desligar_alarme", "tipo": "..."}` 

**Impacto:** Alto — equipamentos emitem alarme mesmo quando desabilitado pelo operador.

---

## 3. God Components (Manutenção) 🟠

| Componente | Tamanho | Problema |
|-----------|---------|---------|
| `DeviceDetails.tsx` | 89 KB | Contém: gráficos, controles MQTT, config de relay, config de thresholds, config de alarme, histórico de telemetria |
| `ManagerPanel.tsx` | 71 KB | Gestão multi-dispositivo, config global, envio de comandos MQTT em massa |
| `Reports.tsx` | 59 KB | Geração PDF, preview HTML, template inline, filtros por data |
| `AdminUserPanel.tsx` | 36 KB | CRUD de usuários, roles, tenants |

**Problema:** Qualquer mudança de feature nestes componentes requer entender todo o contexto. Alto risco de regressão.

**Proposta:** Extrair sub-componentes (ex: `DeviceConfig`, `AlarmControls`, `RelayPanel`, `TelemetryChart`) com interfaces bem definidas.

---

## 4. Dívida Técnica (Banco de Dados) 🟡

### Dois PostgreSQL Paralelos
1. **Supabase** — `devices_status`, `events`, `telemetry_history`, `users`, `reports`
2. **PostgreSQL EMQX** — tabelas de telemetria definidas em `emqx/init_postgres.sql` e `emqx/rule_telemetria.sql`

**Risco:** Dados de telemetria duplicados ou divergentes entre os dois bancos. Não está claro qual é a fonte de verdade para histórico.

### Migrações SQL Avulsas
Múltiplos arquivos `.sql` na raiz do projeto sem ordem definida:
- `add_alarm_columns.sql`, `add_chk_columns.sql`, `add_phone_column.sql`
- `add_telemetry_columns.sql`, `apply_triggers.sql`, `fix_telemetry_types.sql`
- `migrate_telemetry_datetime.sql`, `report_logs_table.sql`

**Risco:** Difícil saber qual migração foi aplicada em qual ambiente.

---

## 5. Serviço MQTT Legado 🟡

- `infrastructure/MqttService.ts` ainda existe ao lado de `EmqxMqttService.ts`
- Não está claro se ainda é usado em algum lugar
- Deve ser removido após validação completa do `EmqxMqttService`

---

## 6. Navegação SPA sem Router 🟡

```typescript
// App.tsx
type Screen = 'login' | 'signup' | 'dashboard' | 'device-details' | ...
const [currentScreen, setCurrentScreen] = useState<Screen>('login');
```

**Problema:** URL não reflete a tela atual. Impossível fazer bookmark/deep-link, voltar com botão do browser ou recarregar na mesma tela.

**Proposta:** Migrar para `react-router-dom` v7 (já compatível com React 19).

---

## 7. Testes Ausentes 🟠

Ver `TESTING.md` para detalhes completos. Resumo:

- **0% de cobertura** em Componentes, Hooks e Repositórios
- Fluxo crítico `chkVolt/chkBat/chkTemp/chkDoor` sem teste de ponta a ponta
- `EmqxMqttService` mockado mas sem teste de reconexão com backoff

---

## 8. Performance Potencial 🟢

### Re-renders MQTT
- `useMqttData` atualiza estado de `devices` a cada mensagem MQTT recebida
- Com muitos dispositivos enviando telemetria frequente, pode causar re-renders excessivos
- Considerar `useMemo` / `useCallback` ou debounce nos updates de state

### Sem Lazy Loading
- Todos os componentes importados diretamente em `App.tsx`
- `DeviceDetails.tsx` (89KB) sempre bundled, mesmo para usuários que nunca acessam detalhes
- Considerar `React.lazy()` + `Suspense` para split de código

---

## 9. Arquivos Temporários no Repositório 🟢

```
dashboard/temp/           # 8 arquivos de análise/debug
HISTORICO_CONVERSA.md     # 58KB — histórico de conversa com IA
*.py (raiz)               # Scripts de patch/debug
output.txt                # Saída de debug
```

**Ação:** Adicionar ao `.gitignore` ou mover para fora do repositório.

---

## História de Issues Recorrentes

| Conversa | Issue | Status |
|---------|-------|--------|
| 92ffc94a | Alarm flags não respeitadas pelo ESP32 | 🔴 Ativo |
| 2b4e7f62 | DeviceDetails sem dados (telemetria vazia) | ✅ Resolvido |
| 19d77328 | PDF report com erros de syntax no n8n JSON | ✅ Resolvido |
| 15244a95 | CORS headers duplicados gerador PDF | ✅ Resolvido |
| 4a388cce | Hysteresis (tempOn/tempOff) não persistida | ✅ Resolvido |
| 9441a980 | Buzzer/display desacoplado do throttle MQTT | ✅ Resolvido |
| 0aacc42f | Migração Mosquitto → EMQX v5 | ✅ Concluído |
