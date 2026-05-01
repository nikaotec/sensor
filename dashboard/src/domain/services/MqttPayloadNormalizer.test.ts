import { describe, it, expect } from 'vitest';
import { MqttPayloadNormalizer } from './MqttPayloadNormalizer';

describe('MqttPayloadNormalizer', () => {
    it('should normalize a standard payload', () => {
        const payload = {
            id: 'dev_123',
            company: 'Nikaotec',
            temp: 25.5,
            humidity: 60
        };
        const result = MqttPayloadNormalizer.normalize(payload);
        expect(result?.deviceId).toBe('dev_123');
        expect(result?.company).toBe('Nikaotec');
        expect(result?.telemetry.temp).toBe(25.5);
        expect(result?.telemetry.humidity).toBe(60);
    });

    it('should handle alternative ID keys', () => {
        const payloads = [
            { ID_DISPOSITIVO: '123' },
            { ID: '123' },
            { deviceId: '123' },
            { device_id: '123' },
            { MAC: 'AA:BB:CC' }
        ];

        payloads.forEach(p => {
            const res = MqttPayloadNormalizer.normalize(p);
            expect(res?.deviceId).toBeDefined();
            if (p.MAC) expect(res?.deviceId).toBe('AA:BB:CC');
            else expect(res?.deviceId).toBe('123');
        });
    });

    it('should handle alternative company keys', () => {
        const payloads = [
            { id: '1', EMPRESA: 'CompA' },
            { id: '1', empresa: 'CompA' },
            { id: '1', tenant: 'CompA' }
        ];

        payloads.forEach(p => {
            const res = MqttPayloadNormalizer.normalize(p);
            expect(res?.company).toBe('CompA');
        });
    });

    it('should handle alternative telemetry keys', () => {
        const payload = {
            id: '1',
            TEMP_C: "26.1",
            UMIDADE: 55.5,
            BAT: 3.7,
            VOLT: 110,
            RSSI: -60,
            AMB: 28.0
        };

        const res = MqttPayloadNormalizer.normalize(payload);
        expect(res?.telemetry.temp).toBe(26.1);
        expect(res?.telemetry.humidity).toBe(55.5);
        expect(res?.telemetry.batteryVoltage).toBe(3.7);
        expect(res?.telemetry.inputVoltage).toBe(110);
        expect(res?.telemetry.signal).toBe(-60);
        expect(res?.telemetry.tempExt).toBe(28.0);
    });

    it('should handle boolean and string relay states', () => {
        expect(MqttPayloadNormalizer.normalize({ id: '1', relay: true })?.telemetry.relay).toBe('on');
        expect(MqttPayloadNormalizer.normalize({ id: '1', relay: 'on' })?.telemetry.relay).toBe('on');
        expect(MqttPayloadNormalizer.normalize({ id: '1', relay: 'LIG' })?.telemetry.relay).toBe('on');
        expect(MqttPayloadNormalizer.normalize({ id: '1', relay: 1 })?.telemetry.relay).toBe('on');

        expect(MqttPayloadNormalizer.normalize({ id: '1', relay: false })?.telemetry.relay).toBe('off');
        expect(MqttPayloadNormalizer.normalize({ id: '1', relay: 'off' })?.telemetry.relay).toBe('off');
        expect(MqttPayloadNormalizer.normalize({ id: '1', relay: 'DESL' })?.telemetry.relay).toBe('off');
        expect(MqttPayloadNormalizer.normalize({ id: '1', relay: 0 })?.telemetry.relay).toBe('off');
    });

    it('should return null for invalid payloads', () => {
        expect(MqttPayloadNormalizer.normalize(null)).toBeNull();
        expect(MqttPayloadNormalizer.normalize({})).toBeNull(); // No ID
        expect(MqttPayloadNormalizer.normalize({ company: 'X' })).toBeNull(); // No ID
    });

    it('should detect alerts', () => {
        const payload = { id: '1', TIPO: 'ALERTA_TEMPERATURA' };
        const res = MqttPayloadNormalizer.normalize(payload);
        expect(res?.alertType).toBe('ALERTA_TEMPERATURA');
    });
});
