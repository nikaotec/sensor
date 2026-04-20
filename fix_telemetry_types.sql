-- ============================================
-- Correção de Tipos: telemetry (data_registro e hora_registro)
-- Execute este SQL se receber erro "invalid input syntax for type time"
-- ============================================

-- 1. Remover colunas se existirem com tipo errado e recriar corretamente
-- OU simplesmente forçar a alteração de tipo

-- Garantir que data_registro é DATE
ALTER TABLE telemetry 
DROP COLUMN IF EXISTS data_registro;

ALTER TABLE telemetry 
ADD COLUMN data_registro DATE;

-- Garantir que hora_registro é TIME
ALTER TABLE telemetry 
DROP COLUMN IF EXISTS hora_registro;

ALTER TABLE telemetry 
ADD COLUMN hora_registro TIME;

-- 2. Repopular os dados (Fuso de Brasília - Precisão Total)
UPDATE telemetry 
SET 
  data_registro = (timestamp AT TIME ZONE 'America/Sao_Paulo')::DATE,
  hora_registro = (timestamp AT TIME ZONE 'America/Sao_Paulo')::TIME;

-- 3. Função para automatizar o preenchimento (Trigger)
CREATE OR REPLACE FUNCTION trg_populate_telemetry_datetime()
RETURNS TRIGGER AS $$
BEGIN
  -- Sempre converter o timestamp para o fuso de Brasília
  NEW.data_registro := (NEW.timestamp AT TIME ZONE 'America/Sao_Paulo')::DATE;
  NEW.hora_registro := (NEW.timestamp AT TIME ZONE 'America/Sao_Paulo')::TIME;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar o Trigger
DROP TRIGGER IF EXISTS telemetry_datetime_sync ON telemetry;
CREATE TRIGGER telemetry_datetime_sync
BEFORE INSERT OR UPDATE ON telemetry
FOR EACH ROW
EXECUTE FUNCTION trg_populate_telemetry_datetime();

-- 5. Recriar índice
DROP INDEX IF EXISTS idx_telemetry_data_hora;
CREATE INDEX idx_telemetry_data_hora ON telemetry(data_registro DESC, hora_registro);
