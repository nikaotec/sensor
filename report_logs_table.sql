-- Tabela para logs de execução de relatórios
CREATE TABLE IF NOT EXISTS report_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES report_configs(id),
  tenant_id UUID REFERENCES tenants(id),
  device_id TEXT,
  type TEXT CHECK (type IN ('device', 'company')),
  period_start DATE,
  period_end DATE,
  status TEXT CHECK (status IN ('success', 'failed', 'partial')),
  whatsapp_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  whatsapp_recipients TEXT[],
  email_recipients TEXT[],
  error_message TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_report_logs_config ON report_logs(config_id);
CREATE INDEX idx_report_logs_tenant ON report_logs(tenant_id);
CREATE INDEX idx_report_logs_generated ON report_logs(generated_at DESC);

-- RLS
ALTER TABLE report_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for report_logs" ON report_logs FOR ALL USING (true) WITH CHECK (true);