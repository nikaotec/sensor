import { describe, it, expect } from 'vitest';
import { MqttPayloadNormalizer } from './MqttPayloadNormalizer';

describe('MqttPayloadNormalizer', () => {
    it('should return null for invalid payloads', () => {
        expect(MqttPayloadNormalizer.normalize(null)).toBeNull();
        expect(MqttPayloadNormalizer.normalize(undefined)).toBeNull();
        expect(MqttPayloadNormalizer.normalize('not an object')).toBeNull();
    });

    it('should extract device ID from various keys', () => {
        expect(MqttPayloadNormalizer.normalize({ id: '123' })?.deviceId).toBe('123');
        expect(MqttPayloadNormalizer.normalize({ ID_DISPOSITIVO: '456' })?.deviceId).toBe('456');
        expect(MqttPayloadNormalizer.normalize({ MAC: 'AA:BB' })?.deviceId).toBe('AA:BB');
    });

    it('should normalize telemetry data with aliases', () => {
        const payload = {
            id: '123',
            TEMP: 25.5,
            UMIDADE: 60,
            BAT: 3.7,
            VOLT: 5.0,
            RSSI: -70
        };

        const normalized = MqttPayloadNormalizer.normalize(payload);
        expect(normalized?.telemetry.temp).toBe(25.5);
        expect(normalized?.telemetry.humidity).toBe(60);
        expect(normalized?.telemetry.batteryVoltage).toBe(3.7);
        expect(normalized?.telemetry.inputVoltage).toBe(5.0);
        expect(normalized?.telemetry.signal).toBe(-70);
    });

    it('should extract firmware version from multi-platform keys', () => {
        expect(MqttPayloadNormalizer.normalize({ id: '1', FW_VERSION: '1.2.3' })?.telemetry.fwVersion).toBe('1.2.3');
        expect(MqttPayloadNormalizer.normalize({ id: '1', fw_version: '1.2.4' })?.telemetry.fwVersion).toBe('1.2.4');
        expect(MqttPayloadNormalizer.normalize({ id: '1', VER: '1.2.5' })?.telemetry.fwVersion).toBe('1.2.5');
        expect(MqttPayloadNormalizer.normalize({ id: '1', version: '1.2.6' })?.telemetry.fwVersion).toBe('1.2.6');
    });

    it('should correctly parse boolean door status', () => {
        expect(MqttPayloadNormalizer.normalize({ id: '1', PORTA_ABERTA: 1 })?.telemetry.doorOpen).toBe(true);
        expect(MqttPayloadNormalizer.normalize({ id: '1', PORTA_ABERTA: 0 })?.telemetry.doorOpen).toBe(false);
        expect(MqttPayloadNormalizer.normalize({ id: '1', door: true })?.telemetry.doorOpen).toBe(true);
    });

    it('should correctly parse relay status', () => {
        expect(MqttPayloadNormalizer.normalize({ id: '1', relay: 1 })?.telemetry.relay).toBe('on');
        expect(MqttPayloadNormalizer.normalize({ id: '1', RELAY: 'off' })?.telemetry.relay).toBe('off');
        expect(MqttPayloadNormalizer.normalize({ id: '1', rele: 'lig' })?.telemetry.relay).toBe('on');
    });

    it('should identify alert types', () => {
        expect(MqttPayloadNormalizer.normalize({ id: '1', TIPO: 'ALERTA_TEMP' })?.alertType).toBe('ALERTA_TEMP');
        expect(MqttPayloadNormalizer.normalize({ id: '1', TIPO: 'HEARTBEAT' })?.alertType).toBeUndefined();
    });
});
