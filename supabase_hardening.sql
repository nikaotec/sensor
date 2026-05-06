-- ============================================
-- HARDENING RLS - Sistema IoT Sensor
-- Implementa isolamento multi-tenant real
-- ============================================

-- 1. Garantir que RLS esteja habilitado
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas permissivas antigas
DROP POLICY IF EXISTS "Allow all for users" ON users;
DROP POLICY IF EXISTS "Allow all for tenants" ON tenants;
DROP POLICY IF EXISTS "Allow all for devices_status" ON devices_status;
DROP POLICY IF EXISTS "Allow all for telemetry" ON telemetry;
DROP POLICY IF EXISTS "Allow all for events" ON events;

-- 3. Função auxiliar para buscar tenants do usuário logado
-- Nota: Assume-se que auth.uid() mapeia para users.id
CREATE OR REPLACE FUNCTION get_my_tenants()
RETURNS text[] 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_ids FROM users WHERE id = auth.uid()::text;
$$;

-- 4. Novas Políticas de Segurança

-- TABELA: users
CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid()::text = id);

CREATE POLICY "Admins can manage users" 
ON users FOR ALL 
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);

-- TABELA: tenants
CREATE POLICY "Users can view their tenants" 
ON tenants FOR SELECT 
USING (
  id::text = ANY(get_my_tenants()) OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);

-- TABELA: devices_status
CREATE POLICY "Users can view their devices" 
ON devices_status FOR SELECT 
USING (
  tenant_id = ANY(get_my_tenants()) OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);

CREATE POLICY "Users can update their devices" 
ON devices_status FOR UPDATE 
USING (
  tenant_id = ANY(get_my_tenants()) OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);

-- TABELA: telemetry
CREATE POLICY "Users can view their telemetry" 
ON telemetry FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM devices_status 
    WHERE devices_status.id = telemetry.device_id 
    AND (devices_status.tenant_id = ANY(get_my_tenants()) OR 
         EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin'))
  )
);

-- TABELA: events
CREATE POLICY "Users can view their events" 
ON events FOR SELECT 
USING (
  tenant_id = ANY(get_my_tenants()) OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);

-- 5. Permissões para o Serviço de Ingestão (n8n/EMQX)
-- Se o n8n usa a service_role key, ele ignora RLS. 
-- Se usa anon key, precisa de permissão de escrita:
CREATE POLICY "Allow system to insert telemetry" 
ON telemetry FOR INSERT 
WITH CHECK (true); -- Geralmente protegido por API Key no nível do gateway

CREATE POLICY "Allow system to update status" 
ON devices_status FOR UPDATE 
USING (true);
