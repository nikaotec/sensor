import { describe, it, expect } from 'vitest';
import { ProcessMqttUpdateUseCase } from './ProcessMqttUpdateUseCase';
import type { Device } from '../domain/entities/Device';
import type { NormalizedMqttUpdate } from '../domain/services/MqttPayloadNormalizer';

describe('ProcessMqttUpdateUseCase', () => {
    const useCase = new ProcessMqttUpdateUseCase();

    const mockDevices: Device[] = [
        {
            id: 'abc-123',
            name: 'Sensor Cozinha',
            tenantId: 'tenant-uuid',
            type: 'sensor',
            status: 'offline',
            location: 'Cozinha',
            lastSeen: '',
            telemetry: {}
        }
    ];

    it('should match device by exact ID and update status to online', () => {
        const update: NormalizedMqttUpdate = {
            deviceId: 'abc-123',
            company: 'tenant-uuid',
            telemetry: { temp: 25.5 },
            rawPayload: {}
        };

        const result = useCase.execute(update, mockDevices);

        expect(result.index).toBe(0);
        expect(result.updatedDevice.status).toBe('online');
        expect(result.updatedDevice.mqttUpdated).toBe(true);
        expect(result.updatedDevice.telemetry.temp).toBe(25.5);
    });

    it('should match device by case-insensitive ID', () => {
        const update: NormalizedMqttUpdate = {
            deviceId: 'ABC-123',
            company: 'tenant-uuid',
            telemetry: { temp: 25.5 },
            rawPayload: {}
        };

        const result = useCase.execute(update, mockDevices);
        expect(result.index).toBe(0);
    });

    it('should match device by name if ID fails', () => {
        const update: NormalizedMqttUpdate = {
            deviceId: 'unknown-id',
            deviceName: 'Sensor Cozinha',
            company: 'tenant-uuid',
            telemetry: { temp: 25.5 },
            rawPayload: {}
        };

        const result = useCase.execute(update, mockDevices);
        expect(result.index).toBe(0);
    });

    it('should handle MAC address normalization (Hypothesis)', () => {
        const devices: Device[] = [
            {
                id: 'AA:BB:CC:DD:EE:FF',
                name: 'Sensor MAC',
                tenantId: 't1',
                type: 'sensor',
                status: 'offline',
                location: '',
                lastSeen: '',
                telemetry: {}
            }
        ];

        // Sensor sends MAC without colons
        const update: NormalizedMqttUpdate = {
            deviceId: 'AABBCCDDEEFF',
            company: 't1',
            telemetry: { temp: 20 },
            rawPayload: {}
        };

        const result = useCase.execute(update, devices);

        // This is expected to FAIL currently as the fuzzy match 'includes' might work 
        // but 'AABBCCDDEEFF' does NOT include 'AA:BB:CC:DD:EE:FF'
        // and vice versa.
        expect(result.index).toBe(0);
    });
});
