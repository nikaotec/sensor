import mqtt, { type MqttClient } from 'mqtt';

// ── Tipos públicos ──────────────────────────────────────────────────────────

export const ConnectionState = {
    Disconnected: 'disconnected',
    Connecting: 'connecting',
    Connected: 'connected',
    Reconnecting: 'reconnecting',
} as const;

export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];

export interface MqttMessage {
    topic: string;
    payload: unknown;
}

export interface IMqttService {
    connect(): void;
    destroy(): void;
    publish(topic: string, message: unknown): void;
    onMessage(handler: (msg: MqttMessage) => void): () => void;
    onStateChange(handler: (state: ConnectionState) => void): () => void;
    getState(): ConnectionState;
}

export interface EmqxMqttConfig {
    /** URL WebSocket: ws://host:8083/mqtt  ou  wss://host:8084/mqtt */
    url?: string;
    username?: string;
    password?: string;
    /** Tópicos a subscrever após conectar (default inclui telemetria/# e esp32c3/#) */
    topics?: string[];
    /** QoS de publicação (default: 1) */
    publishQos?: 0 | 1 | 2;
}

// ── Implementação ────────────────────────────────────────────────────────────

const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
const defaultHostUrl = isSecure ? 'wss://mqtt.nikaotech.com:8084/mqtt' : 'ws://mqtt.nikaotech.com:8083/mqtt';

const DEFAULT_URL =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_EMQX_WS_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MQTT_BROKER_URL) ||
    defaultHostUrl;

const DEFAULT_TOPICS = ['telemetria/#', 'esp32c3/#', 'nikaotec/#'];

/** Atrasos de reconexão: 1 s, 2 s, 4 s, 8 s, 16 s, 30 s, 30 s… */
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export class EmqxMqttService implements IMqttService {
    private client: MqttClient | null = null;
    private state: ConnectionState = ConnectionState.Disconnected;

    private messageHandlers: Set<(msg: MqttMessage) => void> = new Set();
    private stateHandlers: Set<(state: ConnectionState) => void> = new Set();

    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempt = 0;
    private destroyed = false;

    private readonly url: string;
    private readonly username: string | undefined;
    private readonly password: string | undefined;
    private readonly topics: string[];
    private readonly publishQos: 0 | 1 | 2;

    constructor(config: EmqxMqttConfig = {}) {
        const envUser =
            typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_EMQX_USER : undefined;
        const envPass =
            typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_EMQX_PASS : undefined;

        this.url = config.url ?? DEFAULT_URL;
        this.username = config.username ?? envUser;
        this.password = config.password ?? envPass;
        this.topics = config.topics ?? DEFAULT_TOPICS;
        this.publishQos = config.publishQos ?? 1;
    }

    // ── Estado ──────────────────────────────────────────────────────────────

    getState(): ConnectionState {
        return this.state;
    }

    private setState(s: ConnectionState): void {
        this.state = s;
        this.stateHandlers.forEach(h => h(s));
    }

    onStateChange(handler: (state: ConnectionState) => void): () => void {
        this.stateHandlers.add(handler);
        return () => this.stateHandlers.delete(handler);
    }

    // ── Conexão ─────────────────────────────────────────────────────────────

    connect(): void {
        if (this.client || this.destroyed) return;

        this.setState(ConnectionState.Connecting);

        const options: mqtt.IClientOptions = {
            clean: true,
            connectTimeout: 20_000,
            reconnectPeriod: 0, // gerenciamos reconexão manualmente para backoff exponencial
            clientId: `dashboard_${Math.random().toString(16).slice(2, 10)}`,
        };

        if (this.username) options.username = this.username;
        if (this.password) options.password = this.password;

        this.client = mqtt.connect(this.url, options);

        this.client.on('connect', this.handleConnect);
        this.client.on('message', this.handleMessage);
        this.client.on('close', this.handleClose);
        this.client.on('error', this.handleError);
    }

    private handleConnect = (): void => {
        this.reconnectAttempt = 0;
        this.setState(ConnectionState.Connected);
        console.info('[EmqxMqttService] ✅ Conectado ao broker EMQX');

        this.client?.subscribe(this.topics, (err) => {
            if (err) {
                console.error('[EmqxMqttService] ❌ Erro na subscrição:', err);
            } else {
                console.info('[EmqxMqttService] 📡 Subscrito em:', this.topics);
            }
        });
    };

    private handleMessage = (topic: string, raw: Buffer): void => {
        try {
            const payload = JSON.parse(raw.toString());
            this.messageHandlers.forEach(h => h({ topic, payload }));
        } catch {
            // payload inválido — ignorar silenciosamente
        }
    };

    private handleClose = (): void => {
        if (this.destroyed) return;
        this.setState(ConnectionState.Disconnected);
        console.warn('[EmqxMqttService] 🔌 Conexão encerrada. Agendando reconexão...');
        this.scheduleReconnect();
    };

    private handleError = (err: Error): void => {
        console.error('[EmqxMqttService] ❌ Erro:', err.message);
    };

    // ── Reconexão com backoff exponencial ───────────────────────────────────

    private scheduleReconnect(): void {
        if (this.reconnectTimer || this.destroyed) return;

        const delay = BACKOFF_DELAYS[Math.min(this.reconnectAttempt, BACKOFF_DELAYS.length - 1)];
        this.reconnectAttempt++;
        this.setState(ConnectionState.Reconnecting);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.destroyed) return;
            // Destruir cliente atual antes de recriar
            this.client?.end(true);
            this.client = null;
            this.connect();
        }, delay);
    }

    // ── Mensagens ────────────────────────────────────────────────────────────

    onMessage(handler: (msg: MqttMessage) => void): () => void {
        this.messageHandlers.add(handler);
        return () => this.messageHandlers.delete(handler);
    }

    // ── Publicação ───────────────────────────────────────────────────────────

    publish(topic: string, message: unknown): void {
        if (!this.client || this.state !== ConnectionState.Connected) {
            console.warn('[EmqxMqttService] ⚠️ Tentativa de publicar sem conexão ativa.');
            return;
        }

        const payload =
            typeof message === 'string' ? message : JSON.stringify(message);

        this.client.publish(topic, payload, { qos: this.publishQos }, (err) => {
            if (err) {
                console.error('[EmqxMqttService] ❌ Erro ao publicar em', topic, err);
            }
        });
    }

    // ── Destruição ───────────────────────────────────────────────────────────

    destroy(): void {
        this.destroyed = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.messageHandlers.clear();
        this.stateHandlers.clear();

        if (this.client) {
            this.client.end(true);
            this.client = null;
        }

        this.setState(ConnectionState.Disconnected);
    }
}

/** Singleton global para uso no Dashboard */
export const emqxMqttService = new EmqxMqttService();
