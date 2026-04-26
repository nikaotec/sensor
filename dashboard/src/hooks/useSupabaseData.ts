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
    userName?: string;
    userEmail?: string;
    source?: string;
    value?: string;
    details?: any;
}

const UNASSIGNED_TENANT_IDS = ['Unknown', 'empresa_default', 'unassigned', null, ''];

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
                chkVolt: row.chk_volt !== null ? row.chk_volt : true,
                chkBat: row.chk_bat !== null ? row.chk_bat : true,
                chkTemp: row.chk_temp !== null ? row.chk_temp : true,
                chkDoor: row.chk_door !== null ? row.chk_door : true,
            }
        } as Device;
    };

    // Fetch devices
    useEffect(() => {
        const fetchDevices = async () => {
            let query = supabase.from('devices_status').select('*');

            if (deviceId) {
                // Se temos um deviceId específico, buscar apenas dados desse dispositivo
                // Independente da empresa, pois o usuário já teve acesso ao evento/alerta dele.
                query = query.eq('id', deviceId);
            } else if (tenantId && tenantId !== 'all') {
                // Especificamente selecionado: usar este ID
                query = query.eq('tenant_id', tenantId);
            } else if (isManager && tenantId === 'all') {
                // Gestor vê todos os dispositivos (incluindo não atribuídos)
            } else if (!isManager && availableTenants.length > 0) {
                // Usuário normal vê "Todos": filtrar pelas empresas vinculadas
                const userTenantIds = availableTenants.map(t => t.id);
                query = query.in('tenant_id', userTenantIds);
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
        const fetchHistory = async () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            // A tabela telemetry NÃO tem tenant_id, então buscamos apenas por deviceId
            let query = supabase
                .from('telemetry')
                .select('data_registro, hora_registro, temperature, timestamp, mensage_tipo')
                .gte('data_registro', yesterdayStr)
                .in('mensage_tipo', ['periodico', 'relatorio_diario'])
                .order('data_registro', { ascending: true })
                .order('hora_registro', { ascending: true });

            if (deviceId) {
                query = query.eq('device_id', deviceId);
            } else if (tenantId && tenantId !== 'all' && devices.length > 0) {
                const deviceIds = devices.map(d => d.id);
                if (deviceIds.length > 0) {
                    query = query.in('device_id', deviceIds);
                }
            }

            const { data, error } = await query;
            if (error) {
                console.error("Supabase Error (history):", error);
                return;
            }

            const hist = (data || []).map((row: any) => {
                // Formatar hora para exibição (HH:mm)
                // Se o campo hora_registro já vier formatado ou for tipo TIME, podemos usar direto
                // Mas para consistência com o resto do app que usa 'America/Sao_Paulo'
                const [h, m] = row.hora_registro.split(':');
                return {
                    time: `${h}:${m}`,
                    value: row.temperature ?? 0,
                    timestamp: row.timestamp // Mantido para referência se necessário
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
    }, [tenantId, deviceId, devices]);

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
            } else if (tenantId && tenantId !== 'all') {
                // Especificamente selecionado: usar este ID
                query = query.eq('tenant_id', tenantId);
            } else if (isManager && tenantId === 'all') {
                // Gestor vê tudo — sem filtro
            } else if (!isManager && availableTenants.length > 0) {
                // Usuário normal vê "Todos": filtrar pelas empresas vinculadas
                const userTenantIds = availableTenants.map(t => t.id);
                query = query.in('tenant_id', userTenantIds);
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
                type: row.details?.TIPO || row.type || '',
                msg: row.msg,
                message: row.message,
                timestamp: row.timestamp,
                tenantId: row.tenant_id,
                userName: row.user_name,
                userEmail: row.user_email,
                source: row.source,
                value: row.value,
                details: row.details,
            }));
            setEvents(mappedEvents);
        };

        if (userRole) {
            fetchEvents();

            // Realtime para events
            const channel = supabase
                .channel('events_changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'events' },
                    () => {
                        fetchEvents();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [tenantId, deviceId, userRole, availableTenants]);

    const refreshEvents = async () => {
        // Simple trigger for manually refreshing events
        const dateLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let query = supabase
            .from('events')
            .select('*')
            .gte('timestamp', dateLimit)
            .order('timestamp', { ascending: false });

        if (deviceId) {
            query = query.eq('device_id', deviceId);
        } else if (tenantId && tenantId !== 'all') {
            // Especificamente selecionado: usar este ID
            query = query.eq('tenant_id', tenantId);
        } else if (isManager && tenantId === 'all') {
            // Gestor vê tudo
        } else if (!isManager && availableTenants.length > 0) {
            // "Todos": mostrar apenas o que tem acesso
            const userTenantIds = availableTenants.map(t => t.id);
            query = query.in('tenant_id', userTenantIds);
        }

        const { data } = await query;
        if (data) {
            const mappedEvents: DeviceEvent[] = data.map((row: any) => ({
                id: row.id,
                deviceId: row.device_id,
                tenantId: row.tenant_id,
                type: row.details?.TIPO || row.type || '',
                msg: row.msg || row.message,
                severity: row.severity,
                timestamp: row.timestamp,
                userName: row.user_name,
                userEmail: row.user_email
            }));
            setEvents(mappedEvents);
        }
    };

    return { devices, history, events, refreshEvents };
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
export const useReports = (tenantId: string) => {
    const [reportConfigs, setReportConfigs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReports = async () => {
        setIsLoading(true);
        let query = supabase.from('report_configs').select('*');

        if (tenantId !== 'all') {
            query = query.eq('tenant_id', tenantId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error("Erro ao carregar relatórios:", error);
        } else {
            setReportConfigs(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchReports();
        const channel = supabase
            .channel('report_configs_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'report_configs' }, () => {
                fetchReports();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId]);

    const saveReportConfig = async (config: any) => {
        const { error } = await supabase.from('report_configs').upsert(config);
        if (error) throw error;
        await fetchReports();
    };

    const deleteReportConfig = async (id: string) => {
        const { error } = await supabase.from('report_configs').delete().eq('id', id);
        if (error) throw error;
        await fetchReports();
    };

    return { reportConfigs, isLoading, saveReportConfig, deleteReportConfig };
};
