import type { User } from '../domain/entities/User';
import type { IUserRepository } from '../domain/repositories';

export interface GetUsersRequest {
    userRole: string;
}

export class GetUsersUseCase {
    private userRepository: IUserRepository;

    constructor(userRepository: IUserRepository) {
        this.userRepository = userRepository;
    }

    async execute(request: GetUsersRequest): Promise<User[]> {
        if (['gestor', 'manager', 'admin'].includes(request.userRole || '')) {
            return await this.userRepository.listAll();
        }
        return [];
    }
}
