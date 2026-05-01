import type { ITelemetryRepository } from '../domain/repositories';
import type { Telemetry } from '../domain/entities/Telemetry';

export interface GetTelemetryHistoryRequest {
    deviceId: string;
    startDate: string;
    endDate: string;
}

export class GetTelemetryHistoryUseCase {
    private telemetryRepository: ITelemetryRepository;

    constructor(telemetryRepository: ITelemetryRepository) {
        this.telemetryRepository = telemetryRepository;
    }

    async execute(request: GetTelemetryHistoryRequest): Promise<Telemetry[]> {
        if (!request.deviceId) return [];
        return this.telemetryRepository.listByDevice(
            request.deviceId,
            request.startDate,
            request.endDate
        );
    }
}
