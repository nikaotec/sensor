-- Adiciona as colunas para preferências de notificação e data de atualização na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS receive_notifications BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Comentário opcional para documentação
COMMENT ON COLUMN users.receive_notifications IS 'Indica se o usuário deseja receber alertas via WhatsApp';
COMMENT ON COLUMN users.updated_at IS 'Data da última alteração no perfil do usuário';
