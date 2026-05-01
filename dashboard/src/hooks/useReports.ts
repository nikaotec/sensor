import { useState, useEffect, useCallback } from 'react';
import { SupabaseReportRepository } from '../infrastructure/SupabaseReportRepository';
import { GetReportsUseCase } from '../application/GetReportsUseCase';
import { SaveReportUseCase } from '../application/SaveReportUseCase';
import { DeleteReportUseCase } from '../application/DeleteReportUseCase';
import type { ReportConfig } from '../domain/entities/ReportConfig';

export const useReports = (tenantId: string) => {
    const [reportConfigs, setReportConfigs] = useState<ReportConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reportRepository = new SupabaseReportRepository();
    const getReportsUseCase = new GetReportsUseCase(reportRepository);
    const saveReportUseCase = new SaveReportUseCase(reportRepository);
    const deleteReportUseCase = new DeleteReportUseCase(reportRepository);

    const fetchReports = useCallback(async () => {
        if (!tenantId) return;
        try {
            setIsLoading(true);
            const result = await getReportsUseCase.execute({ tenantId });
            setReportConfigs(result);
            setError(null);
        } catch (err: any) {
            console.error('[useReports] Error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const saveReportConfig = async (config: ReportConfig) => {
        try {
            await saveReportUseCase.execute(config);
            await fetchReports();
        } catch (err: any) {
            console.error('[useReports] Save Error:', err);
            throw err;
        }
    };

    const deleteReportConfig = async (id: string) => {
        try {
            await deleteReportUseCase.execute(id);
            await fetchReports();
        } catch (err: any) {
            console.error('[useReports] Delete Error:', err);
            throw err;
        }
    };

    return {
        reportConfigs,
        isLoading,
        error,
        saveReportConfig,
        deleteReportConfig,
        refresh: fetchReports
    };
};
