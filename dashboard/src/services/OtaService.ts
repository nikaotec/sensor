// ============================================================
// OtaService — SRP: only MQTT OTA publish/parse logic.
// Does NOT depend on React (pure TS, fully testable).
// ============================================================
import type { MqttClient } from 'mqtt';
import type { OtaMqttProgressPayload, OtaStatus } from '../types/ota';

const MQTT_CMD_TOPIC = (deviceId: string) => `devices/${deviceId}/cmd`;

export const LATEST_FIRMWARE_VERSION = '1.1.7';

export interface IOtaService {
    publishOtaCommand(
        client: MqttClient,
        deviceIds: string[],
        url: string,
        hash?: string
    ): void;
    parseOtaProgress(payload: OtaMqttProgressPayload): OtaStatus | null;
}

export class OtaService implements IOtaService {
    /**
     * Publishes an OTA update command to one or more devices via MQTT.
     * Each device receives the command on its own topic.
     */
    publishOtaCommand(
        client: MqttClient,
        deviceIds: string[],
        url: string,
        hash = ''
    ): void {
        if (!client || !client.connected) {
            throw new Error('[OtaService] MQTT client not connected');
        }
        if (!url.startsWith('http')) {
            throw new Error('[OtaService] Invalid firmware URL');
        }
        if (deviceIds.length === 0) {
            throw new Error('[OtaService] No devices selected');
        }

        const command = {
            intent: 'otaupdate',
            is_admin: true,
            url,
            hash,
        };

        deviceIds.forEach((id) => {
            client.publish(MQTT_CMD_TOPIC(id), JSON.stringify(command), { qos: 1 });
        });
    }

    /**
     * Parses an incoming MQTT payload and returns normalised OtaStatus, or
     * null if the payload is not OTA-related.
     */
    parseOtaProgress(payload: OtaMqttProgressPayload): OtaStatus | null {
        const now = Date.now();

        if (payload.TIPO === 'OTA_PROGRESS') {
            const progress = payload.PROGRESSO ?? 0;
            return {
                phase: progress >= 100 ? 'installing' : 'downloading',
                progress,
                updatedAt: now,
            };
        }

        if (payload.TIPO === 'OTA_SUCCESS') {
            return {
                phase: 'success',
                progress: 100,
                version: payload.VERSAO,
                updatedAt: now,
            };
        }

        if (payload.TIPO === 'OTA_ERROR') {
            return {
                phase: 'error',
                progress: 0,
                errorMsg: payload.ERRO ?? 'Erro desconhecido',
                updatedAt: now,
            };
        }

        return null;
    }
}

// Default singleton for production use
export const otaService = new OtaService();
