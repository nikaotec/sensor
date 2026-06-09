-- Adiciona colunas para customização do relatório diário por e-mail
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_report_device_ids TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_report_time TEXT DEFAULT '17:05';
