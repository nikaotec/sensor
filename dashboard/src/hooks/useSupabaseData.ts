import { useState, useEffect, useCallback } from 'react';
import { SupabaseDeviceRepository } from '../infrastructure/SupabaseDeviceRepository';
import { SupabaseEventRepository } from '../infrastructure/SupabaseEventRepository';
import { SupabaseUserRepository } from '../infrastructure/SupabaseUserRepository';
import { SupabaseTelemetryRepository } from '../infrastructure/SupabaseTelemetryRepository';
import { GetDevicesUseCase } from '../application/GetDevicesUseCase';
import { GetEventsUseCase } from '../application/GetEventsUseCase';
import { GetUsersUseCase } from '../application/GetUsersUseCase';
import { GetTelemetryHistoryUseCase } from '../application/GetTelemetryHistoryUseCase';
import type { Device } from '../domain/entities/Device';
import type { DeviceEvent } from '../domain/entities/Event';
import type { User } from '../domain/entities/User';
import type { Telemetry } from '../domain/entities/Telemetry';

export const useSupabaseData = (
    _initialTenantId?: string,
    deviceId?: string | any,
    initialRole?: string
) => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [events, setEvents] = useState<DeviceEvent[]>([]);
    const [history, setHistory] = useState<Telemetry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const deviceRepository = new SupabaseDeviceRepository();
    const eventRepository = new SupabaseEventRepository();
    const telemetryRepository = new SupabaseTelemetryRepository();

    const getDevicesUseCase = new GetDevicesUseCase(deviceRepository);
    const getEventsUseCase = new GetEventsUseCase(eventRepository);
    const getTelemetryHistoryUseCase = new GetTelemetryHistoryUseCase(telemetryRepository);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Obter role: se não foi passado no argumento, tenta pegar do Firebase ou assume admin.
            // Para resolver o erro do Supabase auth que falha em sessão vazia, ignoramos a verificação
            // estrita supabase.auth.getUser() e confiamos na injeção via props (initialRole) ou 
            // no auth.currentUser do Firebase.
            const { auth } = await import('../firebase/config');
            const firebaseUser = auth.currentUser;

            if (!firebaseUser && !initialRole) {
                // Se Firebase ainda não carregou e não tem role injetado, não faz carregar falhar com throw
                // Apenas interrompe sem erro até a próxima renderização que terá o usuário
                setLoading(false);
                return;
            }

            const role = initialRole || 'admin';

            // Respect the passed tenantId if it's not 'all', otherwise fallback
            let tenantId = _initialTenantId;
            if (!_initialTenantId || _initialTenantId !== 'all') {
                if (role === 'gestor' || role === 'manager') {
                    tenantId = 'all';
                }
            }

            // Define dates for history (last 24 hours)
            const endDate = new Date().toISOString();
            const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            const [devicesResult, eventsResult, historyResult] = await Promise.allSettled([
                getDevicesUseCase.execute({
                    userRole: role,
                    tenantId: tenantId === 'all' ? undefined : tenantId
                }),
                getEventsUseCase.execute({
                    userRole: role,
                    tenantId: tenantId === 'all' ? undefined : tenantId,
                    deviceId: (typeof deviceId === 'string' && deviceId) ? deviceId : undefined,
                    limit: 50
                }),
                (typeof deviceId === 'string' && deviceId) ? getTelemetryHistoryUseCase.execute({
                    deviceId,
                    startDate,
                    endDate
                }) : Promise.resolve([])
            ]);

            if (devicesResult.status === 'fulfilled') setDevices(devicesResult.value);
            else console.error("Error fetching devices:", devicesResult.reason);

            if (eventsResult.status === 'fulfilled') setEvents(eventsResult.value);
            else console.error("Error fetching events:", eventsResult.reason);

            if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
            else console.error("Error fetching history:", historyResult.reason);

            setError(null);
        } catch (err: any) {
            console.error('[useSupabaseData] Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [initialRole, deviceId, _initialTenantId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        devices,
        events,
        history,
        loading,
        error,
        refresh: fetchData
    };
};

export const useUsers = (userRole?: string) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const userRepository = new SupabaseUserRepository();
    const getUsersUseCase = new GetUsersUseCase(userRepository);

    const fetchUsers = useCallback(async () => {
        if (!userRole) return;
        try {
            setIsLoading(true);
            const result = await getUsersUseCase.execute({ userRole });
            setUsers(result);
            setError(null);
        } catch (err: any) {
            console.error('[useUsers] Error:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [userRole]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return {
        users,
        isLoading,
        error,
        refresh: fetchUsers
    };
};
