-- ============================================================
-- firmware_versions table — Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS firmware_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    hash VARCHAR(64),
    description TEXT,
    is_latest BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast latest lookup
CREATE INDEX IF NOT EXISTS idx_firmware_latest ON firmware_versions(is_latest) WHERE is_latest = true;

-- RLS policies
ALTER TABLE firmware_versions ENABLE ROW LEVEL SECURITY;

-- Allow read/write for all (same as other tables in development)
CREATE POLICY "firmware_versions_read" ON firmware_versions
    FOR SELECT USING (true);

CREATE POLICY "firmware_versions_write" ON firmware_versions
    FOR ALL USING (true) WITH CHECK (true);

-- Seed with initial version
INSERT INTO firmware_versions (version, filename, is_latest)
VALUES ('1.1.11', 'firmware_v1.1.11.bin', true)
ON CONFLICT DO NOTHING;
