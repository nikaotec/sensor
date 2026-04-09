-- Script para adicionar coluna phone na tabela users
-- Execute no Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Criar índice para buscar usuários por telefone (opcional)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Comentário para documentação
COMMENT ON COLUMN users.phone IS 'Telefone com formato +5581xxxx-xxxx';
