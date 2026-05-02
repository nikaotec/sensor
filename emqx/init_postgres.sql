-- ── Tabela principal de telemetria ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemetria_registros (
    id              BIGSERIAL PRIMARY KEY,
    device_id       TEXT        NOT NULL,
    empresa         TEXT,
    temperatura     NUMERIC(6,2),
    umidade         NUMERIC(6,2),
    tensao_entrada  NUMERIC(8,2),
    tensao_bateria  NUMERIC(6,2),
    sinal_rssi      SMALLINT,
    porta_aberta    BOOLEAN,
    rele_estado     TEXT,
    payload_raw     JSONB,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tel_device_id  ON telemetria_registros(device_id);
CREATE INDEX IF NOT EXISTS idx_tel_criado_em  ON telemetria_registros(criado_em DESC);

-- ── Tabela de alertas críticos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alertas_criticos (
    id              BIGSERIAL PRIMARY KEY,
    device_id       TEXT        NOT NULL,
    empresa         TEXT,
    tipo_alerta     TEXT        NOT NULL,
    temperatura     NUMERIC(6,2),
    descricao       TEXT,
    payload_raw     JSONB,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerta_device  ON alertas_criticos(device_id);
CREATE INDEX IF NOT EXISTS idx_alerta_tipo    ON alertas_criticos(tipo_alerta);
