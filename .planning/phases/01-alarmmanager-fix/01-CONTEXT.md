# Fase 1: Corrigir AlarmManager (Firmware) - Contexto

**Gathered:** 2026-05-05
**Status:** Ready for planning
**Source:** Conversa inicial de mapeamento e requisitos do sistema

<domain>
## Phase Boundary

Esta fase foca exclusivamente no firmware ESP32, especificamente na lógica de controle de alarmes. O objetivo é garantir que o dispositivo físico respeite as configurações enviadas pelo Dashboard MQTT.

### O que esta fase entrega:
- Firmware atualizado que silencia o buzzer imediatamente ao receber comando do dashboard.
- Lógica de alarme que ignora condições de sensor se a flag de monitoramento correspondente estiver desativada.
- Persistência correta do estado das flags na EEPROM.
- Mecanismo de "silenciamento temporário" (snooze/mute) que não bloqueia alertas futuros se a condição for resolvida e voltar a ocorrer.

</domain>

<decisions>
## Implementation Decisions

### Lógica de Alerta (AlertManager.cpp)
- **Bloqueio por Flag:** Antes de entrar em estado `ALERT_STARTED` ou `ALERT_REPEATED`, o gerenciador deve verificar se a flag correspondente (ex: `sysSettings.chkVolt`) está verdadeira.
- **Silenciamento Imediato:** Ao receber um comando MQTT de desativação ou silenciamento, o `AlertManager` deve resetar seu estado interno e parar a saída física do buzzer.
- **Snooze vs Disable:** 
    - `Disable` (ex: `chkVolt=false`): Nunca dispara alarme para essa condição.
    - `Snooze` (Silenciar): Para o buzzer agora, mas se a porta for fechada e aberta novamente, ou se a tensão oscilar, o alarme pode voltar.

### Armazenamento (StorageManager)
- Garantir que toda alteração via MQTT nas flags de alarme dispare um `StorageManager::saveSettings()` após um curto delay (debounce de escrita) para não desgastar a EEPROM.

### Comunicação (Mqtt)
- O dispositivo deve enviar um payload de telemetria imediato após mudar uma flag ou silenciar um alarme, confirmando para o Dashboard que a ação foi processada.

### Discretion do Agente
- Escolha da melhor forma de integrar o silenciamento no loop principal sem bloquear outras tarefas (sensores/MQTT).
- Implementação de um toggle de "emergência" no código para desativar todos os buzzers via MQTT global se necessário.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Firmware
- `esp32/AlertManager.cpp` — Lógica central de debouncing e estados de alarme.
- `esp32/AlertManager.h` — Definição dos tipos de alerta.
- `esp32/Config.h` — Estrutura `SystemSettings` e pins do buzzer/LED.
- `esp32/StorageManager.cpp` — Salvamento de configurações.
- `esp32/main.ino` ou `AppMqttManager.cpp` — Onde os comandos MQTT são recebidos.

### Telemetria
- `.planning/codebase/INTEGRATIONS.md` — Estrutura do JSON de telemetria e comandos.

</canonical_refs>

<specifics>
## Specific Ideas
- Usar o campo `last_updated_at` na telemetria para o dashboard saber que o ESP32 processou o comando.
- O buzzer deve ter padrões diferentes para tipos de erro (opcional, se houver tempo).

</specifics>

<deferred>
## Deferred Ideas
- Atualização OTA (Fase 2).
- Som de alarme personalizado (Frequência variável).
- Registro de logs de alarme no SD card local.
</deferred>

---

*Phase: 01-alarmmanager-fix*
*Context gathered: 2026-05-05 via GSD Orchestrator*
