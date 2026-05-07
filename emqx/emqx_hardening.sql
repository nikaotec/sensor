SELECT
  clientid AS device_id,
  coalesce(payload.EMPRESA, payload.empresa, payload.company, payload.tenant, 'unknown') AS empresa,
  payload.TEMP_C AS temperature,
  payload.VOLTAGEM AS voltage,
  payload.BATERIA AS battery,
  payload.RSSI AS signal,
  payload.FW_VERSION AS fw_version,
  now_rfc3339() AS criado_em
FROM
  "telemetria/#"
WHERE
  is_null(clientid) = false
