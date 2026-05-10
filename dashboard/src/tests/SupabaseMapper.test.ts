import { describe, it, expect } from 'vitest';
import { mapRowToDevice } from '../services/SupabaseMapper';
import type { SupabaseDeviceRow } from '../services/SupabaseMapper';

describe('SupabaseMapper', () => {
    it('deve mapear uma linha completa do Supabase para um objeto Device corretamente', () => {
        const row: SupabaseDeviceRow = {
            id: 'dev_123',
            name: 'Sensor Geladeira',
            tenant_id: 'tenant_abc',
            status: 'online',
            location: 'Cozinha',
            last_seen: '2023-10-27T10:00:00Z',
            temperature: 5.5,
            humidity: 45,
            battery: 3.7,
            voltage: 127,
            signal: -65,
            door_open: false,
            temp_max: 8.0,
            temp_min: 2.0,
            chk_volt: true,
            chk_bat: true,
            chk_temp: true,
            chk_door: true
        };

        const result = mapRowToDevice(row);

        expect(result.id).toBe('dev_123');
        expect(result.name).toBe('Sensor Geladeira');
        expect(result.status).toBe('online');
        expect(result.telemetry.temp).toBe(5.5);
        expect(result.telemetry.tempMax).toBe(8.0);
        expect(result.telemetry.chkVolt).toBe(true);
    });

    it('deve usar valores padrão quando campos opcionais estão ausentes', () => {
        const row: SupabaseDeviceRow = {
            id: 'dev_minimal',
            tenant_id: 'tenant_abc'
        };

        const result = mapRowToDevice(row);

        expect(result.name).toBe('dev_minimal');
        expect(result.status).toBe('offline');
        expect(result.telemetry.temp).toBeUndefined();
        expect(result.telemetry.chkVolt).toBe(true); // Default true para monitoramento
    });

    it('deve priorizar daily_stats se temp_max/min forem nulos', () => {
        const row: SupabaseDeviceRow = {
            id: 'dev_stats',
            tenant_id: 'tenant_abc',
            temp_max: undefined,
            temp_min: undefined,
            daily_stats: {
                maxTemp: 10.5,
                minTemp: 1.5
            }
        };

        const result = mapRowToDevice(row);

        expect(result.telemetry.tempMax).toBe(10.5);
        expect(result.telemetry.tempMin).toBe(1.5);
    });
});
