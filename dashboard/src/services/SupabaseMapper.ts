import type { Device } from '../data/mockData';
import { TelemetryService } from './TelemetryService';

export interface SupabaseDeviceRow {
    id: string;
    name?: string;
    device_name?: string;
    tenant_id?: string;
    tenantId?: string;
    status?: 'online' | 'offline' | 'warning' | 'error';
    location?: string;
    location_id?: string;
    last_seen?: string;
    lastSeen?: string;
    updated_at?: string;
    updatedAt?: string;
    firmware_version?: string;
    firmwareVersion?: string;
    alerts_paused?: boolean;
    alertsPaused?: boolean;
    // ... outros campos são tratados pelo TelemetryService
    [key: string]: any;
}

export const mapRowToDevice = (row: SupabaseDeviceRow): Device => {
    const normalized = TelemetryService.normalizePayload(row);

    return {
        id: row.id,
        name: row.name || row.device_name || row.id,
        tenantId: row.tenantId || row.tenant_id || '',
        type: 'sensor_temp',
        status: row.status || 'offline',
        location: row.location || row.location_id || '',
        lastSeen: row.lastSeen || row.last_seen || row.updatedAt || row.updated_at || '',
        firmwareVersion: row.firmwareVersion || row.firmware_version || normalized.version || undefined,
        telemetry: normalized as any,
        alerts_paused: row.alertsPaused ?? row.alerts_paused ?? false
    };
};
