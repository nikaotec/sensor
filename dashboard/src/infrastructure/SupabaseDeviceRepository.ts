import { supabase } from '../supabase/config';
import type { Device, DeviceStatus } from '../domain/entities/Device';
import type { IDeviceRepository } from '../domain/repositories';

export class SupabaseDeviceRepository implements IDeviceRepository {
    private mapRowToDevice(row: any): Device {
        const dailyStats = row.daily_stats || {};
        return {
            id: row.id,
            name: row.name || row.device_name || row.id,
            tenantId: row.tenant_id,
            type: 'sensor_temp',
            status: (row.status || 'offline') as DeviceStatus,
            location: row.location || row.location_id || '',
            lastSeen: row.last_seen || row.updated_at || '',
            telemetry: {
                temp: row.temperature !== null ? row.temperature : undefined,
                humidity: row.humidity !== null ? row.humidity : undefined,
                batteryVoltage: row.battery !== null ? row.battery : undefined,
                inputVoltage: row.voltage !== null ? row.voltage : undefined,
                signal: row.signal !== null ? row.signal : undefined,
                doorOpen: row.door_open !== null ? row.door_open : undefined,
                tempMax: row.temp_max !== null ? row.temp_max
                    : (dailyStats.maxTemp !== undefined ? dailyStats.maxTemp : undefined),
                tempMin: row.temp_min !== null ? row.temp_min
                    : (dailyStats.minTemp !== undefined ? dailyStats.minTemp : undefined),
                tempExt: row.temp_ext !== null ? row.temp_ext : undefined,
                chkVolt: row.chk_volt !== null ? row.chk_volt : true,
                chkBat: row.chk_bat !== null ? row.chk_bat : true,
                chkTemp: row.chk_temp !== null ? row.chk_temp : true,
                chkDoor: row.chk_door !== null ? row.chk_door : true,
            }
        };
    }

    async getById(id: string): Promise<Device | null> {
        const { data, error } = await supabase
            .from('devices_status')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return null;
        return this.mapRowToDevice(data);
    }

    async listAll(): Promise<Device[]> {
        const { data, error } = await supabase
            .from('devices_status')
            .select('*');

        if (error) throw error;
        return (data || []).map(row => this.mapRowToDevice(row));
    }

    async listByTenant(tenantId: string): Promise<Device[]> {
        const { data, error } = await supabase
            .from('devices_status')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return (data || []).map(row => this.mapRowToDevice(row));
    }

    async updateStatus(id: string, status: string): Promise<void> {
        const { error } = await supabase
            .from('devices_status')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
    }
}
