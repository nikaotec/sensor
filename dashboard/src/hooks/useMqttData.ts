import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import type { Device } from '../data/mockData';
import { supabase } from '../supabase/config';

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
                            mqttUpdated: Object.hasOwn(existing, 'mqttUpdated') ? existing.mqttUpdated : false
                        };
                    } else {
                        newDevices.push({ ...initD, mqttUpdated: false });
                    }
                });

                return newDevices;
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

                // FILTRO: Mensagens de notificação de display (MENSAGEM_DISPLAY)
                // não são telemetria e podem criar cards fantasmas após reset.
                // Ignorar estas mensagens completamente para atualização de estado.
                if (payload.TIPO === 'MENSAGEM_DISPLAY') {
                    return;
                }

                // Normalize payload from general streams (Capital vs lowercase formats)
                // Merge raw payload with normalized fields to avoid losing tech data (IP, Uptime, etc)
                const normalizedPayload = {
                    ...payload,
                    id: payload.id || payload.ID_DISPOSITIVO,
                    company: payload.company || payload.EMPRESA || 'Unknown',
                    device_name: payload.device_name || payload.DISPOSITIVO,
                    ala: payload.ala !== undefined ? payload.ala : payload.ALA,
                    temp: (typeof payload.temp === 'number' && !isNaN(payload.temp)) ? payload.temp :
                        (typeof payload.TEMP === 'number' && !isNaN(payload.TEMP)) ? payload.TEMP :
                            (payload.TEMP_ATUAL !== undefined ? parseFloat(payload.TEMP_ATUAL) :
                                (payload.TEMP_C !== undefined ? parseFloat(payload.TEMP_C) : undefined)),
                    tempMax: (typeof payload.tempMax === 'number' && !isNaN(payload.tempMax)) ? payload.tempMax :
                        (payload.TEMP_MAX !== undefined ? parseFloat(payload.TEMP_MAX) :
                            (payload.MAX !== undefined ? parseFloat(payload.MAX) : undefined)),
                    tempMin: (typeof payload.tempMin === 'number' && !isNaN(payload.tempMin)) ? payload.tempMin :
                        (payload.TEMP_MIN !== undefined ? parseFloat(payload.TEMP_MIN) :
                            (payload.MIN !== undefined ? parseFloat(payload.MIN) : undefined)),
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
                    // Estados de monitoramento de alarmes (CHK_*)
                    chkVolt: payload.CHK_VOLT !== undefined ? payload.CHK_VOLT : true,
                    chkBat: payload.CHK_BAT !== undefined ? payload.CHK_BAT : true,
                    chkTemp: payload.CHK_TEMP !== undefined ? payload.CHK_TEMP : true,
                    chkDoor: payload.CHK_DOOR !== undefined ? payload.CHK_DOOR : true,
                    // Relés (Processa o objeto RELES: { R0, R1, R2, R3 })
                    rele0: payload.RELES?.R0 !== undefined ? payload.RELES.R0 :
                        (payload.rele0 !== undefined ? payload.rele0 : payload.rele),
                    rele1: payload.RELES?.R1 !== undefined ? payload.RELES.R1 : payload.rele1,
                    rele2: payload.RELES?.R2 !== undefined ? payload.RELES.R2 : payload.rele2,
                    rele3: payload.RELES?.R3 !== undefined ? payload.RELES.R3 : payload.rele3,
                    rele: payload.RELES?.R0 !== undefined ? payload.RELES.R0 : payload.rele,
                    // Histerese do relé 0
                    R0_TEMP_ON: payload.R0_TEMP_ON !== undefined ? parseFloat(payload.R0_TEMP_ON) : undefined,
                    R0_TEMP_OFF: payload.R0_TEMP_OFF !== undefined ? parseFloat(payload.R0_TEMP_OFF) : undefined,
                    R0_FUNC: payload.R0_FUNC,
                };
                payload = normalizedPayload;

                // Handle special confirmation messages (NOME_ALTERADO|NovoNome)
                const rawMsg = message.toString();
                if (rawMsg.startsWith('NOME_ALTERADO|')) {
                    const newName = rawMsg.split('|')[1]?.trim();
                    const deviceId = payload.id || payload.ID_DISPOSITIVO;
                    if (deviceId && newName) {
                        // 1. Atualizar estado local via callback
                        if (onDeviceNameChange) {
                            onDeviceNameChange(deviceId, newName);
                        }
                        // 2. Persistir no Supabase (devices_status.name)
                        supabase
                            .from('devices_status')
                            .update({ name: newName, updated_at: new Date().toISOString() })
                            .eq('id', deviceId)
                            .then(({ error }) => {
                                if (error) {
                                    console.error('[MQTT] Falha ao salvar nome no Supabase:', error.message);
                                } else {
                                    console.log(`[MQTT] Nome salvo no banco: ${deviceId} → "${newName}"`);
                                }
                            });
                    }
                }

                // Get the latest devices state without triggering re-renders
                const currentDevices = devicesRef.current;
                const existingDevice = currentDevices.find(d =>
                    (payload.id && d.id === payload.id) ||
                    (!payload.id && d.name === payload.device_name && d.tenantId === payload.company)
                );

                const resolvedCompanyContext = (existingDevice ? existingDevice.tenantId : (payload.company || payload.EMPRESA)) || 'Unknown';
                const isUnlinked = ['unknown', 'empresa_default', ''].includes(resolvedCompanyContext.trim().toLowerCase());

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
                        // 1. Prioridade absoluta para ID real (MAC Address)
                        (payload.id && d.id === payload.id) ||
                        // 2. Fallback por nome/empresa se ID estiver ausente nas mensagens anteriores ou no registro temporário
                        ((!payload.id || d.id.startsWith('mqtt-')) &&
                            d.name === payload.device_name &&
                            d.tenantId === payload.company)
                    );

                    const existing = existingDeviceIndex >= 0 ? prevDevices[existingDeviceIndex] : null;
                    const lockedDataForExisting = existing ? getLockedData(existing.id) : null;
                    const resolvedCompany = lockedDataForExisting?.tenantId !== undefined ? lockedDataForExisting.tenantId : ((existing ? existing.tenantId : payload.company) || 'Unknown');

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
                        const safeTelemetry = existing.telemetry || {};

                        newDevices[existingDeviceIndex] = {
                            ...existing,
                            // Use o lock name override se existir, senao prioriza name local > Supabase > MQTT payload
                            name: lockedDataForExisting?.name !== undefined ? lockedDataForExisting.name : (existing.name || payload.device_name || payload.DISPOSITIVO),
                            location: payload.ala !== undefined ? payload.ala : existing.location,
                            status: 'online',
                            lastSeen: new Date().toISOString(),
                            telemetry: {
                                ...safeTelemetry,
                                temp: (typeof payload.temp === 'number' && !isNaN(payload.temp)) ? payload.temp : safeTelemetry.temp,
                                tempMax: (typeof payload.tempMax === 'number' && !isNaN(payload.tempMax)) ? payload.tempMax : safeTelemetry.tempMax,
                                tempMin: (typeof payload.tempMin === 'number' && !isNaN(payload.tempMin)) ? payload.tempMin : safeTelemetry.tempMin,
                                batteryVoltage: payload.batteryVoltage ?? safeTelemetry.batteryVoltage,
                                inputVoltage: payload.inputVoltage ?? safeTelemetry.inputVoltage,
                                signal: payload.signal ?? safeTelemetry.signal,
                                ip: payload.IP_LOCAL ?? safeTelemetry.ip,
                                uptime: payload.UPTIME ?? safeTelemetry.uptime,
                                protocolo: payload.PROTOCOLO ?? safeTelemetry.protocolo,
                                modo: payload.MODO ?? safeTelemetry.modo,
                                saude: payload.SAUDE_SENSORES ?? safeTelemetry.saude,
                                rele: payload.rele ?? safeTelemetry.rele,
                                rele0: payload.rele0 ?? safeTelemetry.rele0,
                                rele1: payload.rele1 ?? safeTelemetry.rele1,
                                rele2: payload.rele2 ?? safeTelemetry.rele2,
                                rele3: payload.rele3 ?? safeTelemetry.rele3,
                                alarmMax: payload.alarmMax ?? safeTelemetry.alarmMax,
                                alarmMin: payload.alarmMin ?? safeTelemetry.alarmMin,
                                voltMaxLimit: payload.voltMaxLimit ?? safeTelemetry.voltMaxLimit,
                                voltMinLimit: payload.voltMinLimit ?? safeTelemetry.voltMinLimit,
                                batMinLimit: payload.batMinLimit ?? safeTelemetry.batMinLimit,
                                doorMaxTime: payload.doorMaxTime ?? safeTelemetry.doorMaxTime,
                                tempExt: payload.tempExt ?? safeTelemetry.tempExt,
                                humidity: payload.humidity ?? safeTelemetry.humidity,
                                doorOpen: payload.doorOpen ?? safeTelemetry.doorOpen,
                                secondsOpen: payload.secondsOpen ?? safeTelemetry.secondsOpen,
                                chkVolt: payload.CHK_VOLT !== undefined ? payload.CHK_VOLT : safeTelemetry.chkVolt,
                                chkBat: payload.CHK_BAT !== undefined ? payload.CHK_BAT : safeTelemetry.chkBat,
                                chkTemp: payload.CHK_TEMP !== undefined ? payload.CHK_TEMP : safeTelemetry.chkTemp,
                                chkDoor: payload.CHK_DOOR !== undefined ? payload.CHK_DOOR : safeTelemetry.chkDoor,
                                // Histerese do relé 0
                                R0_TEMP_ON: payload.R0_TEMP_ON !== undefined ? parseFloat(payload.R0_TEMP_ON) : safeTelemetry.R0_TEMP_ON,
                                R0_TEMP_OFF: payload.R0_TEMP_OFF !== undefined ? parseFloat(payload.R0_TEMP_OFF) : safeTelemetry.R0_TEMP_OFF,
                                R0_FUNC: payload.R0_FUNC ?? safeTelemetry.R0_FUNC,
                            },
                            mqttUpdated: true
                        };
                        return newDevices;
                    } else {
                        // Apenas adiciona novo dispositivo se tiver ID real (não anônimo)
                        // Qualquer ESP32 com ID real é bem-vindo (novo dispositivo na rede)
                        if (!payload.id) {
                            return prevDevices;
                        }

                        const newDevice: any = {
                            id: payload.id,
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
                                rele: payload.rele,
                                rele0: payload.rele0,
                                rele1: payload.rele1,
                                rele2: payload.rele2,
                                rele3: payload.rele3,
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
                                chkVolt: payload.CHK_VOLT !== undefined ? payload.CHK_VOLT : true,
                                chkBat: payload.CHK_BAT !== undefined ? payload.CHK_BAT : true,
                                chkTemp: payload.CHK_TEMP !== undefined ? payload.CHK_TEMP : true,
                                chkDoor: payload.CHK_DOOR !== undefined ? payload.CHK_DOOR : true,
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

    return { devices, isConnected, publish, updateDeviceLocal };
};
