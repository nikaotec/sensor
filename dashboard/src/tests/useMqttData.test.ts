import { renderHook, act } from '@testing-library/react';
import { useMqttData } from '../hooks/useMqttData';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Fix: Mock environment variables
vi.stubGlobal('import.meta', {
    env: {
        VITE_MQTT_BROKER_URL: 'ws://localhost:9001'
    }
});

// Mock mqtt library
vi.mock('mqtt', () => ({
    default: {
        connect: vi.fn(() => {
            const mockClient = {
                on: vi.fn((event, cb) => {
                    if (event === 'connect') {
                        // Trigger connect callback immediately
                        setTimeout(() => cb({ cmd: 'connack' }), 0);
                    }
                }),
                subscribe: vi.fn(),
                publish: vi.fn(),
                end: vi.fn(),
                connected: true
            };
            return mockClient;
        })
    }
}));

// Mock supabase
vi.mock('../supabase/config', () => ({
    supabase: {
        from: vi.fn(() => ({
            update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
            })),
            insert: vi.fn(() => Promise.resolve({ error: null }))
        }))
    }
}));

describe('useMqttData offline detection', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should mark device as offline after 2 minutes of inactivity', async () => {
        const lastSeen = new Date();
        const initialDevices = [
            { id: 'dev-1', name: 'Test Device', status: 'online', lastSeen: lastSeen.toISOString(), tenantId: 'all', telemetry: {} }
        ];

        const { result } = renderHook(() => useMqttData('all', 'manager', initialDevices as any));

        // Allow async effects (connection) to run
        await act(async () => {
            vi.advanceTimersByTime(10);
        });

        // Initial state
        expect(result.current.devices[0].status).toBe('online');

        // Advance time by 1 minute (should still be online)
        act(() => {
            vi.advanceTimersByTime(60000);
        });
        expect(result.current.devices[0].status).toBe('online');

        // Advance time by another 1 minute and 1 second (total 121s)
        act(() => {
            vi.advanceTimersByTime(61000);
        });

        // Still might be online because interval runs every 30s. 
        // At 121s, the last check was at 120s.
        // We need to advance to 150s to be sure.
        // First alert detection
        act(() => {
            vi.advanceTimersByTime(30000);
        });

        expect(result.current.devices[0].status).toBe('offline');

        // Verify MQTT publish call
        const mockMqtt = (await import('mqtt')).default;
        const client = vi.mocked(mockMqtt.connect).mock.results[0].value;
        const lastCall = vi.mocked(client.publish).mock.calls[0];

        expect(lastCall).toBeDefined();
        const lastPayload = JSON.parse(lastCall[1] as string);
        expect(lastPayload).not.toHaveProperty('0');
        expect(lastPayload).toHaveProperty('TIPO', 'ALERTA_DISPOSITIVO_OFFLINE');
        expect(lastPayload).toHaveProperty('EMPRESA', 'all');
        expect(lastPayload).toHaveProperty('TEMP');
        expect(lastPayload).toHaveProperty('MAX');
        expect(lastPayload).toHaveProperty('ALARM_MAX');
        expect(lastPayload).toHaveProperty('VOLTAGEM');
        expect(lastPayload).toHaveProperty('RELES');
        // Trigger connect
        await act(async () => {
            const connectHandler = vi.mocked(client.on).mock.calls.find((call: any) => call[0] === 'connect')?.[1];
            if (connectHandler) connectHandler();
        });

        // --- SETUP: Provide a device ---
        const setupMsg = JSON.stringify({ ID_DISPOSITIVO: 'dev-1', TEMP: 25.0, TIPO: 'REALTIME' });
        await act(async () => {
            const messageHandler = vi.mocked(client.on).mock.calls.find((call: any) => call[0] === 'message')?.[1];
            if (messageHandler) messageHandler('esp32c3/data', Buffer.from(setupMsg));
        });

        expect(result.current.devices).toHaveLength(1);
        expect(result.current.devices[0].status).toBe('online');

        // Advance time to trigger 1st offline alert (2 mins)
        await act(async () => {
            vi.advanceTimersByTime(125000);
        });

        console.log(`[TEST] Status do dispositivo após 125s: ${result.current.devices[0].status}`);
        expect(result.current.devices[0].status).toBe('offline');
        let calls = vi.mocked(client.publish).mock.calls;
        expect(calls.some((c: any) => JSON.parse(c[1] as string).TIPO === 'ALERTA_DISPOSITIVO_OFFLINE')).toBe(true);

        // Clear mock calls to focus on recovery
        vi.mocked(client.publish).mockClear();

        // --- Test Recovery (Offline -> Online) ---
        const recoveryMessage = JSON.stringify({
            ID_DISPOSITIVO: 'dev-1',
            TEMP: 25.5,
            TIPO: 'REALTIME'
        });

        // Trigger 'message' event
        await act(async () => {
            const messageHandler = vi.mocked(client.on).mock.calls.find((call: any) => call[0] === 'message')?.[1];
            if (messageHandler) {
                messageHandler('esp32c3/data', Buffer.from(recoveryMessage));
            }
        });

        // Verify recovery alert was published
        const callsAfter = vi.mocked(client.publish).mock.calls;
        const recoveryCall = callsAfter.find((c: any) => JSON.parse(c[1] as string).TIPO === 'ALERTA_DISPOSITIVO_ONLINE');

        expect(recoveryCall, 'Recovery alert should have been sent').toBeDefined();

        // Verify localStorage was cleared
        expect(localStorage.getItem(`offline_last_sent_dev-1`)).toBeNull();
    });
});
