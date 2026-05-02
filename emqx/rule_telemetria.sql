-- ──────────────────────────────────────────────────────────────────────────
-- EMQX v5 Rule Engine — Regra SQL para tópico telemetria/#
-- Documentação: https://docs.emqx.com/en/emqx/v5.8/data-integration/rule-sql-syntax.html
--
-- Como aplicar:
--   Dashboard EMQX ▶ Data Integration ▶ Rules ▶ Create Rule
--   Cole o SQL abaixo e adicione as Actions indicadas.
-- ──────────────────────────────────────────────────────────────────────────

-- ── REGRA 1: Persistência de Telemetria no PostgreSQL ─────────────────────
-- Tópico: telemetria/#  (e compatibilidade legado: esp32c3/#, nikaotec/#)
--
-- SQL da regra:

SELECT
    payload.id                                          AS device_id,
    coalesce(payload.EMPRESA, payload.empresa,
             payload.company, payload.tenant, 'unknown') AS empresa,
    -- Temperatura: aceita TEMP_C (string), temp, temperature
    CASE
        WHEN is_null(payload.TEMP_C) = false
             THEN float(payload.TEMP_C)
        WHEN is_null(payload.temp)   = false
             THEN float(payload.temp)
        ELSE float(payload.temperature)
    END                                                 AS temperatura,
    float(coalesce(payload.UMIDADE, payload.humidity, null))   AS umidade,
    float(coalesce(payload.VOLT, payload.voltage, null))       AS tensao_entrada,
    float(coalesce(payload.BAT, payload.battery, null))        AS tensao_bateria,
    int(coalesce(payload.RSSI, payload.signalStrength, null))  AS sinal_rssi,
    coalesce(payload.doorOpen, false)                          AS porta_aberta,
    coalesce(str(payload.relay), null)                         AS rele_estado,
    payload                                                    AS payload_raw,
    now_rfc3339()                                              AS criado_em
FROM
    -- Aceita tópico novo E tópicos legado durante migração
    "telemetria/#", "esp32c3/#", "nikaotec/#"
WHERE
    -- Exclui mensagens de display e tipo não-telétrico
    coalesce(payload.TIPO, '') != 'MENSAGEM_DISPLAY'
    AND is_null(payload.id) = false

-- Action: PostgreSQL (Data Bridge)
-- INSERT INTO telemetria_registros
--   (device_id, empresa, temperatura, umidade, tensao_entrada,
--    tensao_bateria, sinal_rssi, porta_aberta, rele_estado, payload_raw)
-- VALUES
--   (${device_id}, ${empresa}, ${temperatura}, ${umidade},
--    ${tensao_entrada}, ${tensao_bateria}, ${sinal_rssi},
--    ${porta_aberta}, ${rele_estado}, ${payload_raw})
;

-- ── REGRA 2: Alertas de Temperatura Crítica → n8n Webhook ─────────────────
-- SQL da segunda regra:

SELECT
    payload.id                                           AS device_id,
    coalesce(payload.EMPRESA, payload.empresa,
             payload.company, 'unknown')                 AS empresa,
    coalesce(payload.TIPO, payload.alertType, 'ALERTA') AS tipo_alerta,
    CASE
        WHEN is_null(payload.TEMP_C) = false
             THEN float(payload.TEMP_C)
        ELSE float(coalesce(payload.temp, payload.temperature, 0))
    END                                                  AS temperatura,
    payload                                              AS payload_raw,
    now_rfc3339()                                        AS criado_em
FROM
    "telemetria/#", "esp32c3/#", "nikaotec/#"
WHERE
    -- Filtra apenas alertas de temperatura crítica
    coalesce(payload.TIPO, payload.alertType, '') IN (
        'ALERTA_TEMPERATURA_CRITICA',
        'ALERTA_TEMPERATURA',
        'ALARME_TEMP_MAX',
        'ALARME_TEMP_MIN'
    )

-- Action 1: PostgreSQL — INSERT INTO alertas_criticos
-- Action 2: HTTP (Webhook n8n)
--   URL: http://n8n:5678/webhook/alerta-temperatura
--   Method: POST
--   Headers: Content-Type: application/json
--   Body: {"device_id": "${device_id}", "empresa": "${empresa}",
--           "tipo_alerta": "${tipo_alerta}", "temperatura": ${temperatura},
--           "payload": ${payload_raw}}
;
