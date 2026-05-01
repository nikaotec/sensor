import { supabase } from '../supabase/config';
import type { DeviceEvent } from '../domain/entities/Event';
import type { IEventRepository } from '../domain/repositories';

export class SupabaseEventRepository implements IEventRepository {
    private mapRowToEvent(row: any): DeviceEvent {
        return {
            id: row.id,
            deviceId: row.device_id,
            type: row.details?.TIPO || row.type || '',
            message: row.message || row.msg,
            timestamp: row.timestamp,
            tenantId: row.tenant_id,
            userName: row.user_name,
            userEmail: row.user_email,
            source: row.source,
            value: row.value,
            details: row.details,
            severity: row.severity
        };
    }

    async listAll(limit: number = 50): Promise<DeviceEvent[]> {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []).map(row => this.mapRowToEvent(row));
    }

    async listByTenant(tenantId: string, limit: number = 50): Promise<DeviceEvent[]> {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []).map(row => this.mapRowToEvent(row));
    }

    async listByDevice(deviceId: string): Promise<DeviceEvent[]> {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('device_id', deviceId)
            .order('timestamp', { ascending: false })
            .limit(50);

        if (error) throw error;
        return (data || []).map(row => this.mapRowToEvent(row));
    }

    async save(event: DeviceEvent): Promise<void> {
        const { error } = await supabase.from('events').insert({
            device_id: event.deviceId,
            type: event.type,
            message: event.message,
            timestamp: event.timestamp || new Date().toISOString(),
            tenant_id: event.tenantId,
            user_name: event.userName,
            user_email: event.userEmail,
            source: event.source,
            value: event.value,
            details: event.details,
            severity: event.severity
        });

        if (error) throw error;
    }
}
