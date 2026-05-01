import type { Device } from '../domain/entities/Device';
import type { IDeviceRepository } from '../domain/repositories';

export interface GetDevicesRequest {
    userRole: string;
    tenantId?: string;
}

export class GetDevicesUseCase {
    private deviceRepository: IDeviceRepository;

    constructor(deviceRepository: IDeviceRepository) {
        this.deviceRepository = deviceRepository;
    }

    async execute(request: GetDevicesRequest): Promise<Device[]> {
        if (request.userRole === 'gestor') {
            return await this.deviceRepository.listAll();
        }

        if (request.userRole === 'user' && request.tenantId) {
            return await this.deviceRepository.listByTenant(request.tenantId);
        }

        return [];
    }
}
