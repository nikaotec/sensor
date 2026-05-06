import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmqxMqttService, ConnectionState } from './EmqxMqttService';
import mqtt from 'mqtt';

// Mock da biblioteca mqtt
vi.mock('mqtt', () => ({
    default: {
        connect: vi.fn(),
    },
}));

describe('EmqxMqttService', () => {
    let service: EmqxMqttService;
    let mockClient: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockClient = {
            on: vi.fn(),
            subscribe: vi.fn(),
            publish: vi.fn(),
            end: vi.fn(),
        };
        (mqtt.connect as any).mockReturnValue(mockClient);
        service = new EmqxMqttService({ url: 'ws://mock' });
    });

    it('should initialize in disconnected state', () => {
        expect(service.getState()).toBe(ConnectionState.Disconnected);
    });

    it('should transition to connecting when connect is called', () => {
        service.connect();
        expect(service.getState()).toBe(ConnectionState.Connecting);
        expect(mqtt.connect).toHaveBeenCalledWith('ws://mock', expect.any(Object));
    });

    it('should notify state change to connected', () => {
        const stateHandler = vi.fn();
        service.onStateChange(stateHandler);

        service.connect();

        // Simular evento 'connect' do socket
        const connectCallback = mockClient.on.mock.calls.find((call: any) => call[0] === 'connect')[1];
        connectCallback();

        expect(service.getState()).toBe(ConnectionState.Connected);
        expect(stateHandler).toHaveBeenCalledWith(ConnectionState.Connected);
    });

    it('should subscribe to default topics on connect', () => {
        service.connect();
        const connectCallback = mockClient.on.mock.calls.find((call: any) => call[0] === 'connect')[1];
        connectCallback();

        expect(mockClient.subscribe).toHaveBeenCalledWith(['telemetria/#', 'esp32c3/#', 'nikaotec/#'], expect.any(Function));
    });

    it('should dispatch messages to handlers', () => {
        const messageHandler = vi.fn();
        service.onMessage(messageHandler);
        service.connect();

        // Simular evento 'message'
        const messageCallback = mockClient.on.mock.calls.find((call: any) => call[0] === 'message')[1];
        const payload = JSON.stringify({ temp: 25 });
        messageCallback('test/topic', Buffer.from(payload));

        expect(messageHandler).toHaveBeenCalledWith({
            topic: 'test/topic',
            payload: { temp: 25 }
        });
    });

    it('should cleanup handlers when subscription is cleared', () => {
        const messageHandler = vi.fn();
        const unsubscribe = service.onMessage(messageHandler);

        unsubscribe();
        service.connect();

        const messageCallback = mockClient.on.mock.calls.find((call: any) => call[0] === 'message')[1];
        messageCallback('test/topic', Buffer.from('{}'));

        expect(messageHandler).not.toHaveBeenCalled();
    });

    it('should not publish if not connected', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        service.publish('test/topic', { data: 1 });
        expect(mockClient.publish).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
