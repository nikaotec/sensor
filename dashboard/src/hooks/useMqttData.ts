import { useState, useEffect, useCallback, useMemo } from 'react';
import { emqxMqttService, type MqttMessage, type ConnectionState } from '../infrastructure/EmqxMqttService';
import type { Device } from '../domain/entities/Device';
import { MqttPayloadNormalizer } from '../domain/services/MqttPayloadNormalizer';
import { ProcessMqttUpdateUseCase } from '../application/ProcessMqttUpdateUseCase';

export const useMqttData = (
    tenantFilter: { id: string | null, name?: string | null },
    _currentUserRole: string | undefined,
    initialDevices: Device[] = [],
    onAlert?: (payload: any) => void,
    onDeviceNameChange?: (deviceId: string, newName: string) => void
) => {
    const [devices, setDevices] = useState<Device[]>(initialDevices);
    const [isConnected, setIsConnected] = useState(emqxMqttService.getState() === 'connected');
    const [connectionState, setConnectionState] = useState<ConnectionState>(emqxMqttService.getState());

    // Instantiate use case
    const processMqttUpdate = useMemo(() => new ProcessMqttUpdateUseCase(), []);

    useEffect(() => {
        setDevices(prev => {
            // Se já temos dispositivos com dados MQTT, preserve-os ao receber novos da Supabase
            if (prev.length === 0) return initialDevices;

            return initialDevices.map(dbDev => {
                const existing = prev.find(p => p.id === dbDev.id);
                if (existing && existing.mqttUpdated) {
                    return { ...dbDev, ...existing, telemetry: { ...dbDev.telemetry, ...existing.telemetry } };
                }
                return dbDev;
            });
        });
    }, [initialDevices]);

    useEffect(() => {
        emqxMqttService.connect();

        const unsubscribeState = emqxMqttService.onStateChange((state) => {
            setConnectionState(state);
            setIsConnected(state === 'connected');
        });

        const unsubscribeMsg = emqxMqttService.onMessage((msg: MqttMessage) => {
            const { topic, payload } = msg as { topic: string; payload: any };

            if (payload.TIPO === 'MENSAGEM_DISPLAY') return;

            // 1. Normalize Payload
            const normalizedUpdate = MqttPayloadNormalizer.normalize(payload);
            if (!normalizedUpdate) return;

            console.log(`[useMqttData] Received on ${topic}:`, normalizedUpdate);

            // 2. Tenant Filtering
            const isAll = tenantFilter.id === 'all';
            const company = normalizedUpdate.company.toLowerCase();
            const matchesId = tenantFilter.id && company === String(tenantFilter.id).toLowerCase();
            const matchesName = tenantFilter.name && company === String(tenantFilter.name).toLowerCase();

            if (!isAll && !matchesId && !matchesName) {
                console.log(`[useMqttData] Ignored: ${normalizedUpdate.company} mismatch`, tenantFilter);
                return;
            }

            // 3. Alerts & Events
            if (normalizedUpdate.alertType) {
                onAlert?.(payload);
            }

            if (payload.TIPO === 'NOME_ALTERADO' || payload.TIPO === 'DEVICE_NAME_CHANGED') {
                const newName = payload.new_name || payload.NOME || normalizedUpdate.deviceName;
                if (newName) {
                    onDeviceNameChange?.(normalizedUpdate.deviceId, newName);
                }
            }

            // 4. Update state using Use Case
            setDevices(prev => {
                const result = processMqttUpdate.execute(normalizedUpdate, prev);

                if (!result.isNew) {
                    const next = [...prev];
                    next[result.index] = result.updatedDevice;
                    return next;
                }

                return [...prev, result.updatedDevice];
            });
        });

        return () => {
            unsubscribeMsg();
            unsubscribeState();
        };
    }, [tenantFilter, onAlert, onDeviceNameChange, processMqttUpdate]);

    const publish = useCallback((topic: string, message: any) => {
        emqxMqttService.publish(topic, message);
    }, []);

    const updateDeviceLocal = useCallback((deviceId: string, data: Partial<Device>) => {
        setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, ...data } : d));
    }, []);

    return { devices, isConnected, connectionState, publish, updateDeviceLocal };
};
