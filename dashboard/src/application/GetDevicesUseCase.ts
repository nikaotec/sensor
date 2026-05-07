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
        // Admins and managers can see all devices
        if (request.userRole === 'gestor' || request.userRole === 'manager' || request.userRole === 'admin') {
            return await this.deviceRepository.listAll();
        }

        if (request.userRole === 'user' && request.tenantId) {
            // Also fetch by tenant name just in case
            return await this.deviceRepository.listByTenant(request.tenantId);
        }

        return [];
    }
}
