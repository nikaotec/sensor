-- Tabela para agendamento de relatórios
CREATE TABLE IF NOT EXISTS report_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  device_id TEXT, -- MAC address, opcional se for por empresa
  type TEXT CHECK (type IN ('device', 'company')),
  name TEXT NOT NULL,
  schedule_type TEXT CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  schedule_time TIME NOT NULL, -- Horário de envio
  schedule_day INTEGER, -- Dia da semana (0-6) ou dia do mês (1-31)
  channels TEXT[] DEFAULT '{email}', -- 'whatsapp', 'email'
  recipients JSONB DEFAULT '{"emails": [], "phones": []}',
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES users(id)
);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE report_configs;

-- Índices
CREATE INDEX idx_report_tenant ON report_configs(tenant_id);
CREATE INDEX idx_report_enabled ON report_configs(enabled) WHERE enabled = true;

-- Políticas RLS
ALTER TABLE report_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for report_configs" ON report_configs FOR ALL USING (true) WITH CHECK (true);
