-- ============================================================
-- MIGRAÇÃO: Tabela users_devices
-- Consultada pelo workflow n8n esp32.json para enviar alertas
-- WhatsApp aos usuários cadastrados no dashboard.
--
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ueyizghzblngswgukfmr/sql/new
-- ============================================================

-- Cria a tabela de relacionamento usuário <-> dispositivo (para alertas WhatsApp)
CREATE TABLE IF NOT EXISTS users_devices (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               TEXT NOT NULL,         -- Firebase UID (users.id)
  device_id             TEXT,                  -- MAC do dispositivo (NULL = todos os dispositivos)
  phone                 TEXT NOT NULL,          -- Telefone formatado: +5581xxxxx-xxxx
  receive_notifications BOOLEAN DEFAULT TRUE,   -- Se deve receber alertas WhatsApp
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Garante 1 linha por usuário/dispositivo
  UNIQUE (user_id, device_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_devices_user_id   ON users_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_users_devices_device_id ON users_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_users_devices_phone     ON users_devices(phone);

-- Habilitar Realtime (opcional, mas consistente com o restante)
ALTER PUBLICATION supabase_realtime ADD TABLE users_devices;

-- Política permissiva (consistente com demais tabelas do projeto)
ALTER TABLE users_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for users_devices"
  ON users_devices FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Popular com usuários existentes que já têm telefone
-- (Execução única para sincronizar o estado atual)
-- ============================================================
INSERT INTO users_devices (user_id, device_id, phone, receive_notifications)
SELECT id, NULL, phone, COALESCE(receive_notifications, false)
FROM users
WHERE phone IS NOT NULL AND phone != ''
ON CONFLICT (user_id, device_id) DO UPDATE
  SET phone                 = EXCLUDED.phone,
      receive_notifications = EXCLUDED.receive_notifications,
      updated_at            = NOW();

-- ============================================================
-- NOTA SOBRE O WORKFLOW N8N (esp32.json)
-- O nó "Get many rows" filtra por: device_id = ID_DISPOSITIVO
-- Rows com device_id = NULL representam usuários que recebem
-- alertas de TODOS os dispositivos. Para que o n8n inclua
-- esses usuários, atualize o nó "Get many rows" para buscar:
--   device_id IS NULL OR device_id = ID_DISPOSITIVO
-- ============================================================
