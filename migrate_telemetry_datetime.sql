-- ============================================
-- Migração: Adicionar colunas de data e hora separadas
-- ============================================

-- 1. Adicionar colunas
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS data_registro DATE;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS hora_registro INTEGER;

-- 2. Opicional: Popular dados existentes (Baseado no fuso de Brasília)
-- Nota: Isso converte o UTC armazenado para o horário local antes de extrair
UPDATE telemetry 
SET 
  data_registro = (timestamp AT TIME ZONE 'America/Sao_Paulo')::DATE,
  hora_registro = EXTRACT(HOUR FROM (timestamp AT TIME ZONE 'America/Sao_Paulo'))::INTEGER
WHERE data_registro IS NULL;

-- 3. Criar índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_telemetry_data_hora ON telemetry(data_registro DESC, hora_registro);
