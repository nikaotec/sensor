import { describe, it, expect } from 'vitest';
import { ProcessMqttUpdateUseCase } from './ProcessMqttUpdateUseCase';
import type { Device } from '../domain/entities/Device';
import type { NormalizedMqttUpdate } from '../domain/services/MqttPayloadNormalizer';

describe('ProcessMqttUpdateUseCase', () => {
    const useCase = new ProcessMqttUpdateUseCase();

    const mockDevices: Device[] = [
        {
            id: 'AA:BB:CC:11:22:33',
            name: 'Device 1',
            tenantId: 'company1',
            type: 'sensor',
            location: 'test',
            status: 'online',
            lastSeen: '2026-05-01T00:00:00Z',
            telemetry: {
                temp: 20,
                humidity: 50
            }
        }
    ];

    it('should match device by exact ID and update telemetry', () => {
        const update: NormalizedMqttUpdate = {
            deviceId: 'AA:BB:CC:11:22:33',
            company: 'company1',
            telemetry: {
                temp: 25
            },
            rawPayload: {}
        };

        const result = useCase.execute(update, mockDevices);

        expect(result.isNew).toBe(false);
        expect(result.index).toBe(0);
        expect(result.updatedDevice.telemetry?.temp).toBe(25);
        expect(result.updatedDevice.telemetry?.humidity).toBe(50); // Preserved
    });

    it('should match device by name if ID fails', () => {
        const update: NormalizedMqttUpdate = {
            deviceId: 'unknown-id',
            deviceName: 'Device 1',
            company: 'company1',
            telemetry: {
                temp: 30
            },
            rawPayload: {}
        };

        const result = useCase.execute(update, mockDevices);

        expect(result.isNew).toBe(false);
        expect(result.index).toBe(0);
        expect(result.updatedDevice.id).toBe('AA:BB:CC:11:22:33');
    });

    it('should perform fuzzy match for partial IDs', () => {
        const update: NormalizedMqttUpdate = {
            deviceId: '11:22:33', // Partial MAC
            company: 'company1',
            telemetry: {
                temp: 30
            },
            rawPayload: {}
        };

        const result = useCase.execute(update, mockDevices);

        expect(result.isNew).toBe(false);
        expect(result.index).toBe(0);
    });

    it('should handle new devices correctly', () => {
        const update: NormalizedMqttUpdate = {
            deviceId: 'XX:YY:ZZ',
            company: 'company1',
            telemetry: {
                temp: 15
            },
            rawPayload: {}
        };

        const result = useCase.execute(update, mockDevices);

        expect(result.isNew).toBe(true);
        expect(result.updatedDevice.id).toBe('XX:YY:ZZ');
        expect(result.updatedDevice.name).toBe('Desconhecido');
    });

    it('should not overwrite with undefined values', () => {
        const update: NormalizedMqttUpdate = {
            deviceId: 'AA:BB:CC:11:22:33',
            company: 'company1',
            telemetry: {
                temp: 22,
                humidity: undefined // Should be ignored
            } as any,
            rawPayload: {}
        };

        const result = useCase.execute(update, mockDevices);

        expect(result.updatedDevice.telemetry?.temp).toBe(22);
        expect(result.updatedDevice.telemetry?.humidity).toBe(50); // Kept old value
    });
});
