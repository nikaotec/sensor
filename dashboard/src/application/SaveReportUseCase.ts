import type { ReportConfig } from '../domain/entities/ReportConfig';
import type { IReportConfigRepository } from '../domain/repositories';

export class SaveReportUseCase {
    private reportRepository: IReportConfigRepository;

    constructor(reportRepository: IReportConfigRepository) {
        this.reportRepository = reportRepository;
    }

    async execute(config: ReportConfig): Promise<void> {
        await this.reportRepository.save(config);
    }
}
