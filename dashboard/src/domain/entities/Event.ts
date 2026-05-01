export interface DeviceEvent {
    id: string;
    deviceId: string;
    type: string;
    message?: string;
    timestamp: string;
    tenantId: string;
    userName?: string;
    userEmail?: string;
    source?: string;
    value?: string;
    details?: any;
    severity?: 'info' | 'warning' | 'critical';
}
