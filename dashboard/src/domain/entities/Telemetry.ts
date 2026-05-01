export interface Telemetry {
    id: string;
    deviceId: string;
    timestamp: string;
    temperature: number;
    humidity?: number;
    voltage?: number;
    battery?: number;
    signal?: number;
    doorOpen?: boolean;
    type: string; // 'periodico', 'alerta', etc.
    rawPayload?: any;
}

export type ReportType = 'daily' | 'monthly' | 'custom' | 'detailed';

export interface ReportQuery {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    selectedHours: string[];
    useSelectedHoursFilter: boolean;
    limit: number;
}
