import { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';
import type { Device } from '../data/mockData';

// Default broker URL for WebSockets (can be passed via env variables)
const MQTT_BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL || 'wss://nikaotech.com/mqtt';

export const useMqttData = (
    tenantId: string | null,
    currentUserRole: string | undefined,
    initialDevices: Device[] = [],
    onAlert?: (payload: any) => void
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
                // Merge initialDevices with prevDevices (preserving MQTT telemetry/location)
                return initialDevices.map(initD => {
                    const existing = prevDevices.find(d => d.id === initD.id);
                    if (existing) {
                        return {
                            ...initD,
                            // Preserve MQTT updates for name/location if they arrived
                            name: existing.name || initD.name,
                            location: existing.location || initD.location,
                            status: existing.status || initD.status,
                            lastSeen: existing.lastSeen || initD.lastSeen,
                            telemetry: existing.telemetry || initD.telemetry,
                            mqttUpdated: Object.hasOwn(existing, 'mqttUpdated') ? existing.mqttUpdated : false
                        };
                    }
                    return { ...initD, mqttUpdated: false };
                });
            });
        }
    }, [initialDevices]);

    // Verification method to check if device is offline (5 minutes without incoming data)
    useEffect(() => {
        const interval = setInterval(() => {
            setDevices(prevDevices =>
                prevDevices.map(device => {
                    if (device.status !== 'offline' && device.lastSeen) {
                        const lastSeenTime = new Date(device.lastSeen).getTime();
                        const now = new Date().getTime();
                        const OFFLINE_TIMEOUT = 5 * 60 * 1000; // 5 minutos sem comunicação

                        if (now - lastSeenTime > OFFLINE_TIMEOUT) {
                            return { ...device, status: 'offline' };
                        }
                    }
                    return device;
                })
            );
        }, 60000); // Check every 1 minute

        return () => clearInterval(interval);
    }, []);

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
            client.subscribe(['sensor/telemetry/#', 'esp32c3/#'], (err) => {
                if (err) {
                    console.error('MQTT Subscription error:', err);
                } else {
                    console.log('Subscribed to device topics');
                }
            });
        });

        client.on('message', (_topic, message) => {
            try {
                let payload = JSON.parse(message.toString());

                // Normalize payload from general streams (Capital vs lowercase formats)
                // Merge raw payload with normalized fields to avoid losing tech data (IP, Uptime, etc)
                const normalizedPayload = {
                    ...payload,
                    id: payload.id || payload.ID_DISPOSITIVO,
                    company: payload.company || payload.EMPRESA || 'Unknown',
                    device_name: payload.device_name || payload.DISPOSITIVO,
                    ala: payload.ala !== undefined ? payload.ala : payload.ALA,
                    temp: payload.temp !== undefined ? payload.temp : (payload.TEMP_ATUAL !== undefined ? parseFloat(payload.TEMP_ATUAL) : undefined),
                    tempMax: payload.tempMax !== undefined ? payload.tempMax : (payload.MAX !== undefined ? parseFloat(payload.MAX) : undefined),
                    tempMin: payload.tempMin !== undefined ? payload.tempMin : (payload.MIN !== undefined ? parseFloat(payload.MIN) : undefined),
                    batteryVoltage: payload.batteryVoltage !== undefined ? payload.batteryVoltage : (payload.BATERIA !== undefined ? parseFloat(payload.BATERIA) : undefined),
                    inputVoltage: payload.inputVoltage !== undefined ? payload.inputVoltage : (payload.VOLTAGEM !== undefined ? parseFloat(payload.VOLTAGEM) : undefined),
                    signal: payload.signal !== undefined ? payload.signal : (payload.RSSI !== undefined ? parseInt(payload.RSSI) : undefined),
                    // New Alert Limits from ESP32
                    alarmMax: payload.ALARM_MAX !== undefined ? parseFloat(payload.ALARM_MAX) : undefined,
                    alarmMin: payload.ALARM_MIN !== undefined ? parseFloat(payload.ALARM_MIN) : undefined,
                    voltMaxLimit: payload.VOLT_MAX_LIMIT !== undefined ? parseFloat(payload.VOLT_MAX_LIMIT) : undefined,
                    voltMinLimit: payload.VOLT_MIN_LIMIT !== undefined ? parseFloat(payload.VOLT_MIN_LIMIT) : undefined,
                    batMinLimit: payload.BAT_MIN_LIMIT !== undefined ? parseFloat(payload.BAT_MIN_LIMIT) : undefined,
                    doorMaxTime: payload.TEMPO_PORTA !== undefined ? parseInt(payload.TEMPO_PORTA) : undefined,
                    tempExt: payload.TEMP_EXTERNA !== undefined ? parseFloat(payload.TEMP_EXTERNA) : undefined,
                    humidity: payload.UMIDADE !== undefined ? parseFloat(payload.UMIDADE) : undefined,
                    doorOpen: payload.PORTA_ABERTA !== undefined ? payload.PORTA_ABERTA : undefined,
                    secondsOpen: payload.SEC_ABERTA !== undefined ? parseInt(payload.SEC_ABERTA) : undefined,
                    silenced: payload.SILENCIADO !== undefined ? payload.SILENCIADO : undefined,
                };
                payload = normalizedPayload;

                // Get the latest devices state without triggering re-renders
                const currentDevices = devicesRef.current;
                const existingDevice = currentDevices.find(d =>
                    (payload.id && d.id === payload.id) ||
                    (!payload.id && d.name === payload.device_name && d.tenantId === payload.company)
                );

                const resolvedCompanyContext = (existingDevice ? existingDevice.tenantId : payload.company) || 'Unknown';
                const isUnlinked = ['unknown', 'empresa_default', 'nikaotec', ''].includes(resolvedCompanyContext.trim().toLowerCase());

                // Trigger alert callback if it's an alert AND device is validly assigned
                if (!isUnlinked && payload.TIPO && payload.TIPO.startsWith('ALERTA_')) {
                    // Check if it belongs to current view (tenantId)
                    const belongsToCurrentView = tenantId === 'all' || resolvedCompanyContext.toLowerCase() === tenantId?.toLowerCase();
                    if (belongsToCurrentView) {
                        onAlert?.(payload);
                    }
                }

                // Filter logic based on Role and Tenant

                setDevices((prevDevices) => {
                    const existingDeviceIndex = prevDevices.findIndex(d =>
                        (payload.id && d.id === payload.id) ||
                        (!payload.id && d.name === payload.device_name && d.tenantId === payload.company)
                    );

                    const existing = existingDeviceIndex >= 0 ? prevDevices[existingDeviceIndex] : null;
                    const resolvedCompany = (existing ? existing.tenantId : payload.company) || 'Unknown';

                    // Case-insensitive comparison for company filtering
                    const belongsToCurrentView = tenantId === 'all' ||
                        resolvedCompany.toLowerCase() === tenantId.toLowerCase();

                    if (!belongsToCurrentView) {
                        return prevDevices; // Ignore data not belonging to the current allowed view
                    }

                    if (existingDeviceIndex >= 0) {
                        // Update existing device
                        const newDevices = [...prevDevices];
                        const existing = newDevices[existingDeviceIndex];
                        newDevices[existingDeviceIndex] = {
                            ...existing,
                            name: payload.device_name || existing.name,
                            location: payload.ala !== undefined ? payload.ala : existing.location,
                            status: 'online',
                            lastSeen: new Date().toISOString(),
                            telemetry: {
                                ...existing.telemetry,
                                temp: payload.temp ?? existing.telemetry.temp,
                                tempMax: payload.tempMax ?? existing.telemetry.tempMax,
                                tempMin: payload.tempMin ?? existing.telemetry.tempMin,
                                batteryVoltage: payload.batteryVoltage ?? existing.telemetry.batteryVoltage,
                                inputVoltage: payload.inputVoltage ?? existing.telemetry.inputVoltage,
                                signal: payload.signal ?? existing.telemetry.signal,
                                ip: payload.IP_LOCAL ?? existing.telemetry.ip,
                                uptime: payload.UPTIME ?? existing.telemetry.uptime,
                                protocolo: payload.PROTOCOLO ?? existing.telemetry.protocolo,
                                modo: payload.MODO ?? existing.telemetry.modo,
                                saude: payload.SAUDE_SENSORES ?? existing.telemetry.saude,
                                rele: payload.RELE ?? existing.telemetry.rele,
                                alarmMax: payload.alarmMax ?? existing.telemetry.alarmMax,
                                alarmMin: payload.alarmMin ?? existing.telemetry.alarmMin,
                                voltMaxLimit: payload.voltMaxLimit ?? existing.telemetry.voltMaxLimit,
                                voltMinLimit: payload.voltMinLimit ?? existing.telemetry.voltMinLimit,
                                batMinLimit: payload.batMinLimit ?? existing.telemetry.batMinLimit,
                                doorMaxTime: payload.doorMaxTime ?? existing.telemetry.doorMaxTime,
                                tempExt: payload.tempExt ?? existing.telemetry.tempExt,
                                humidity: payload.humidity ?? existing.telemetry.humidity,
                                doorOpen: payload.doorOpen ?? existing.telemetry.doorOpen,
                                secondsOpen: payload.secondsOpen ?? existing.telemetry.secondsOpen,
                            },
                            mqttUpdated: true
                        };
                        return newDevices;
                    } else {
                        // Dynamically add new device observed in MQTT stream if it belongs to current view
                        const newDevice: any = {
                            id: payload.id || `mqtt-${Math.random().toString(36).substr(2, 9)}`,
                            tenantId: payload.company || 'Unknown',
                            name: payload.device_name || 'Desconhecido',
                            type: 'sensor_temp',
                            status: 'online',
                            location: payload.ala || '',
                            lastSeen: new Date().toISOString(),
                            telemetry: {
                                temp: payload.temp,
                                tempMax: payload.tempMax,
                                tempMin: payload.tempMin,
                                batteryVoltage: payload.batteryVoltage,
                                inputVoltage: payload.inputVoltage,
                                signal: payload.signal,
                                ip: payload.IP_LOCAL,
                                uptime: payload.UPTIME,
                                protocolo: payload.PROTOCOLO,
                                modo: payload.MODO,
                                saude: payload.SAUDE_SENSORES,
                                rele: payload.RELE,
                                alarmMax: payload.alarmMax,
                                alarmMin: payload.alarmMin,
                                voltMaxLimit: payload.voltMaxLimit,
                                voltMinLimit: payload.voltMinLimit,
                                batMinLimit: payload.batMinLimit,
                                doorMaxTime: payload.doorMaxTime,
                                tempExt: payload.tempExt,
                                humidity: payload.humidity,
                                doorOpen: payload.doorOpen,
                                secondsOpen: payload.secondsOpen,
                            },
                            mqttUpdated: true
                        };
                        return [...prevDevices, newDevice];
                    }
                });

            } catch (e) {
                console.error('Failed to parse MQTT message:', e);
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

    return { devices, isConnected, publish };
};
