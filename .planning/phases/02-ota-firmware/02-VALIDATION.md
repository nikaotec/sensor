# Phase 2 Validation — OTA Firmware Update

## Critérios de Aceite
- [ ] Dispositivo aceita novo .bin via ArduinoOTA na mesma rede WiFi
- [ ] Update protegido por senha
- [ ] Após update, dispositivo publica versão de firmware no tópico telemetria
- [ ] Watchdog / Rollback ativo: se firmware não confirmar em X segundos, reboota para versão anterior (se possível via dual-bank)

## Testes Manuais a serem aplicados no fim da Execução
1. Efetuar compilação standard para a board (Upload normal) atestando que OTA está disponível na rede.
2. Injetar sub-versão `"1.0.1"` em `Config.h`.
3. Proceder com OTA Upload a partir da IDE, utilizando a porta/IP anunciados no mDNS.
4. Identificar que o upload exija *password*.
5. Monitorar serial, assegurar que no boot Pós-OTA os logs de rollback clear são invocados (`esp_ota_mark_app_valid_cancel_rollback()`).
6. Identificar mudança de `"fw_version"` no tópico de telemetria `nikaotec/telemetria`.
