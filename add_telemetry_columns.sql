-- ============================================
-- Adicionar colunas temp_max e temp_min na tabela telemetry
-- Execute este SQL no Supabase SQL Editor caso as colunas não existam
-- ============================================

-- Verificar se as colunas existem e adicionar se necessário
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS temp_max REAL;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS temp_min REAL;

-- Verificar índices existentes
-- O índice existente deve funcionar pois só adicionamos colunas
-- CREATE INDEX idx_telemetry_device_time ON telemetry(device_id, timestamp DESC);
