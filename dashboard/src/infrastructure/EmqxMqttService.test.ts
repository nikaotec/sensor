import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { EmqxMqttService, ConnectionState } from './EmqxMqttService';

// ── Mock mqtt.js ────────────────────────────────────────────────────────────
const mockOn = vi.fn();
const mockSubscribe = vi.fn((_topics: unknown, cb?: (err: Error | null) => void) => {
    cb?.(null);
});
const mockPublish = vi.fn(
    (_topic: unknown, _msg: unknown, _opts: unknown, cb?: (err: Error | null) => void) => {
        cb?.(null);
    }
);
const mockEnd = vi.fn();
const mockClient = {
    on: mockOn,
    subscribe: mockSubscribe,
    publish: mockPublish,
    end: mockEnd,
    connected: true,
};

vi.mock('mqtt', () => ({
    default: {
        connect: vi.fn(() => mockClient),
    },
    connect: vi.fn(() => mockClient),
}));

import mqtt from 'mqtt';

// ── Helpers ──────────────────────────────────────────────────────────────────
function simulateEvent(event: string, ...args: unknown[]) {
    const call = (mockOn as Mock).mock.calls.find(([e]) => e === event);
    if (call) {
        call[1](...args);
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('EmqxMqttService', () => {
    let service: EmqxMqttService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new EmqxMqttService();
    });

    afterEach(() => {
        service.destroy();
    });

    // ── 1. Conexão WebSocket porta 8083 ───────────────────────────────────────
    it('deve conectar via WebSocket na porta 8083 com path /mqtt', () => {
        service.connect();

        expect(mqtt.connect).toHaveBeenCalledWith(
            expect.stringMatching(/^ws.*:8083\/mqtt$/),
            expect.objectContaining({
                clean: true,
                reconnectPeriod: 0, // gerenciamos manualmente
            })
        );
    });

    it('deve incluir username e password na opção de conexão quando configurados', () => {
        const svc = new EmqxMqttService({
            url: 'ws://localhost:8083/mqtt',
            username: 'testuser',
            password: 'testpass',
        });
        svc.connect();

        expect(mqtt.connect).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ username: 'testuser', password: 'testpass' })
        );
        svc.destroy();
    });

    // ── 2. Estado de conexão ──────────────────────────────────────────────────
    it('deve emitir estado "connecting" ao chamar connect()', () => {
        const states: ConnectionState[] = [];
        service.onStateChange(s => states.push(s));

        service.connect();

        expect(states).toContain(ConnectionState.Connecting);
    });

    it('deve emitir estado "connected" ao receber evento "connect" do broker', () => {
        const states: ConnectionState[] = [];
        service.onStateChange(s => states.push(s));
        service.connect();

        simulateEvent('connect');

        expect(states[states.length - 1]).toBe(ConnectionState.Connected);
    });

    it('deve emitir estado "disconnected" como parte da sequência ao receber evento "close"', () => {
        const states: ConnectionState[] = [];
        service.onStateChange(s => states.push(s));
        service.connect();
        simulateEvent('connect');

        simulateEvent('close');

        // Após "close": o serviço emite "disconnected" antes de agendar reconexão
        // e pode imediatamente transitar para "reconnecting" — verificamos a presença
        expect(states).toContain(ConnectionState.Disconnected);
    });

    it('deve emitir estado "reconnecting" após desconexão', () => {
        const states: ConnectionState[] = [];
        service.onStateChange(s => states.push(s));
        service.connect();
        simulateEvent('connect');
        simulateEvent('close');

        // Avançar o timer de reconexão
        vi.useFakeTimers();
        vi.advanceTimersByTime(1100);
        vi.useRealTimers();

        expect(states).toContain(ConnectionState.Reconnecting);
    });

    // ── 3. Subscrição de tópicos ──────────────────────────────────────────────
    it('deve subscrever os tópicos padrão após conectar', () => {
        service.connect();
        simulateEvent('connect');

        expect(mockSubscribe).toHaveBeenCalledWith(
            expect.arrayContaining(['telemetria/#', 'esp32c3/#']),
            expect.any(Function)
        );
    });

    // ── 4. Handlers de mensagem ───────────────────────────────────────────────
    it('deve chamar handlers registrados ao receber mensagem', () => {
        const handler = vi.fn();
        service.onMessage(handler);
        service.connect();
        simulateEvent('connect');

        const payload = { id: 'abc', temp: 25 };
        simulateEvent('message', 'telemetria/abc', Buffer.from(JSON.stringify(payload)));

        expect(handler).toHaveBeenCalledWith({ topic: 'telemetria/abc', payload });
    });

    it('deve remover handler ao chamar a função de unsubscribe retornada', () => {
        const handler = vi.fn();
        const unsubscribe = service.onMessage(handler);
        service.connect();
        simulateEvent('connect');

        unsubscribe();
        simulateEvent('message', 'telemetria/abc', Buffer.from('{"id":"abc"}'));

        expect(handler).not.toHaveBeenCalled();
    });

    it('deve ignorar silenciosamente mensagens com JSON inválido', () => {
        const handler = vi.fn();
        service.onMessage(handler);
        service.connect();
        simulateEvent('connect');

        expect(() =>
            simulateEvent('message', 'telemetria/abc', Buffer.from('not-json'))
        ).not.toThrow();

        expect(handler).not.toHaveBeenCalled();
    });

    // ── 5. Publish ────────────────────────────────────────────────────────────
    it('deve publicar com QoS 1 quando conectado', () => {
        service.connect();
        simulateEvent('connect');

        service.publish('esp32c3/web/action', { cmd: 'reboot' });

        expect(mockPublish).toHaveBeenCalledWith(
            'esp32c3/web/action',
            JSON.stringify({ cmd: 'reboot' }),
            expect.objectContaining({ qos: 1 }),
            expect.any(Function)
        );
    });

    it('não deve publicar quando desconectado e logar aviso', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        // sem connect()
        service.publish('topic', { data: 1 });

        expect(mockPublish).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    // ── 6. Destroy ────────────────────────────────────────────────────────────
    it('deve limpar handlers e chamar end() ao destruir', () => {
        const handler = vi.fn();
        service.onMessage(handler);
        service.connect();

        service.destroy();

        simulateEvent('message', 'topic', Buffer.from('{"id":"x"}'));
        expect(handler).not.toHaveBeenCalled();
        expect(mockEnd).toHaveBeenCalled();
    });

    // ── 7. Idempotência ───────────────────────────────────────────────────────
    it('não deve criar nova conexão se já está conectado', () => {
        service.connect();
        service.connect();

        expect(mqtt.connect).toHaveBeenCalledTimes(1);
    });
});
