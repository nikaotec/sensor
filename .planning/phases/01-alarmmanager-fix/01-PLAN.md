# Plano de Execução - Fase 1: Corrigir AlarmManager (Firmware)

Este plano descreve as etapas para corrigir o bug onde os alertas de sensores não respeitam as configurações de habilitado/desabilitado e apresentam atrasos na normalização após a desativação via MQTT.

<domain>
- Firmware ESP32 (C++/Arduino)
- Gerenciamento de Alertas e Buzzer
- Protocolo MQTT e Persistência (EEPROM/Flash)
</domain>

<threat_model>
- **Escrita Excessiva na EEPROM:** Risco de degradar a memória Flash se o salvamento de estados for disparado em loop.
- **Bloqueio do Loop Principal:** Debouncing mal implementado pode causar travamentos ou delay no processamento de sensores críticos.
- **Alertas Fantasmas:** Falta de reset nos objetos `AlertManager` quando um alerta é desabilitado pode manter o buzzer ativo indevidamente.
- **Inconsistência de Estado:** Divergência entre o estado real do sensor e o estado persistido após um comando MQTT de silenciamento.
</threat_model>

## Wave 1: Refatoração da Classe AlertManager
Foco em tornar a classe `AlertManager` mais robusta e consciente do seu estado de ativação.

- [ ] **Modificar `AlertManager.h`:** Adicionar `bool _isEnabled` e atualizar a assinatura de `check` para `check(bool condition, bool enabled)`.
- [ ] **Modificar `AlertManager.cpp`:** Se `enabled` for `false`, chamar `forceReset()` e retornar `false` imediatamente.
- [ ] **Verificação:** Compilação limpa e validação da lógica de reset imediato.

## Wave 2: Integração no `esp32.ino`
Ajustar a lógica principal para utilizar a nova funcionalidade da classe e responder a comandos MQTT.

- [ ] **Atualizar o loop de verificação de alertas:** Passar os flags de configuração (`storage.data.chkVolt`, etc.) para o método `check`.
- [ ] **Implementar Resposta ao Silenciamento (MQTT):** Chamar `forceReset()` em todos os monitores ao receber o comando de snooze/silêncio.
- [ ] **Verificação:** Resposta imediata do buzzer ao desativar flags via MQTT.

## Wave 3: Persistência e Validação Final
Garantir que as mudanças sejam salvas e o comportamento seja consistente.

- [ ] **Garantir Persistência:** Validar chamadas de `storage.save()` após alterações via MQTT na função de callback.
- [ ] **Teste de Stress/Reboot:** Garantir que o estado "mudo" persista após reinicialização do hardware.
- [ ] **Verificação:** Cumprimento de todos os critérios em `01-VALIDATION.md`.
