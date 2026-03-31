import { useState, useEffect } from 'react';
import { supabase } from '../supabase/config';
import type { Device } from '../data/mockData';
import { useTenant } from '../contexts/TenantContext';

export interface DeviceEvent {
    id: string;
    deviceId: string;
    type: string;
    msg?: string;
    message?: string;
    timestamp: string;
    tenantId: string;
}

const UNASSIGNED_TENANT_IDS = ['Unknown', 'empresa_default', 'Nikaotec', 'unassigned', null, ''];

export const useSupabaseData = (tenantId: string, deviceId?: string, userRole?: string) => {
    const { availableTenants } = useTenant();
    const [devices, setDevices] = useState<Device[]>([]);
    const [history, setHistory] = useState<{ time: string, value: number, timestamp?: string }[]>([]);
    const [events, setEvents] = useState<DeviceEvent[]>([]);

    const isManager = userRole === 'manager' || userRole === 'gestor';

    // Helper: mapear row do Supabase para Device
    const mapRowToDevice = (row: any): Device => {
        const dailyStats = row.daily_stats || {};
        return {
            id: row.id,
            name: row.name || row.device_name || row.id,
            tenantId: row.tenant_id,
            type: 'sensor_temp',
            status: row.status || 'offline',
            location: row.location || row.location_id || '',
            lastSeen: row.last_seen || row.updated_at || '',
            telemetry: {
                temp: row.temperature !== null ? row.temperature : undefined,
                humidity: row.humidity !== null ? row.humidity : undefined,
                batteryVoltage: row.battery !== null ? row.battery : undefined,
                inputVoltage: row.voltage !== null ? row.voltage : undefined,
                signal: row.signal !== null ? row.signal : undefined,
                doorOpen: row.door_open !== null ? row.door_open : undefined,
                tempMax: row.temp_max !== null ? row.temp_max
                    : (dailyStats.maxTemp !== undefined ? dailyStats.maxTemp : undefined),
                tempMin: row.temp_min !== null ? row.temp_min
                    : (dailyStats.minTemp !== undefined ? dailyStats.minTemp : undefined),
                tempExt: row.temp_ext !== null ? row.temp_ext : undefined,
            }
        } as Device;
    };

    // Fetch devices
    useEffect(() => {
        const fetchDevices = async () => {
            let query = supabase.from('devices_status').select('*');
            
            if (isManager && tenantId === 'all') {
                // Gestor vê todos os dispositivos (incluindo não atribuídos)
            } else if (!isManager && availableTenants.length > 0) {
                // Usuário normal: só vê dispositivos das empresas que está vinculado
                const userTenantIds = availableTenants.map(t => t.id);
                query = query.in('tenant_id', userTenantIds);
            } else if (tenantId && tenantId !== 'all') {
                // Filtrar por empresa específica
                query = query.eq('tenant_id', tenantId);
            }

            const { data, error } = await query;
            if (error) {
                console.error("Supabase Error (devices):", error);
                return;
            }

            const mappedDevices = (data || []).map(mapRowToDevice);
            
            // Filtrar dispositivos não atribuídos para usuários não-gestores
            const filteredDevices = mappedDevices.filter(d => {
                if (isManager) return true; // Gestor vê tudo
                const isUnassigned = UNASSIGNED_TENANT_IDS.includes(d.tenantId as any) || !d.tenantId;
                return !isUnassigned; // Não-gestor não vê dispositivos não atribuídos
            });
            
            setDevices(filteredDevices);
        };

        fetchDevices();

        // Realtime subscription para devices_status
        const channel = supabase
            .channel('devices_status_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'devices_status' },
                () => {
                    // Re-fetch ao receber mudança (simples e confiável)
                    fetchDevices();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId, isManager, availableTenants, userRole]);

    // Fetch telemetry history (últimas 24h)
    useEffect(() => {
        const dateLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const fetchHistory = async () => {
            let query = supabase
                .from('telemetry')
                .select('*')
                .gte('timestamp', dateLimit)
                .order('timestamp', { ascending: true });

            if (deviceId) {
                query = query.eq('device_id', deviceId);
            }

            const { data, error } = await query;
            if (error) {
                console.error("Supabase Error (history):", error);
                return;
            }

            const hist = (data || []).map((row: any) => {
                const date = new Date(row.timestamp);
                return {
                    time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    value: row.temperature ?? 0,
                    timestamp: row.timestamp
                };
            });
            setHistory(hist);
        };

        fetchHistory();

        // Realtime para telemetry
        const channel = supabase
            .channel('telemetry_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'telemetry' },
                () => {
                    fetchHistory();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId, deviceId]);

    // Fetch events
    useEffect(() => {
        const fetchEvents = async () => {
            let query = supabase
                .from('events')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50);

            if (deviceId) {
                query = query.eq('device_id', deviceId);
            } else if (isManager && tenantId === 'all') {
                // Gestor vê tudo — sem filtro
            } else if (!isManager && availableTenants.length > 0) {
                // Usuário normal: só vê eventos das empresas vinculadas
                const userTenantIds = availableTenants.map(t => t.id);
                query = query.in('tenant_id', userTenantIds);
            } else if (tenantId && tenantId !== 'all') {
                query = query.eq('tenant_id', tenantId);
            } else {
                // Sem empresas vinculadas, não mostra nada
                setEvents([]);
                return;
            }

            const { data, error } = await query;
            if (error) {
                console.error("Supabase Error (events):", error);
                return;
            }

            const mappedEvents: DeviceEvent[] = (data || []).map((row: any) => ({
                id: row.id,
                deviceId: row.device_id,
                type: row.type || '',
                msg: row.msg,
                message: row.message,
                timestamp: row.timestamp,
                tenantId: row.tenant_id,
                userName: row.user_name,
                userEmail: row.user_email,
                source: row.source,
            }));
            setEvents(mappedEvents);
        };

        fetchEvents();

        // Realtime para events
        const channel = supabase
            .channel('events_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'events' },
                () => {
                    fetchEvents();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId, deviceId, isManager, availableTenants]);

    return { devices, history, events };
};

export const useUsers = (userRole?: string) => {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userRole !== 'manager' && userRole !== 'gestor') {
            setIsLoading(false);
            return;
        }

        const fetchUsers = async () => {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('email');

            if (error) {
                console.error("Erro ao carregar usuários:", error);
                setIsLoading(false);
                return;
            }

            setUsers(data || []);
            setIsLoading(false);
        };

        fetchUsers();

        // Realtime para users
        const channel = supabase
            .channel('users_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'users' },
                () => {
                    fetchUsers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userRole]);

    return { users, isLoading };
};
