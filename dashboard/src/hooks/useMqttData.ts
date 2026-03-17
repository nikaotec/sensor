import { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import type { Device } from '../data/mockData';

// Default broker URL for WebSockets (can be passed via env variables)
const MQTT_BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL || 'ws://broker.emqx.io:8083/mqtt';

export const useMqttData = (tenantId: string | null, currentUserRole: string | undefined, initialDevices: Device[] = []) => {
    const [devices, setDevices] = useState<Device[]>(initialDevices);
    const [isConnected, setIsConnected] = useState(false);

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
                            telemetry: existing.telemetry || initD.telemetry
                        };
                    }
                    return initD;
                });
            });
        }
    }, [initialDevices]);

    useEffect(() => {
        if (!tenantId) return;

        // Generate a random client ID for this specific instance
        const clientId = 'mqttjs_' + Math.random().toString(16).substr(2, 8);

        const client = mqtt.connect(MQTT_BROKER_URL, {
            clientId,
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 1000,
        });

        client.on('connect', () => {
            console.log('Connected to MQTT Broker via WebSockets');
            setIsConnected(true);

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
                const normalizedPayload = {
                    id: payload.id || payload.ID_DISPOSITIVO,
                    company: payload.company || payload.EMPRESA || 'Unknown',
                    device_name: payload.device_name || payload.DISPOSITIVO,
                    ala: payload.ala !== undefined ? payload.ala : payload.ALA,
                    temp: payload.temp !== undefined ? payload.temp : (payload.TEMP_ATUAL !== undefined ? parseFloat(payload.TEMP_ATUAL) : undefined),
                    tempMax: payload.tempMax !== undefined ? payload.tempMax : (payload.MAX !== undefined ? parseFloat(payload.MAX) : undefined),
                    tempMin: payload.tempMin !== undefined ? payload.tempMin : (payload.MIN !== undefined ? parseFloat(payload.MIN) : undefined),
                    batteryVoltage: payload.batteryVoltage !== undefined ? payload.batteryVoltage : (payload.BATERIA !== undefined ? parseFloat(payload.BATERIA) : undefined),
                    inputVoltage: payload.inputVoltage !== undefined ? payload.inputVoltage : (payload.VOLTAGEM !== undefined ? parseFloat(payload.VOLTAGEM) : undefined),
                    signal: payload.signal !== undefined ? payload.signal : (payload.RSSI !== undefined ? parseInt(payload.RSSI) : undefined)
                };
                payload = normalizedPayload;

                // Filter logic based on Role and Tenant
                const isManager = currentUserRole === 'manager';

                setDevices((prevDevices) => {
                    const existingDeviceIndex = prevDevices.findIndex(d =>
                        (payload.id && d.id === payload.id) ||
                        (!payload.id && d.name === payload.device_name && d.tenantId === payload.company)
                    );

                    const existing = existingDeviceIndex >= 0 ? prevDevices[existingDeviceIndex] : null;
                    const resolvedCompany = existing ? existing.tenantId : payload.company;
                    const belongsToCurrentView = tenantId === 'all' || resolvedCompany === tenantId;

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
                            }
                        };
                        return newDevices;
                    } else {
                        // Dynamically add new device observed in MQTT stream if it belongs to current view
                        const newDevice: Device = {
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
                            },
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
        };
    }, [tenantId, currentUserRole]);

    return { devices, isConnected };
};
