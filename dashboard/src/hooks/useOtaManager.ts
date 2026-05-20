// ============================================================
// useOtaManager — SRP: manages OTA state derived from MQTT.
// OCP: pluggable via IOtaService injection.
// ============================================================
import { useState, useCallback, useEffect } from 'react';
import type { MqttClient } from 'mqtt';
import type { OtaProgressMap, OtaStatus, OtaMqttProgressPayload } from '../types/ota';
import { otaService, type IOtaService } from '../services/OtaService';

interface UseOtaManagerOptions {
    mqttClient: MqttClient | null;
    service?: IOtaService; // Injectable for testing (DIP)
}

interface UseOtaManagerReturn {
    progressMap: OtaProgressMap;
    sendOta: (deviceIds: string[], url: string, hash?: string) => void;
    clearProgress: (deviceId: string) => void;
}

const OTA_PROGRESS_TYPES = new Set(['OTA_PROGRESS', 'OTA_SUCCESS', 'OTA_ERROR']);

export const useOtaManager = ({
    mqttClient,
    service = otaService,
}: UseOtaManagerOptions): UseOtaManagerReturn => {
    const [progressMap, setProgressMap] = useState<OtaProgressMap>({});

    // ── Listen for OTA progress messages on every MQTT message ──────────────
    useEffect(() => {
        if (!mqttClient) return;

        const handleMessage = (_topic: string, message: Buffer) => {
            try {
                const raw = JSON.parse(message.toString()) as OtaMqttProgressPayload;

                if (!OTA_PROGRESS_TYPES.has(raw.TIPO)) return;
                if (!raw.ID_DISPOSITIVO) return;

                const status: OtaStatus | null = service.parseOtaProgress(raw);
                if (!status) return;

                setProgressMap((prev) => ({
                    ...prev,
                    [raw.ID_DISPOSITIVO]: {
                        ...status,
                        // Preservar a versão se ela já existir no estado anterior (versão alvo)
                        version: status.version || prev[raw.ID_DISPOSITIVO]?.version
                    },
                }));
            } catch {
                // ignore malformed messages
            }
        };

        mqttClient.on('message', handleMessage);
        return () => {
            mqttClient.off('message', handleMessage);
        };
    }, [mqttClient, service]);

    // ── Send OTA command ────────────────────────────────────────────────────
    const sendOta = useCallback(
        (deviceIds: string[], url: string, version?: string, hash?: string) => {
            if (!mqttClient) {
                console.error('[useOtaManager] mqttClient not available');
                return;
            }

            service.publishOtaCommand(mqttClient, deviceIds, url, hash);

            // Mark all selected devices as 'pending' immediately
            setProgressMap((prev) => {
                const next = { ...prev };
                deviceIds.forEach((id) => {
                    next[id] = { phase: 'pending', progress: 0, updatedAt: Date.now(), version };
                });
                return next;
            });
        },
        [mqttClient, service]
    );

    const clearProgress = useCallback((deviceId: string) => {
        setProgressMap((prev) => {
            const next = { ...prev };
            delete next[deviceId];
            return next;
        });
    }, []);

    return { progressMap, sendOta, clearProgress };
};
