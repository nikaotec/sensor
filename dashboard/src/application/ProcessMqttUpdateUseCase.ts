import type { Device } from '../domain/entities/Device';
import { type NormalizedMqttUpdate } from '../domain/services/MqttPayloadNormalizer';

export interface ProcessMqttUpdateResult {
    updatedDevice: Device;
    isNew: boolean;
    index: number;
}

export class ProcessMqttUpdateUseCase {
    /**
     * Correlates a normalized MQTT update with the existing device list.
     * Handles matching by multiple ID formats or by device name.
     */
    execute(update: NormalizedMqttUpdate, currentDevices: Device[]): ProcessMqttUpdateResult {
        const { deviceId, company, deviceName, telemetry } = update;

        const normalizedIncomingId = this.normalizeId(deviceId);

        // 1. Find by exact ID or normalized ID match
        let index = currentDevices.findIndex(d => {
            const dbId = d.id.toLowerCase();
            const incomingId = deviceId.toLowerCase();
            return dbId === incomingId || this.normalizeId(dbId) === normalizedIncomingId;
        });

        // 2. Find by Name if ID didn't match (for generic IDs from MQTT)
        if (index === -1 && deviceName) {
            index = currentDevices.findIndex(d => d.name.toLowerCase() === deviceName.toLowerCase());
        }

        // 3. Find by partial ID match (fuzzy, case-insensitive)
        if (index === -1) {
            index = currentDevices.findIndex(d =>
                d.id.toLowerCase().includes(deviceId.toLowerCase()) ||
                deviceId.toLowerCase().includes(d.id.toLowerCase())
            );
        }

        const currentDevice = index >= 0 ? currentDevices[index] : {} as Device;

        // 4. Selective telemetry merge (avoid wiping with undefined)
        const mergedTelemetry = { ...(currentDevice.telemetry || {}) };
        Object.keys(telemetry).forEach(key => {
            const val = (telemetry as any)[key];
            if (val !== undefined) {
                (mergedTelemetry as any)[key] = val;
            }
        });

        const updatedDevice: Device = {
            ...currentDevice,
            id: currentDevice.id || deviceId,
            name: deviceName || currentDevice.name || 'Desconhecido',
            tenantId: currentDevice.tenantId || company,
            status: 'online',
            lastSeen: new Date().toISOString(),
            mqttUpdated: true,
            telemetry: mergedTelemetry,
            fwVersion: mergedTelemetry.fwVersion
        };

        return {
            updatedDevice,
            isNew: index === -1,
            index
        };
    }

    /**
     * Strips non-alphanumeric characters for robust ID comparison (e.g. MAC addresses).
     */
    private normalizeId(id: string): string {
        return id.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
}
