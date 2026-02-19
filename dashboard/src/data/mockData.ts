
export interface Tenant {
    id: string;
    name: string;
    plan: 'basic' | 'pro' | 'enterprise';
    logoUrl?: string;
    colors?: {
        primary: string;
        secondary?: string;
    }
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'viewer';
    avatarUrl?: string;
    tenantId: string;
}

export interface Device {
    id: string;
    name: string;
    type: string;
    status: 'online' | 'offline' | 'warning' | 'error';
    location: string;
    lastSeen: string;
    tenantId: string;
    telemetry: {
        temp?: number;
        tempMax?: number;
        tempMin?: number;
        batteryVoltage?: number;
        inputVoltage?: number;
        humidity?: number;
        signal?: number;
    }
}

export interface Alert {
    id: number;
    severity: 'critical' | 'warning' | 'info';
    device: string;
    message: string;
    time: string;
    status: 'New' | 'Ack' | 'Resolved';
    tenantId: string;
}

export interface ReportMetrics {
    totalEnergy: string;
    peakPower: string;
    uptime: string;
    incidents: number;
    consumptionData: number[]; // Simple array for sparkline/chart
    historicalData: { time: string, value: number }[];
    statusDistribution: { name: string, value: number, color: string }[];
}

// --- MOCK DATA STORE ---

export const tenants: Tenant[] = [
    {
        id: 't1',
        name: 'Midnight IoT',
        plan: 'enterprise',
        colors: { primary: '#f48c25' }
    },
    {
        id: 't2',
        name: 'Solar Solutions',
        plan: 'pro',
        colors: { primary: '#10b981' } // Emerald
    }
];

