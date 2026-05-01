import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDevicesUseCase } from './GetDevicesUseCase';
import type { IDeviceRepository } from '../domain/repositories';
import type { Device } from '../domain/entities/Device';

describe('GetDevicesUseCase', () => {
    const mockDevices: Device[] = [
        { id: '1', name: 'Sensor 1', tenantId: 'empresa-a', type: 'esp32', status: 'online', location: 'Lab', lastSeen: '', telemetry: {} },
        { id: '2', name: 'Sensor 2', tenantId: 'empresa-b', type: 'esp32', status: 'online', location: 'Lab', lastSeen: '', telemetry: {} },
    ];

    const mockRepo: IDeviceRepository = {
        listAll: vi.fn(),
        listByTenant: vi.fn(),
        getById: vi.fn(),
        updateStatus: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve listar todos os dispositivos para o papel gestor', async () => {
        (mockRepo.listAll as any).mockResolvedValue(mockDevices);
        const useCase = new GetDevicesUseCase(mockRepo);

        const result = await useCase.execute({ userRole: 'gestor' });

        expect(mockRepo.listAll).toHaveBeenCalled();
        expect(result).toHaveLength(2);
    });

    it('deve filtrar dispositivos por empresa para o papel user', async () => {
        (mockRepo.listByTenant as any).mockResolvedValue([mockDevices[0]]);
        const useCase = new GetDevicesUseCase(mockRepo);

        const result = await useCase.execute({ userRole: 'user', tenantId: 'empresa-a' });

        expect(mockRepo.listByTenant).toHaveBeenCalledWith('empresa-a');
        expect(result).toHaveLength(1);
        expect(result[0].tenantId).toBe('empresa-a');
    });

    it('deve retornar lista vazia se user não tiver tenantId', async () => {
        const useCase = new GetDevicesUseCase(mockRepo);
        const result = await useCase.execute({ userRole: 'user', tenantId: undefined });
        expect(result).toHaveLength(0);
        expect(mockRepo.listByTenant).not.toHaveBeenCalled();
    });

    it('deve lidar corretamente com dispositivos que possuem tenantId nulo para o gestor', async () => {
        const devicesWithNull: Device[] = [
            ...mockDevices,
            { id: '3', name: 'Sensor Sem Empresa', tenantId: null, type: 'esp32', status: 'online', location: 'Lab', lastSeen: '', telemetry: {} }
        ];
        (mockRepo.listAll as any).mockResolvedValue(devicesWithNull);
        const useCase = new GetDevicesUseCase(mockRepo);

        const result = await useCase.execute({ userRole: 'gestor' });

        expect(mockRepo.listAll).toHaveBeenCalled();
        expect(result).toHaveLength(3);
        expect(result.find(d => d.id === '3')?.tenantId).toBeNull();
    });
});
