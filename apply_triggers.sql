-- =====================================================================================
-- NIKAOTEC - IoT Data Isolation & Tenant Protection Triggers
-- =====================================================================================
-- Estes triggers garantem que:
-- 1. O N8N não zere o tenant_id de um dispositivo de volta para 'Unknown' após um gestor vinculá-lo.
-- 2. Dispositivos não vinculados (Unknown, Nikaotec, empresa_default) NUNCA registrem 
--    eventos, telemetria horária ou telemetria em tempo real no banco de dados.
-- ISSO REDUZ CUSTOS DE BANCO E PROTEGE A INTEGRIDADE DO DASHBOARD.
-- =====================================================================================

-- =======================================================
-- 1. PROTEÇÃO DA TABELA: devices_status
-- Impede que o N8N sobrescreva um vínculo válido
-- =======================================================
CREATE OR REPLACE FUNCTION protect_devices_status() RETURNS trigger AS $$
BEGIN
    -- Impede a criação de registros inúteis de dispositivos ainda soltos no MQTT.
    -- (O ManagerPanel verá o dispositivo via WebSockets do MQTT e criará o registro via Upsert)
    IF TG_OP = 'INSERT' THEN
        IF NEW.tenant_id IN ('Unknown', 'empresa_default', 'Nikaotec') OR NEW.tenant_id IS NULL THEN
            RETURN NULL; -- Aborta silenciosamente o INSERT
        END IF;
    END IF;

    -- Protege contra sobrescrita acidental feita pelos fluxos do N8N (MQTT -> Supabase)
    IF TG_OP = 'UPDATE' THEN
        IF OLD.tenant_id IS NOT NULL AND OLD.tenant_id NOT IN ('Unknown', 'empresa_default', 'Nikaotec') THEN
            IF NEW.tenant_id IN ('Unknown', 'empresa_default', 'Nikaotec') OR NEW.tenant_id IS NULL THEN
                NEW.tenant_id = OLD.tenant_id; -- Força manter a empresa verdadeira
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_devices_status_protect ON devices_status;
CREATE TRIGGER trg_devices_status_protect
BEFORE INSERT OR UPDATE ON devices_status
FOR EACH ROW EXECUTE FUNCTION protect_devices_status();


-- =======================================================
-- 2. PROTEÇÃO DA TABELA: telemetry
-- =======================================================
CREATE OR REPLACE FUNCTION protect_telemetry() RETURNS trigger AS $$
DECLARE
    v_tenant_id text;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM devices_status WHERE id = NEW.device_id;
    
    IF v_tenant_id IS NULL OR v_tenant_id IN ('Unknown', 'empresa_default', 'Nikaotec') THEN
        RETURN NULL; -- Não registra telemetria para chips órfãos
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_telemetry_protect ON telemetry;
CREATE TRIGGER trg_telemetry_protect
BEFORE INSERT ON telemetry
FOR EACH ROW EXECUTE FUNCTION protect_telemetry();


-- =======================================================
-- 3. PROTEÇÃO DA TABELA: hourly_telemetry
-- =======================================================
DROP TRIGGER IF EXISTS trg_hourly_telemetry_protect ON hourly_telemetry;
CREATE TRIGGER trg_hourly_telemetry_protect
BEFORE INSERT ON hourly_telemetry
FOR EACH ROW EXECUTE FUNCTION protect_telemetry(); 


-- =======================================================
-- 4. PROTEÇÃO E REESCRITA DA TABELA: events
-- =======================================================
CREATE OR REPLACE FUNCTION protect_events() RETURNS trigger AS $$
DECLARE
    v_tenant_id text;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM devices_status WHERE id = NEW.device_id;
    
    IF v_tenant_id IS NULL OR v_tenant_id IN ('Unknown', 'empresa_default', 'Nikaotec') THEN
        RETURN NULL; -- Não registra alertas/eventos para chips órfãos
    END IF;
    
    -- Opcional: força o evento a usar o tenant correto da tabela mãe (ignora payload do hardware)
    NEW.tenant_id = v_tenant_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_protect ON events;
CREATE TRIGGER trg_events_protect
BEFORE INSERT ON events
FOR EACH ROW EXECUTE FUNCTION protect_events();
