import type { ReportConfig } from '../domain/entities/ReportConfig';
import type { IReportConfigRepository } from '../domain/repositories';

export interface GetReportsRequest {
    tenantId: string;
}

export class GetReportsUseCase {
    private reportRepository: IReportConfigRepository;

    constructor(reportRepository: IReportConfigRepository) {
        this.reportRepository = reportRepository;
    }

    async execute(request: GetReportsRequest): Promise<ReportConfig[]> {
        return await this.reportRepository.listByTenant(request.tenantId);
    }
}
