import type { DeviceEvent } from '../domain/entities/Event';
import type { IEventRepository } from '../domain/repositories';

export interface GetEventsRequest {
    userRole?: string;
    tenantId?: string;
    deviceId?: string;
    limit?: number;
}

export class GetEventsUseCase {
    private eventRepository: IEventRepository;

    constructor(eventRepository: IEventRepository) {
        this.eventRepository = eventRepository;
    }

    async execute(request: GetEventsRequest): Promise<DeviceEvent[]> {
        const limit = request.limit ?? 50;

        if (request.deviceId) {
            return await this.eventRepository.listByDevice(request.deviceId);
        }

        if (request.userRole === 'gestor' || request.userRole === 'manager' || request.userRole === 'admin') {
            return await this.eventRepository.listAll(limit);
        }

        if (request.tenantId) {
            return await this.eventRepository.listByTenant(request.tenantId, limit);
        }

        return [];
    }
}
