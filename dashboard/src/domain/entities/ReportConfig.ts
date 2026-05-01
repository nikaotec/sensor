export interface ReportConfig {
    id: string;
    tenant_id: string;
    name: string;
    type: 'device' | 'all' | 'company';
    device_id?: string;
    schedule_type: 'daily' | 'weekly' | 'monthly' | 'test';
    schedule_time: string;
    schedule_day?: number;
    channels: ('whatsapp' | 'email')[];
    recipients: string[];
    enabled: boolean;
    created_at?: string;
}
