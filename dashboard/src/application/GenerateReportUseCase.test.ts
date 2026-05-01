import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateReportUseCase } from './GenerateReportUseCase';
describe('GenerateReportUseCase', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock simple date for stability
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-20T12:00:00Z'));
    });

    it('deve preparar parâmetros corretos para relatório diário', async () => {
        const useCase = new GenerateReportUseCase();
        const result = useCase.prepareQueryParams('daily', {
            start_date: '', end_date: '', start_time: '', end_time: '',
            selected_hours: ['09:00'], use_all_hours: false, detailed_hour_start: ''
        });

        expect(result.startDate).toBe('2026-04-20');
        expect(result.selectedHours).toContain('09:00');
    });

    it('deve identificar IDs de dispositivos corretamente para um dispositivo específico', () => {
        const useCase = new GenerateReportUseCase();
        const ids = useCase.getTargetDeviceIds('dev-1', null, []);
        expect(ids).toEqual(['dev-1']);
    });

    it('deve filtrar IDs por tenant quando tenantId é fornecido', () => {
        const useCase = new GenerateReportUseCase();
        const allDevices = [
            { id: '1', tenantId: 't1' },
            { id: '2', tenantId: 't2' }
        ] as any;
        const ids = useCase.getTargetDeviceIds(null, 't1', allDevices);
        expect(ids).toEqual(['1']);
    });
});
