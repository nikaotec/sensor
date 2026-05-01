import type { IReportConfigRepository } from '../domain/repositories';

export class DeleteReportUseCase {
    private reportRepository: IReportConfigRepository;

    constructor(reportRepository: IReportConfigRepository) {
        this.reportRepository = reportRepository;
    }

    async execute(id: string): Promise<void> {
        await this.reportRepository.delete(id);
    }
}
