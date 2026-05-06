-- ──────────────────────────────────────────────────────────────────────────
-- EMQX v5 Rule Engine — Hardening de Identidade
-- Objetivo: Prevenir spoofing de device_id via payload JSON
-- ──────────────────────────────────────────────────────────────────────────

-- RECOMENDAÇÃO: Substituir o uso de 'payload.id' por 'clientid'
-- O 'clientid' é atribuído na conexão MQTT e não pode ser forjado no payload.

-- 1. Regra de Telemetria Hardened
SELECT
    clientid                                            AS device_id, -- <--- MUDANÇA CRÍTICA
    coalesce(payload.EMPRESA, payload.empresa,
             payload.company, payload.tenant, 'unknown') AS empresa,
    -- ... restante dos campos permanece igual ...
    now_rfc3339()                                              AS criado_em
FROM
    "telemetria/#"
WHERE
    is_null(clientid) = false;

-- 2. ACLs de Tópico (Exemplo de Configuração no emqx.conf ou Auth backend)
-- Impede que um dispositivo publique em tópicos que não lhe pertencem.
-- Regra: allow, user: "esp32_device", pubsub, "telemetria/${clientid}/#"
-- Regra: allow, user: "esp32_device", pubsub, "esp32c3/${clientid}/#"

-- 3. Autenticação Única (Recomendação)
-- Em vez de uma senha global 'EmqxDevice@2025', utilize o mecanismo 'Password-Based'
-- do EMQX para criar credenciais baseadas no MAC address de cada dispositivo.
