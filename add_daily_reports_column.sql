-- Migração: Adiciona coluna para habilitar relatórios diários de temperatura por e-mail
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_reports_enabled BOOLEAN DEFAULT FALSE;
