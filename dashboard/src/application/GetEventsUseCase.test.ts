import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetEventsUseCase } from './GetEventsUseCase';
import type { IEventRepository } from '../domain/repositories';
import type { DeviceEvent } from '../domain/entities/Event';

describe('GetEventsUseCase', () => {
    const mockEvents: DeviceEvent[] = [
        { id: '1', deviceId: 'd1', type: 'alerta', timestamp: '2026-01-01', tenantId: 'tenant-1', message: 'Temp Alta' },
    ];

    const mockRepo: IEventRepository = {
        listAll: vi.fn(),
        listByTenant: vi.fn(),
        save: vi.fn(),
        listByDevice: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve listar eventos do tenant', async () => {
        (mockRepo.listByTenant as any).mockResolvedValue(mockEvents);
        const useCase = new GetEventsUseCase(mockRepo);

        const result = await useCase.execute({ tenantId: 'tenant-1' });

        expect(mockRepo.listByTenant).toHaveBeenCalledWith('tenant-1', 50);
        expect(result).toHaveLength(1);
    });

    it('deve listar todos os eventos se for gestor', async () => {
        (mockRepo.listAll as any).mockResolvedValue(mockEvents);
        const useCase = new GetEventsUseCase(mockRepo);

        const result = await useCase.execute({ userRole: 'gestor' });

        expect(mockRepo.listAll).toHaveBeenCalledWith(50);
        expect(result).toHaveLength(1);
    });

    it('deve listar eventos por dispositivo se deviceId for fornecido', async () => {
        (mockRepo.listByDevice as any).mockResolvedValue(mockEvents);
        const useCase = new GetEventsUseCase(mockRepo);

        const result = await useCase.execute({ deviceId: 'd1' });

        expect(mockRepo.listByDevice).toHaveBeenCalledWith('d1');
        expect(result).toHaveLength(1);
    });

    it('deve respeitar o limite opcional', async () => {
        const useCase = new GetEventsUseCase(mockRepo);
        await useCase.execute({ tenantId: 'tenant-1', limit: 10 });
        expect(mockRepo.listByTenant).toHaveBeenCalledWith('tenant-1', 10);
    });
});
