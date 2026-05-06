import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMqttData } from './useMqttData';
import { emqxMqttService } from '../infrastructure/EmqxMqttService';
import type { Device } from '../domain/entities/Device';

// Mock do service singleton
vi.mock('../infrastructure/EmqxMqttService', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        emqxMqttService: {
            connect: vi.fn(),
            getState: vi.fn().mockReturnValue('connected'),
            onStateChange: vi.fn().mockReturnValue(() => { }),
            onMessage: vi.fn().mockReturnValue(() => { }),
            publish: vi.fn(),
        },
    };
});

describe('useMqttData hook', () => {
    const initialDevices: Device[] = [
        {
            id: '123',
            name: 'Device 1',
            tenantId: 'company1',
            type: 'sensor',
            location: 'test',
            status: 'offline',
            lastSeen: '',
            telemetry: {}
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with initial devices', () => {
        const { result } = renderHook(() => useMqttData({ id: 'all' }, 'admin', initialDevices));
        expect(result.current.devices).toEqual(initialDevices);
    });

    it('should update device telemetry when MQTT message arrives', () => {
        let messageHandler: any;
        (emqxMqttService.onMessage as any).mockImplementation((handler: any) => {
            messageHandler = handler;
            return () => { };
        });

        const { result } = renderHook(() => useMqttData({ id: 'company1' }, 'admin', initialDevices));

        act(() => {
            messageHandler({
                topic: 'telemetria/123',
                payload: { id: '123', company: 'company1', temp: 28.5 }
            });
        });

        expect(result.current.devices[0].telemetry?.temp).toBe(28.5);
        expect(result.current.devices[0].status).toBe('online');
    });

    it('should ignore messages from different tenants', () => {
        let messageHandler: any;
        (emqxMqttService.onMessage as any).mockImplementation((handler: any) => {
            messageHandler = handler;
            return () => { };
        });

        const { result } = renderHook(() => useMqttData({ id: 'my-company' }, 'admin', initialDevices));

        act(() => {
            messageHandler({
                topic: 'telemetria/123',
                payload: { id: '123', company: 'other-company', temp: 30 }
            });
        });

        // Telemetry should NOT be updated
        expect(result.current.devices[0].telemetry?.temp).toBeUndefined();
    });

    it('should call onAlert callback when alert message arrives', () => {
        const onAlert = vi.fn();
        let messageHandler: any;
        (emqxMqttService.onMessage as any).mockImplementation((handler: any) => {
            messageHandler = handler;
            return () => { };
        });

        renderHook(() => useMqttData({ id: 'all' }, 'admin', initialDevices, onAlert));

        act(() => {
            messageHandler({
                topic: 'telemetria/123',
                payload: { id: '123', company: 'company1', TIPO: 'ALERTA_TEMP', temp: 50 }
            });
        });

        expect(onAlert).toHaveBeenCalled();
    });
});
