import { describe, it, expect } from 'vitest';
import { ProcessMqttUpdateUseCase } from './ProcessMqttUpdateUseCase';
import type { Device } from '../domain/entities/Device';
import type { NormalizedMqttUpdate } from './MqttPayloadNormalizer';

describe('ProcessMqttUpdateUseCase', () => {
    const useCase = new ProcessMqttUpdateUseCase();

    it('should update telemetry and status of an existing device', () => {
        const devices: Device[] = [
            { id: '1', name: 'Device 1', tenantId: 't1', status: 'offline', type: 'sensor', lastSeen: '', location: '', telemetry: { temp: 20 } }
        ];
        const update: NormalizedMqttUpdate = {
            deviceId: '1',
            company: 't1',
            telemetry: { temp: 25 },
            rawPayload: {}
        };

        const result = useCase.execute(update, devices);
        expect(result.updatedDevice.telemetry.temp).toBe(25);
        expect(result.updatedDevice.status).toBe('online');
    });

    it('should match devices even with different casing in ID', () => {
        const devices: Device[] = [
            { id: 'ABCD', name: 'Device 1', tenantId: 't1', status: 'online', type: 'sensor', lastSeen: '', location: '', telemetry: {} }
        ];
        const update: NormalizedMqttUpdate = {
            deviceId: 'abcd',
            company: 't1',
            telemetry: { temp: 25 },
            rawPayload: {}
        };

        const result = useCase.execute(update, devices);
        expect(result.updatedDevice.telemetry.temp).toBe(25);
        expect(result.index).toBe(0);
    });

    it('should merge telemetry fields without wiping existing ones with undefined', () => {
        const devices: Device[] = [
            { id: '1', name: 'Device 1', tenantId: 't1', status: 'online', type: 'sensor', lastSeen: '', location: '', telemetry: { temp: 20, humidity: 50 } }
        ];
        const update: NormalizedMqttUpdate = {
            deviceId: '1',
            company: 't1',
            telemetry: { temp: 25, humidity: undefined } as any,
            rawPayload: {}
        };

        const result = useCase.execute(update, devices);
        expect(result.updatedDevice.telemetry.temp).toBe(25);
        expect(result.updatedDevice.telemetry.humidity).toBe(50);
    });
});
