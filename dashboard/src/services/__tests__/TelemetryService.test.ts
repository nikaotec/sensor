import { describe, it, expect } from 'vitest';
import { TelemetryService } from '../TelemetryService';

describe('TelemetryService', () => {
    it('should normalize telemetry from legacy firmware (uppercase keys)', () => {
        const payload = {
            ID_DISPOSITIVO: 'ESP32_MAC',
            EMPRESA: 'TEST_CORP',
            DISPOSITIVO: 'Sensor 01',
            TEMP_ATUAL: '25.5',
            TEMP_MAX: '30.0',
            TEMP_MIN: '20.0',
            BATERIA: '12.6',
            VOLTAGEM: '220',
            RSSI: '-65',
            ALA: 'Ala Norte'
        };

        const result = TelemetryService.normalizePayload(payload);

        expect(result.id).toBe('ESP32_MAC');
        expect(result.company).toBe('TEST_CORP');
        expect(result.device_name).toBe('Sensor 01');
        expect(result.temp).toBe(25.5);
        expect(result.tempMax).toBe(30.0);
        expect(result.tempMin).toBe(20.0);
        expect(result.batteryVoltage).toBe(12.6);
        expect(result.inputVoltage).toBe(220);
        expect(result.signal).toBe(-65);
        expect(result.ala).toBe('Ala Norte');
    });

    it('should normalize telemetry from modern firmware (lowercase keys)', () => {
        const payload = {
            id: 'ESP32_MAC_MODERN',
            company: 'NI KAOTECH',
            device_name: 'Sensor 02',
            temp: 24.8,
            tempMax: 29.0,
            tempMin: 18.5,
            batteryVoltage: 11.8,
            inputVoltage: 110,
            signal: -70,
            ala: 'Ala Sul'
        };

        const result = TelemetryService.normalizePayload(payload);

        expect(result.id).toBe('ESP32_MAC_MODERN');
        expect(result.company).toBe('NI KAOTECH');
        expect(result.temp).toBe(24.8);
        expect(result.batteryVoltage).toBe(11.8);
    });

    it('should normalize hysteresis enrichment fields (Fix BUG Sincronia)', () => {
        const payload = {
            id: 'ESP32_HYST',
            R0_TEMP_ON: '7.5',
            R0_TEMP_OFF: '2.5',
            R0_FUNC: 1
        };

        const result = TelemetryService.normalizePayload(payload);

        expect(result.R0_TEMP_ON).toBe(7.5);
        expect(result.R0_TEMP_OFF).toBe(2.5);
        expect(result.R0_FUNC).toBe(1);
    });

    it('should handle relay object format', () => {
        const payload = {
            RELES: {
                R0: 1,
                R1: 0,
                R2: 1,
                R3: 1
            }
        };

        const result = TelemetryService.normalizePayload(payload);

        expect(result.rele0).toBe(true);
        expect(result.rele1).toBe(false);
        expect(result.rele2).toBe(true);
        expect(result.rele3).toBe(true);
        expect(result.rele).toBe(true); // Fallback for R0
    });

    it('should normalize telemetry from Supabase row (snake_case, hysteresis and limits)', () => {
        const row = {
            id: 'ESP32_DB',
            temperature: 26.5,
            battery: 12.4,
            voltage: 220,
            temp_max: 30.5, // alerta max
            temp_min: 15.0, // alerta min
            volt_max: 240,
            volt_min: 200,
            bat_min: 11.5,
            tempo_porta: 60,
            r0_temp_on: 8.5,
            r0_temp_off: 3.5,
            r0_func: 1,
            chk_volt: 1,
            chk_bat: 0
        };

        const result = TelemetryService.normalizePayload(row);

        expect(result.id).toBe('ESP32_DB');
        expect(result.temp).toBe(26.5);
        expect(result.batteryVoltage).toBe(12.4);
        expect(result.inputVoltage).toBe(220);
        expect(result.alarmMax).toBe(30.5);
        expect(result.alarmMin).toBe(15.0);
        expect(result.voltMaxLimit).toBe(240);
        expect(result.voltMinLimit).toBe(200);
        expect(result.batMinLimit).toBe(11.5);
        expect(result.doorMaxTime).toBe(60);
        expect(result.R0_TEMP_ON).toBe(8.5);
        expect(result.R0_TEMP_OFF).toBe(3.5);
        expect(result.R0_FUNC).toBe(1);
        expect(result.chkVolt).toBe(true);
        expect(result.chkBat).toBe(false);
    });

    it('should NOT include keys with undefined values for partial payloads', () => {
        const partialPayload = {
            id: 'ESP32_PARTIAL',
            temp: 25.5
        };

        const result = TelemetryService.normalizePayload(partialPayload);

        expect(result.id).toBe('ESP32_PARTIAL');
        expect(result.temp).toBe(25.5);

        // Garantir que chaves não enviadas não existem no objeto (nem como undefined)
        expect(result).not.toHaveProperty('batteryVoltage');
        expect(result).not.toHaveProperty('alarmMax');
        expect(result).not.toHaveProperty('rele0');
        expect(result).not.toHaveProperty('R0_TEMP_ON');
    });
});
