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
  provisioned_by TEXT,
  daily_reports_enabled BOOLEAN DEFAULT FALSE,
  daily_report_device_ids TEXT[] DEFAULT '{}',
  daily_report_time TEXT DEFAULT '17:05'
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
-- RLS (Row Level Security) - Desabilitado para permitir acesso via anon key
-- IMPORTANTE: Em produção, configure RLS adequado!
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (para desenvolvimento)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tenants" ON tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for devices_status" ON devices_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for telemetry" ON telemetry FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for events" ON events FOR ALL USING (true) WITH CHECK (true);
