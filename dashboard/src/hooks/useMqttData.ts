import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import type { Device } from '../data/mockData';
import { supabase } from '../supabase/config';
import { TelemetryService } from '../services/TelemetryService';

// Default broker URL for WebSockets (can be passed via env variables)
const MQTT_BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL || 'wss://nikaotech.com/mqtt';

type LockedData = {
    tenantId?: string;
    name?: string;
    timestamp: number;
};

const getLockedData = (deviceId: string): LockedData | null => {
    try {
        const lockStr = localStorage.getItem(`device_lock_${deviceId}`);
        if (lockStr) {
            const lockData = JSON.parse(lockStr);
            if (Date.now() - lockData.timestamp < 30000) { // 30 second global lock
                return lockData;
            }
        }
    } catch (e) { }
    return null;
};

export type MqttMessageHandler = (payload: { type: string; deviceId?: string; value?: string; deviceName?: string }) => void;

export const useMqttData = (
    tenantId: string | null,
    currentUserRole: string | undefined,
    initialDevices: Device[] = [],
    onAlert?: (payload: any) => void,
    onDeviceNameChange?: (deviceId: string, newName: string) => void
) => {
    const [devices, setDevices] = useState<any[]>(initialDevices.map(d => ({ ...d, mqttUpdated: false })));
    const [isConnected, setIsConnected] = useState(false);
    const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);

    const devicesRef = useRef(devices);
    useEffect(() => {
        devicesRef.current = devices;
    }, [devices]);

    useEffect(() => {
        if (initialDevices.length > 0) {
            setDevices((prevDevices) => {
                // Start with all existing devices to ensure we don't lose pure MQTT devices
                const newDevices = [...prevDevices];
                const seenIds = new Set<string>();

                // Merge initialDevices from Supabase, applying DB priority
                initialDevices.forEach(initD => {
                    seenIds.add(initD.id);
                    const existingIndex = newDevices.findIndex(d => d.id === initD.id);

                    if (existingIndex >= 0) {
                        const existing = newDevices[existingIndex];
                        const lockedData = getLockedData(initD.id);

                        newDevices[existingIndex] = {
                            ...initD,
                            tenantId: lockedData?.tenantId !== undefined ? lockedData.tenantId : initD.tenantId,

                            // Banco de dados tem prioridade — preservar nome do Supabase sobre o MQTT
                            name: lockedData?.name !== undefined ? lockedData.name : (existing.name || initD.name),
                            location: existing.location || initD.location,
                            status: existing.status || initD.status,
                            lastSeen: existing.lastSeen || initD.lastSeen,
                            telemetry: existing.telemetry || initD.telemetry,
                            mqttUpdated: Object.hasOwn(existing, 'mqttUpdated') ? existing.mqttUpdated : false,
                            alerts_paused: initD.alerts_paused // Sempre usar o valor mais recente do Supabase
                        };
                    } else {
                        newDevices.push({ ...initD, mqttUpdated: false });
                    }
                });

                return newDevices;
            });
        }
    }, [initialDevices]);

    // Verification method to check if device is offline (2 minutes without incoming data)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const OFFLINE_TIMEOUT = 2 * 60 * 1000; // 2 minutos sem comunicação
            const devicesToBeMarkedOffline: string[] = [];
            const alertsToTrigger: any[] = [];

            // 1. Identify which devices transitioned to offline or need a recurring alert
            devicesRef.current.forEach(device => {
                if (device.lastSeen) {
                    const lastSeenTime = new Date(device.lastSeen).getTime();

                    if (now - lastSeenTime > OFFLINE_TIMEOUT) {
                        // Apenas dispara na TRANSIÇÃO para offline, não continuamente
                        if (device.status !== 'offline') {
                            devicesToBeMarkedOffline.push(device.id);

                            // Verifica se os alertas estão silenciados
                            const isPaused = device.alerts_paused === true;
                            if (!isPaused) {
                                alertsToTrigger.push(device);
                            }
                        }
                    }
                }
            });

            // 2. Update state for all devices needing offline status (Batch update)
            if (devicesToBeMarkedOffline.length > 0) {
                setDevices(prev => prev.map(d =>
                    devicesToBeMarkedOffline.includes(d.id) ? { ...d, status: 'offline' } : d
                ));
            }

            // 3. Trigger side-effects outside of state updates
            alertsToTrigger.forEach(device => {
                const nowTs = Date.now();
                console.warn(`⚠️ Dispositivo ${device.name || device.id} OFFLINE. Enviando alerta.`);

                // Local Alert
                if (onAlert) {
                    onAlert({
                        TIPO: 'ALERTA_OFFLINE_LOCAL',
                        device_name: device.name,
                        id: device.id,
                        msg: `Dispositivo ${device.name} está offline há mais de 2 minutos.`
                    });
                }

                // MQTT Alert for WhatsApp
                const offlinePayload = {
                    TIPO: 'ALERTA_DISPOSITIVO_OFFLINE',
                    ID_DISPOSITIVO: device.id,
                    DISPOSITIVO: device.name || 'Sensor',
                    EMPRESA: device.tenantId || 'Unknown',
                    ALA: device.location || '',
                    HORA: new Date().toLocaleTimeString('pt-BR'),
                    DATA: new Date().toLocaleDateString('pt-BR'),
                    // Preencher campos com últimos dados conhecidos
                    TEMP: device.telemetry?.temp ?? 0,
                    MAX: device.telemetry?.tempMax ?? 0,
                    MIN: device.telemetry?.tempMin ?? 0,
                    ALARM_MAX: device.telemetry?.alarmMax ?? 0,
                    ALARM_MIN: device.telemetry?.alarmMin ?? 0,
                    VOLTAGEM: device.telemetry?.inputVoltage ?? 0,
                    BATERIA: device.telemetry?.batteryVoltage ?? 0,
                    RSSI: device.telemetry?.signal ?? 0,
                    MODO: device.telemetry?.modo ?? 'AUTO',
                    RELES: {
                        R0: device.telemetry?.rele0 ? 1 : 0,
                        R1: device.telemetry?.rele1 ? 1 : 0,
                        R2: device.telemetry?.rele2 ? 1 : 0,
                        R3: device.telemetry?.rele3 ? 1 : 0
                    }
                };

                if (mqttClient && isConnected) {
                    mqttClient.publish('esp32c3/data', JSON.stringify(offlinePayload));
                }

                localStorage.setItem(`offline_last_sent_${device.id}`, nowTs.toString());
            });
        }, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, [mqttClient, isConnected, onAlert]);

    useEffect(() => {
        if (!tenantId) return;

        // Generate a random client ID for this specific instance
        const clientId = 'mqttjs_' + Math.random().toString(16).substr(2, 8);

        const client = mqtt.connect(MQTT_BROKER_URL, {
            clientId,
            clean: true,
            connectTimeout: 20000,
            reconnectPeriod: 1000,
            // path removido para sincronizar com a barra final do Nginx
        });

        client.on('connect', () => {
            console.log('Connected to MQTT Broker via WebSockets');
            setIsConnected(true);
            setMqttClient(client);

            // Subscribe to all device telemetries
            // In a real scenario, you might scope this to `tenantId/devices/#`
            client.subscribe(['sensor/telemetry/#', 'esp32c3/#', 'devices/#'], (err) => {
                if (err) {
                    console.error('MQTT Subscription error:', err);
                } else {
                    console.log('Subscribed to device topics');
                }
            });
        });

        client.on('message', (_topic, message) => {
            try {
                const rawPayload = JSON.parse(message.toString());

                // FILTRO: Mensagens de notificação de display (MENSAGEM_DISPLAY)
                if (rawPayload.TIPO === 'MENSAGEM_DISPLAY') return;

                // Normalização centralizada via Service (SOLID - SRP)
                const payload = TelemetryService.normalizePayload(rawPayload);
                const deviceId = payload.id;

                // Handle special confirmation messages (NOME_ALTERADO|NovoNome)
                const rawMsg = message.toString();
                if (rawMsg.startsWith('NOME_ALTERADO|')) {
                    const newName = rawMsg.split('|')[1]?.trim();
                    if (deviceId && newName) {
                        if (onDeviceNameChange) onDeviceNameChange(deviceId, newName);
                        supabase.from('devices_status').update({ name: newName, updated_at: new Date().toISOString() }).eq('id', deviceId)
                            .then(({ error }) => {
                                if (error) console.error('[MQTT] Falha ao salvar nome:', error.message);
                            });
                    }
                }

                // 1. Identify recovery BEFORE updating state
                const existingInRef = devicesRef.current.find(d =>
                    (deviceId && d.id === deviceId) ||
                    (d.name === payload.device_name && d.tenantId === payload.company)
                );

                if (existingInRef && existingInRef.status === 'offline') {
                    if (mqttClient && isConnected) {
                        const recoveryPayload = {
                            TIPO: 'ALERTA_DISPOSITIVO_ONLINE',
                            ID_DISPOSITIVO: existingInRef.id,
                            DISPOSITIVO: existingInRef.name || payload.device_name || 'Sensor',
                            EMPRESA: existingInRef.tenantId || 'all',
                            ALA: existingInRef.location || '',
                            HORA: new Date().toLocaleTimeString('pt-BR'),
                            DATA: new Date().toLocaleDateString('pt-BR'),
                            TEMP: payload.temp ?? 0,
                            MAX: payload.tempMax ?? 0,
                            MIN: payload.tempMin ?? 0,
                            ALARM_MAX: payload.alarmMax ?? 0,
                            ALARM_MIN: payload.alarmMin ?? 0,
                            VOLTAGEM: payload.inputVoltage ?? 0,
                            BATERIA: payload.batteryVoltage ?? 0,
                            RSSI: payload.signal ?? 0,
                            MODO: payload.modo ?? 'AUTO',
                            RELES: {
                                R0: payload.rele0 ? 1 : 0,
                                R1: payload.rele1 ? 1 : 0,
                                R2: payload.rele2 ? 1 : 0,
                                R3: payload.rele3 ? 1 : 0
                            }
                        };
                        mqttClient.publish('esp32c3/data', JSON.stringify(recoveryPayload));
                        localStorage.removeItem(`offline_last_sent_${existingInRef.id}`);
                    }
                }

                // 2. Update state
                setDevices((prevDevices) => {
                    const existingDeviceIndex = prevDevices.findIndex(d =>
                        (deviceId && d.id === deviceId) ||
                        ((!deviceId || d.id.startsWith('mqtt-')) && d.name === payload.device_name && d.tenantId === payload.company)
                    );

                    const existing = existingDeviceIndex >= 0 ? prevDevices[existingDeviceIndex] : null;
                    const lockedData = existing ? getLockedData(existing.id) : null;
                    const resolvedCompany = lockedData?.tenantId || (existing ? existing.tenantId : payload.company) || 'Unknown';

                    // Case-insensitive comparison for company filtering
                    const belongsToCurrentView = tenantId === 'all' || resolvedCompany.toLowerCase() === tenantId?.toLowerCase();
                    if (!belongsToCurrentView) return prevDevices;

                    // Trigger alert callback (Apenas se não estiver silenciado)
                    const deviceIsPaused = existing?.alerts_paused === true;
                    if (rawPayload.TIPO?.startsWith('ALERTA_') && onAlert && !deviceIsPaused) {
                        onAlert(rawPayload);
                    }

                    if (existing) {
                        const newDevices = [...prevDevices];
                        newDevices[existingDeviceIndex] = {
                            ...existing,
                            name: lockedData?.name || existing.name || payload.device_name || existing.id,
                            location: payload.ala || existing.location,
                            status: 'online',
                            lastSeen: new Date().toISOString(),
                            telemetry: {
                                ...existing.telemetry,
                                ...payload // Overlay normalized fields
                            },
                            mqttUpdated: existing.mqttUpdated || payload.temp !== undefined
                        };
                        return newDevices;
                    } else if (payload.id) {
                        const newDevice: any = {
                            id: payload.id,
                            tenantId: payload.company || 'Unknown',
                            name: payload.device_name || payload.id,
                            type: 'sensor_temp',
                            status: 'online',
                            location: payload.ala || '',
                            lastSeen: new Date().toISOString(),
                            telemetry: payload,
                            mqttUpdated: payload.temp !== undefined
                        };
                        return [...prevDevices, newDevice];
                    }
                    return prevDevices;
                });
            } catch (e) {
                console.error('Failed to process MQTT message:', e);
            }
        });

        client.on('error', (err) => {
            console.error('MQTT Connection Error:', err);
            setIsConnected(false);
            client.end();
        });

        client.on('offline', () => {
            setIsConnected(false);
        });

        return () => {
            if (client.connected) {
                client.end();
            }
            setMqttClient(null);
        };
    }, [tenantId, currentUserRole]);

    const publish = (topic: string, message: string) => {
        if (mqttClient && isConnected) {
            mqttClient.publish(topic, message);
            console.log(`Published to ${topic}:`, message);
        } else {
            console.error('Cannot publish, MQTT client not connected');
        }
    };

    const updateDeviceLocal = useCallback((deviceId: string, updates: Partial<Device>) => {
        if (updates.tenantId || updates.name) {
            try {
                const currentLock = getLockedData(deviceId) || { timestamp: 0 };
                localStorage.setItem(`device_lock_${deviceId}`, JSON.stringify({
                    ...currentLock,
                    tenantId: updates.tenantId !== undefined ? updates.tenantId : currentLock.tenantId,
                    name: updates.name !== undefined ? updates.name : currentLock.name,
                    timestamp: Date.now()
                }));
            } catch (e) { }
        }

        setDevices(prev => {
            const newDevices = prev.map(d => {
                if (d.id === deviceId) {
                    return {
                        ...d,
                        ...updates,
                        localUpdateTimestamp: Date.now()
                    };
                }
                return d;
            });
            return newDevices;
        });
    }, []);

    return { devices, isConnected, publish, updateDeviceLocal, mqttClient };
};
