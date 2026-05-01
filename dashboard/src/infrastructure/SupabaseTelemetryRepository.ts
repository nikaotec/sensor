import { supabase } from '../supabase/config';
import type { ITelemetryRepository } from '../domain/repositories';
import type { Telemetry } from '../domain/entities/Telemetry';

export class SupabaseTelemetryRepository implements ITelemetryRepository {
    async listByDevice(deviceId: string, startDate: string, endDate: string): Promise<Telemetry[]> {
        const { data, error } = await supabase
            .from('telemetry')
            .select('*')
            .eq('device_id', deviceId)
            .gte('timestamp', startDate)
            .lte('timestamp', endDate)
            .order('timestamp', { ascending: true });

        if (error) {
            console.error('Error fetching telemetry:', error);
            return [];
        }

        return (data || []).map(item => ({
            id: item.id,
            deviceId: item.device_id,
            timestamp: item.timestamp,
            temperature: item.temp ?? item.TEMP ?? 0,
            humidity: item.humidity ?? item.UMIDADE,
            voltage: item.voltage ?? item.VOLTAGEM,
            battery: item.battery ?? item.BATERIA,
            signal: item.signal ?? item.RSSI,
            doorOpen: item.door_open ?? item.PORTA_ABERTA,
            type: item.type || 'periodico'
        }));
    }

    async save(telemetry: Telemetry): Promise<void> {
        const { error } = await supabase
            .from('telemetry')
            .insert({
                device_id: telemetry.deviceId,
                timestamp: telemetry.timestamp,
                temp: telemetry.temperature,
                humidity: telemetry.humidity,
                voltage: telemetry.voltage,
                battery: telemetry.battery,
                signal: telemetry.signal,
                door_open: telemetry.doorOpen,
                type: telemetry.type
            });

        if (error) throw error;
    }
}