export const users: User[] = [
    { id: 'u1', name: 'Alex Thompson', email: 'alex@midnight.com', role: 'admin', tenantId: 't1', avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCuvJxwIYI2ukCFYUtXPSMayB8BpLHmEotkogLjSjOQ112ykOzUVYvJ4MHSGuM4BbprncbzyMdBkQ5Y1QA06KSc6hpyh1QaV7J4m49eLRdxd49i5o-hzMTcZWjEHb_RH_9B60Kbum0rSUodzt_g8aXuqEGl_ORLCxspvx15TCAdv0XaF1YVCR6IL5KUNoumMerRWqMX-5X2QgyzoMLcuGaKLHVsqUcToRdlrw2rK8NucgvsZVuzXgHXeDYqzjkp3oyaz6Jctll6EJNa' },
    { id: 'u2', name: 'Maria Solar', email: 'maria@solar.com', role: 'admin', tenantId: 't2' },
];

export const devices: Device[] = [
    // Tenant 1 Devices
    { id: 'd1', name: 'Smart Meter IND-01', type: 'Meter', status: 'online', location: 'Fábrica Principal', lastSeen: '2 min ago', tenantId: 't1', telemetry: { temp: 28.0, tempMax: 28.1, tempMin: 24.3, batteryVoltage: 12.50, inputVoltage: 220, signal: -65 } },
    { id: 'd2', name: 'Pump P-88', type: 'Pump', status: 'warning', location: 'Estação de Bombeamento', lastSeen: '10 min ago', tenantId: 't1', telemetry: { temp: 32.5, tempMax: 35.0, tempMin: 28.0, batteryVoltage: 11.80, inputVoltage: 220, signal: -80 } },
    { id: 'd3', name: 'HVAC Unit 04', type: 'HVAC', status: 'offline', location: 'Escritório Central', lastSeen: '4 hours ago', tenantId: 't1', telemetry: { temp: 22.0, tempMax: 24.0, tempMin: 20.0, batteryVoltage: 12.20, inputVoltage: 0, signal: -110 } },
    // Tenant 2 Devices
    { id: 'd4', name: 'Inverter Solar X1', type: 'Inverter', status: 'online', location: 'Telhado Norte', lastSeen: '1 min ago', tenantId: 't2', telemetry: { temp: 55.0, tempMax: 58.0, tempMin: 45.0, batteryVoltage: 54.0, inputVoltage: 230, signal: -50 } },
    { id: 'd5', name: 'Battery Bank B1', type: 'Battery', status: 'online', location: 'Sala de Baterias', lastSeen: '5 min ago', tenantId: 't2', telemetry: { batteryVoltage: 52.50, temp: 25.0, tempMax: 27.0, tempMin: 24.0, inputVoltage: 0, signal: -60 } },
];

export const alerts: Alert[] = [
    // Tenant 1 Alerts
    { id: 1, severity: 'critical', device: 'Smart Meter IND-01', message: 'Voltage spike detected (>245V)', time: '2 mins ago', status: 'New', tenantId: 't1' },
    { id: 2, severity: 'warning', device: 'Pump P-88', message: 'Vibration anomaly detected', time: '3 hours ago', status: 'Ack', tenantId: 't1' },
    // Tenant 2 Alerts
    { id: 3, severity: 'warning', device: 'Inverter Solar X1', message: 'Efficiency drop < 90%', time: '30 mins ago', status: 'New', tenantId: 't2' },
    { id: 4, severity: 'info', device: 'Battery Bank B1', message: 'Full charge cycle complete', time: '1 hour ago', status: 'Resolved', tenantId: 't2' },
];

export const metrics: Record<string, ReportMetrics> = {
    't1': {
        totalEnergy: '1.2 MWh',
        peakPower: '450 kW',
        uptime: '99.98%',
        incidents: 15,
        consumptionData: [60, 80, 75, 90, 85, 100, 95, 110, 105, 120],
        historicalData: [
            { time: '08:00', value: 45 },
            { time: '09:00', value: 52 },
            { time: '10:00', value: 48 },
            { time: '11:00', value: 61 },
            { time: '12:00', value: 55 },
            { time: '13:00', value: 67 },
            { time: '14:00', value: 60 },
        ],
        statusDistribution: [
            { name: 'Online', value: 12, color: '#10b981' },
            { name: 'Offline', value: 2, color: '#64748b' },
            { name: 'Alerta', value: 1, color: '#f59e0b' },
        ]
    },
    't2': {
        totalEnergy: '850 kWh',
        peakPower: '120 kW',
        uptime: '99.5%',
        incidents: 4,
        consumptionData: [30, 45, 40, 55, 60, 50, 65, 70, 80, 75],
        historicalData: [
            { time: '08:00', value: 20 },
            { time: '09:00', value: 25 },
            { time: '10:00', value: 22 },
            { time: '11:00', value: 30 },
            { time: '12:00', value: 28 },
            { time: '13:00', value: 35 },
            { time: '14:00', value: 32 },
        ],
        statusDistribution: [
            { name: 'Online', value: 8, color: '#10b981' },
            { name: 'Offline', value: 1, color: '#64748b' },
            { name: 'Alerta', value: 1, color: '#f59e0b' },
        ]
    }
};

export interface TenantSettings {
    mqtt: {
        brokerUrl: string;
        port: string;
        clientId: string;
        useSsl: boolean;
    };
    thresholds: {
        criticalTemp: number;
        lowVoltage: number;
        minRssi: number;
    };
    notifications: {
        email: boolean;
        whatsapp: boolean;
        weeklyReports: boolean;
    };
}

export const tenantSettings: Record<string, TenantSettings> = {
    't1': {
        mqtt: {
            brokerUrl: 'mqtt.midnight-platform.io',
            port: '8883',
            clientId: 'MDNT_V1_GW_04',
            useSsl: true,
        },
        thresholds: {
            criticalTemp: 75,
            lowVoltage: 3.2,
            minRssi: -95,
        },
        notifications: {
            email: true,
            whatsapp: true,
            weeklyReports: false,
        }
    },
    't2': {
        mqtt: {
            brokerUrl: 'mqtt.solar-solutions.com',
            port: '1883',
            clientId: 'SOLAR_INV_01',
            useSsl: false,
        },
        thresholds: {
            criticalTemp: 85,
            lowVoltage: 11.5,
            minRssi: -80,
        },
        notifications: {
            email: true,
            whatsapp: false,
            weeklyReports: true,
        }
    }
};
