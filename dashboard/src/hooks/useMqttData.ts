import { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import type { Device } from '../data/mockData';

// Generate a random client ID
const clientId = 'mqttjs_' + Math.random().toString(16).substr(2, 8);

// Default broker URL for WebSockets (can be passed via env variables)
const MQTT_BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL || 'ws://broker.emqx.io:8083/mqtt';

export const useMqttData = (tenantId: string | null, currentUserRole: string | undefined, initialDevices: Device[] = []) => {
    const [devices, setDevices] = useState<Device[]>(initialDevices);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        setDevices(initialDevices);
    }, [initialDevices]);

    useEffect(() => {
        if (!tenantId) return;

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
            client.subscribe('sensor/telemetry/#', (err) => {
                if (err) {
                    console.error('MQTT Subscription error:', err);
                } else {
                    console.log('Subscribed to sensor/telemetry/#');
                }
            });
        });

        client.on('message', (_topic, message) => {
            try {
                const payload = JSON.parse(message.toString());

                // Expected Payload:
                // {
                //   "company": "Empresa A",
                //   "ala": "Ala Norte",
                //   "device_name": "Sensor 01",
                //   "temp": 4.5,
                //   ...
                // }

                // Filter logic based on Role and Tenant
                const isManager = currentUserRole === 'manager';
                const belongsToCurrentView = tenantId === 'all' || payload.company === tenantId; // Assuming tenantId maps to company name for now, or match IDs.

                if (!isManager && !belongsToCurrentView) {
                    return; // Ignore data not belonging to the current allowed view
                }

                setDevices((prevDevices) => {
                    const existingDeviceIndex = prevDevices.findIndex(d => d.name === payload.device_name && d.tenantId === payload.company);

                    if (existingDeviceIndex >= 0) {
                        // Update existing device
                        const newDevices = [...prevDevices];
                        const existing = newDevices[existingDeviceIndex];
                        newDevices[existingDeviceIndex] = {
                            ...existing,
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
                            id: `mqtt-${Math.random().toString(36).substr(2, 9)}`,
                            tenantId: payload.company || 'Unknown',
                            name: payload.device_name || 'Desconhecido',
                            type: 'sensor_temp',
                            status: 'online',
                            location: payload.ala || 'Local Padrão',
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
