-- ============================================
-- Adicionar colunas alarm_max e alarm_min na tabela devices_status
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ueyizghzblngswgukfmr/sql/new
-- ============================================

-- Adiciona as colunas para persistir os limites de alarme do ESP32
ALTER TABLE devices_status ADD COLUMN IF NOT EXISTS alarm_max REAL;
ALTER TABLE devices_status ADD COLUMN IF NOT EXISTS alarm_min REAL;

-- Verifica a estrutura criada
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'devices_status'
  AND column_name IN ('alarm_max', 'alarm_min');
