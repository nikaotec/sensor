import { useState, useEffect, useCallback, useMemo } from 'react';
import { mqttService, type MqttMessage } from '../infrastructure/MqttService';
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
    const [isConnected, setIsConnected] = useState(false);

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
        mqttService.connect();
        setIsConnected(true);

        const unsubscribe = mqttService.onMessage((msg: MqttMessage) => {
            const { topic, payload } = msg;

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
            unsubscribe();
        };
    }, [tenantFilter, onAlert, onDeviceNameChange, processMqttUpdate]);

    const publish = useCallback((topic: string, message: any) => {
        mqttService.publish(topic, message);
    }, []);

    const updateDeviceLocal = useCallback((deviceId: string, data: Partial<Device>) => {
        setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, ...data } : d));
    }, []);

    return { devices, isConnected, publish, updateDeviceLocal };
};
