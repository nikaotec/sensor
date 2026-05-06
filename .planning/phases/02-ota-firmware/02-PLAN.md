# Phase 2 Plan — OTA Firmware Update

## Objetivo
Implementar atualização de firmware Over-the-Air via WiFi no ESP32, sem necessidade de cabo USB. Pré-requisito para rollout seguro em centenas de devices.

## Mudanças Propostas

1. **`Config.h`**
   - Inserir `FW_VERSION "1.0.0"`.
   - Inserir `OTA_PASSWORD`.
   - Inserir `OTA_PORT 3232`.

2. **`AppNetworkManager` (`.h` / `.cpp`)**
   - Integrar bibliotecas `ArduinoOTA.h`.
   - Iniciar o listener no passo de conexão completa de rede local (`verifyWifi()`).
   - Escutar ativamente (`ArduinoOTA.handle()`) dentro do loop do manager.
   - Refletir no JSON via MQTT a tag `"fw_version"` quando publicar pacote de telemetria base.

3. **`esp32.ino`**
   - Implementar Hard Watchdog (`esp_task_wdt_init(30, true)`) para anti-bricking.
   - Incluir Dual-Bank Verification (`esp_ota_mark_app_valid_cancel_rollback()`) assim que conseguir a primeira conexão integral EMQX; fallback acionado caso não passe desse limiar.
