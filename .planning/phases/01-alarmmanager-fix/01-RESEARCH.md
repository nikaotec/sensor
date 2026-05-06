# Pesquisa Técnica: Correção do AlarmManager (Fase 1)

## 1. Identificação do Problema
O bug principal reside na implementação do debounce de normalização na classe `AlertManager`. Atualmente, quando a condição de erro deixa de ser verdadeira (seja por mudança física no sensor ou por desabilitação da flag de monitoramento no código), a classe entra em um estado de "recuperação" (`_inRecovery`) e aguarda o tempo de debounce (ex: 10 segundos) antes de desativar o alerta (`_isActive = false`).

Como o buzzer e o LED são disparados baseados no `isActive()`, o dispositivo continua apitando por 10 segundos após o usuário ter "desligado" o monitoramento via dashboard MQTT.

## 2. Proposta de Solução: Silenciamento Imediato
Para garantir que o alarme pare imediatamente ao desabilitar uma flag, a lógica do `AlertManager` deve distinguir entre "Condição Normalizada" (debounce necessário) e "Monitoramento Desativado" (reset imediato).

### Alterações na Classe `AlertManager`:
- Modificar a assinatura do método `check`:
  ```cpp
  AlertStatus check(bool isErrorCondition, bool isEnabled = true);
  ```
- No início do método `check`, se `isEnabled` for `false`:
  - Se `_isActive` for true, chamar `forceReset()` e retornar `ALERT_NORMALIZED`.
  - Caso contrário, retornar `ALERT_NONE`.

### Alterações no `esp32.ino`:
- Atualizar as chamadas no loop para passar o estado da flag:
  ```cpp
  AlertStatus stMax = alertTempMax.check(temperaturaAtual >= storage.data.alarmMax, storage.data.chkTemp);
  ```

## 3. Lógica de "Silenciar" (Snooze)
O comando de "Silenciar" via MQTT deve atuar como um reset temporário.
- Ao receber o comando, o firmware deve percorrer todos os monitores de alerta e chamar `forceReset()`.
- Isso garante que o buzzer pare imediatamente. O alerta só disparará novamente se a condição for limpa e re-acionada, ou após o debounce de erro caso persista.

## 4. Persistência e EEPROM
- Cada mudança de flag via MQTT deve invocar `storage.save()`.
- Garantir que `storage.load()` seja chamado no `setup()` (já implementado).

## 5. Arquitetura de Validação
- **Teste de Bancada Unitário:** Simular recepção de payload MQTT com flag=false durante alarme ativo e medir tempo de resposta do buzzer.
- **Teste de Integração:** Verificar se o estado da telemetria reflete o silenciamento imediato.
- **Teste de Estresse:** Alternar flags rapidamente e verificar se a EEPROM não sofre escritas excessivas (confirmar debounce de save).
