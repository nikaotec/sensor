-- ============================================================
-- Adiciona coluna firmware_version na tabela devices_status
-- ============================================================

-- Adiciona coluna se não existir
ALTER TABLE devices_status
    ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(20);

-- Adiciona coluna para tracking de quando a versão foi atualizada
ALTER TABLE devices_status
    ADD COLUMN IF NOT EXISTS firmware_updated_at TIMESTAMPTZ;

-- Índice para busca rápida por versão desatualizada
CREATE INDEX IF NOT EXISTS idx_devices_firmware_version ON devices_status(firmware_version);

-- Adiciona à publicação realtime para atualização em tempo real no dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE devices_status;
