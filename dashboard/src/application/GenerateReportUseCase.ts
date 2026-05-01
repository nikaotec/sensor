import type { ReportType, ReportQuery } from '../domain/entities/Telemetry';

export interface ReportForm {
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    selected_hours: string[];
    use_all_hours: boolean;
    detailed_hour_start: string;
}

export class GenerateReportUseCase {
    constructor() { }

    getTargetDeviceIds(
        specificDeviceId: string | null,
        targetTenantId: string | null,
        allDevices: any[]
    ): string[] {
        if (specificDeviceId) return [specificDeviceId];
        if (targetTenantId && targetTenantId !== 'all') {
            return allDevices
                .filter(d => d.tenantId === targetTenantId)
                .map(d => d.id);
        }
        return allDevices.map(d => d.id);
    }

    prepareQueryParams(reportType: ReportType, form: ReportForm): ReportQuery {
        const formatSP = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        const now = new Date();
        const today = formatSP(now);

        switch (reportType) {
            case 'daily':
                return {
                    startDate: today,
                    endDate: today,
                    startTime: '00:00',
                    endTime: '23:59',
                    selectedHours: form.selected_hours?.length > 0 ? form.selected_hours : ['08:00', '16:00'],
                    useSelectedHoursFilter: true,
                    limit: 10000
                };

            case 'monthly':
                const firstDay = new Date();
                firstDay.setHours(0, 0, 0, 0);
                firstDay.setDate(1);
                return {
                    startDate: formatSP(firstDay),
                    endDate: today,
                    startTime: '00:00',
                    endTime: '23:59',
                    selectedHours: form.selected_hours?.length > 0 ? form.selected_hours : ['08:00', '16:00'],
                    useSelectedHoursFilter: true,
                    limit: 10000
                };

            case 'detailed':
                const [h] = form.detailed_hour_start.split(':').map(Number);
                const min = form.detailed_hour_start.split(':')[1];
                const endTimeDetailed = `${(h + 1).toString().padStart(2, '0')}:${min}`;
                return {
                    startDate: form.start_date,
                    endDate: form.start_date,
                    startTime: form.detailed_hour_start,
                    endTime: endTimeDetailed,
                    selectedHours: [],
                    useSelectedHoursFilter: false,
                    limit: 2000
                };

            case 'custom':
            default:
                return {
                    startDate: form.start_date,
                    endDate: form.end_date,
                    startTime: form.start_time,
                    endTime: form.end_time,
                    selectedHours: form.selected_hours,
                    useSelectedHoursFilter: !form.use_all_hours,
                    limit: 10000
                };
        }
    }
}
