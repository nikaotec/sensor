export interface DeviceTelemetry {
    temp?: number;
    humidity?: number;
    batteryVoltage?: number;
    inputVoltage?: number;
    signal?: number;
    doorOpen?: boolean;
    tempMax?: number;
    tempMin?: number;
    tempExt?: number;
    chkVolt?: boolean;
    chkBat?: boolean;
    chkTemp?: boolean;
    chkDoor?: boolean;
    // Novos campos necessários para DeviceDetails
    alarmMax?: number;
    alarmMin?: number;
    voltMaxLimit?: number;
    voltMinLimit?: number;
    batMinLimit?: number;
    doorMaxTime?: number;
    tempOn?: number;
    tempOff?: number;
    modo?: string;
    rele?: boolean;
    silenced?: boolean;
    ip?: string;
    uptime?: number;
    secondsOpen?: number;
    fwVersion?: string;
}

export type DeviceStatus = 'online' | 'offline' | 'alert';

export interface Device {
    id: string;
    name: string;
    tenantId: string | null;
    type: string;
    status: DeviceStatus;
    location: string;
    lastSeen: string;
    telemetry: DeviceTelemetry;
    mqttUpdated?: boolean;
}

export interface Tenant {
    id: string;
    name: string;
    logo?: string;
    settings?: any;
}
