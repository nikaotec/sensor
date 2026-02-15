-- ============================================
-- IoT Temperature Monitoring - Multitenant Schema
-- ============================================

-- Public schema: shared tenant & user registry
-- Tenant schemas: isolated data per company

-- ============================================
-- PUBLIC SCHEMA (shared)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenant registry
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    mqtt_user VARCHAR(50) UNIQUE NOT NULL,
    mqtt_pass VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User accounts
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================
-- TENANT SCHEMA TEMPLATE FUNCTION
-- Creates isolated schema for each new tenant
-- ============================================

CREATE OR REPLACE FUNCTION public.create_tenant_schema(tenant_slug TEXT)
RETURNS VOID AS $$
DECLARE
    schema_name TEXT := 'tenant_' || tenant_slug;
BEGIN
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

    -- Locations
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.locations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            address VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )', schema_name);

    -- Devices
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.devices (
            id SERIAL PRIMARY KEY,
            location_id INTEGER REFERENCES %I.locations(id) ON DELETE SET NULL,
            device_key VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            last_seen TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )', schema_name, schema_name);

    -- Readings
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.readings (
            id SERIAL PRIMARY KEY,
            device_id INTEGER REFERENCES %I.devices(id) ON DELETE CASCADE,
            temperature DECIMAL(5,2) NOT NULL,
            relay_status VARCHAR(20),
            is_alarm BOOLEAN DEFAULT FALSE,
            timestamp TIMESTAMPTZ DEFAULT NOW()
        )', schema_name, schema_name);

    -- Chat memory (AI)
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.chat_memory (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) NOT NULL,
            message JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )', schema_name);

    -- Indexes
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_readings_device_ts ON %I.readings(device_id, timestamp DESC)', schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_chat_memory_session ON %I.chat_memory(session_id)', schema_name);

    -- View: latest status per device
    EXECUTE format('
        CREATE OR REPLACE VIEW %I.v_latest_status AS
        SELECT DISTINCT ON (r.device_id)
            d.name,
            d.device_key,
            d.location_id,
            l.name AS location_name,
            r.*
        FROM %I.devices d
        JOIN %I.readings r ON d.id = r.device_id
        LEFT JOIN %I.locations l ON d.location_id = l.id
        ORDER BY r.device_id, r.timestamp DESC
    ', schema_name, schema_name, schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER: Drop tenant schema
-- ============================================

CREATE OR REPLACE FUNCTION public.drop_tenant_schema(tenant_slug TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', 'tenant_' || tenant_slug);
END;
$$ LANGUAGE plpgsql;
