import mqtt from 'mqtt';

const MQTT_BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL || 'wss://nikaotech.com/mqtt';

export interface MqttMessage {
    topic: string;
    payload: any;
}

export class MqttService {
    private client: mqtt.MqttClient | null = null;
    private handlers: ((msg: MqttMessage) => void)[] = [];

    connect() {
        if (this.client) return;

        console.log(`[MqttService] Connecting to ${MQTT_BROKER_URL}...`);
        const clientId = 'mqttjs_' + Math.random().toString(16).substring(2, 8);
        this.client = mqtt.connect(MQTT_BROKER_URL, {
            clientId,
            clean: true,
            connectTimeout: 20000,
            reconnectPeriod: 2000, // Slightly longer
        });

        this.client.on('connect', () => {
            console.log('[MqttService] ✅ Connected to broker');
            const topics = ['sensor/telemetry/#', 'esp32c3/#', 'nikaotec/#'];
            this.client?.subscribe(topics, (err) => {
                if (err) console.error('[MqttService] ❌ Subscription error:', err);
                else console.log('[MqttService] 📡 Subscribed to:', topics);
            });
        });

        this.client.on('reconnect', () => {
            console.warn('[MqttService] 🔄 Reconnecting...');
        });

        this.client.on('error', (err) => {
            console.error('[MqttService] ❌ Connection error:', err);
        });

        this.client.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString());
                console.log(`[MqttService] 📩 Msg on ${topic}`);
                this.handlers.forEach(handler => handler({ topic, payload }));
            } catch (e) {
                console.error('[MqttService] ❌ Parse error on topic', topic, ':', e);
            }
        });
    }

    onMessage(handler: (msg: MqttMessage) => void) {
        this.handlers.push(handler);
        return () => {
            this.handlers = this.handlers.filter(h => h !== handler);
        };
    }

    publish(topic: string, message: any) {
        if (this.client?.connected) {
            const payload = typeof message === 'string' ? message : JSON.stringify(message);
            this.client.publish(topic, payload);
        } else {
            console.error('[MqttService] Not connected');
        }
    }

    disconnect() {
        this.client?.end();
        this.client = null;
    }
}

export const mqttService = new MqttService();
