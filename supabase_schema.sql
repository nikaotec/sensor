-- ============================================
-- SCHEMA SUPABASE - Sistema IoT Sensor
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ueyizghzblngswgukfmr/sql/new
-- ============================================

-- Tabela: users (perfis de usuário)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- Firebase UID
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT DEFAULT 'admin',
  tenant_ids TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  provisioned_by TEXT
);

-- Tabela: tenants (empresas)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  plan TEXT DEFAULT 'pro',
  colors JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: devices_status (estado atual dos dispositivos)
CREATE TABLE IF NOT EXISTS devices_status (
  id TEXT PRIMARY KEY,  -- MAC address
  name TEXT,
  tenant_id TEXT,
  status TEXT DEFAULT 'offline',
  location TEXT,
  last_seen TIMESTAMPTZ,
  temperature REAL,
  humidity REAL,
  battery REAL,
  voltage REAL,
  signal INTEGER,
  door_open BOOLEAN,
  temp_max REAL,
  temp_min REAL,
  temp_ext REAL,
  fw_version TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: telemetry (histórico de telemetria)
CREATE TABLE IF NOT EXISTS telemetry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  temperature REAL,
  temp_max REAL,
  temp_min REAL,
  humidity REAL,
  battery REAL,
  voltage REAL,
  signal INTEGER,
  fw_version TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: events (log de eventos e alertas)
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT,
  tenant_id TEXT,
  type TEXT,
  msg TEXT,
  message TEXT,
  severity TEXT,
  value TEXT,
  details JSONB,
  user_name TEXT,
  user_email TEXT,
  source TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HABILITAR REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE devices_status;
ALTER PUBLICATION supabase_realtime ADD TABLE telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE tenants;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX idx_telemetry_device_time ON telemetry(device_id, timestamp DESC);
CREATE INDEX idx_events_device_time ON events(device_id, timestamp DESC);
CREATE INDEX idx_events_tenant_time ON events(tenant_id, timestamp DESC);
CREATE INDEX idx_devices_tenant ON devices_status(tenant_id);

-- ============================================
-- RLS (Row Level Security) - Hardening Multi-tenant
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para buscar tenants do usuário logado
CREATE OR REPLACE FUNCTION get_my_tenants()
RETURNS text[] 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_ids FROM users WHERE id = auth.uid()::text;
$$;

-- TABELA: users
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Admins can manage users" ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);

-- TABELA: tenants
CREATE POLICY "Users can view their tenants" ON tenants FOR SELECT USING (
  id::text = ANY(get_my_tenants()) OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);

-- TABELA: devices_status
CREATE POLICY "Users can view their devices" ON devices_status FOR SELECT USING (
  tenant_id = ANY(get_my_tenants()) OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);

-- TABELA: telemetry
CREATE POLICY "Users can view their telemetry" ON telemetry FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM devices_status 
    WHERE devices_status.id = telemetry.device_id 
    AND (devices_status.tenant_id = ANY(get_my_tenants()) OR 
         EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin'))
  )
);

-- TABELA: events
CREATE POLICY "Users can view their events" ON events FOR SELECT USING (
  tenant_id = ANY(get_my_tenants()) OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);

-- Permissões de escrita do sistema (Ingestão)
CREATE POLICY "System insert telemetry" ON telemetry FOR INSERT WITH CHECK (true);
CREATE POLICY "System update status" ON devices_status FOR UPDATE USING (true);

