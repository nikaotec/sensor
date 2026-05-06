import { vi } from 'vitest';
import type { IMqttService, MqttMessage, ConnectionState } from '../../infrastructure/EmqxMqttService';
import { ConnectionState as ConnectionStateConst } from '../../infrastructure/EmqxMqttService';

export class MqttServiceMock implements IMqttService {
    public connect = vi.fn();
    public destroy = vi.fn();
    public publish = vi.fn();
    public getState = vi.fn().mockReturnValue(ConnectionStateConst.Connected);

    private messageHandlers = new Set<(msg: MqttMessage) => void>();
    private stateHandlers = new Set<(state: ConnectionState) => void>();

    public onMessage(handler: (msg: MqttMessage) => void) {
        this.messageHandlers.add(handler);
        return () => {
            this.messageHandlers.delete(handler);
        };
    }

    public onStateChange(handler: (state: ConnectionState) => void) {
        this.stateHandlers.add(handler);
        return () => {
            this.stateHandlers.delete(handler);
        };
    }

    // Helper para os testes dispararem mensagens
    public simulateMessage(topic: string, payload: any) {
        this.messageHandlers.forEach(handler => handler({ topic, payload }));
    }

    // Helper para os testes dispararem mudança de estado
    public simulateStateChange(state: ConnectionState) {
        this.getState.mockReturnValue(state);
        this.stateHandlers.forEach(handler => handler(state));
    }
}
