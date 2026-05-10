import { useState, useEffect } from 'react';
import { supabase } from '../supabase/config';
import type { Device } from '../data/mockData';
import { useTenant } from '../contexts/TenantContext';
import { mapRowToDevice } from '../services/SupabaseMapper';

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

    const isManager = userRole === 'manager' || userRole === 'gestor' || userRole === 'admin';

    // Fetch devices
    useEffect(() => {
        const fetchDevices = async () => {
            let query = supabase.from('devices_status').select('*');

            if (deviceId) {
                query = query.eq('id', deviceId);
            } else if (tenantId && tenantId !== 'all') {
                query = query.eq('tenant_id', tenantId);
            } else if (isManager && tenantId === 'all') {
                // Gestor vê todos
            } else if (!isManager && availableTenants.length > 0) {
                const userTenantIds = availableTenants.map(t => t.id);
                query = query.in('tenant_id', userTenantIds);
            }

            const { data, error } = await query;
            if (error) {
                console.error("Supabase Error (devices):", error);
                return;
            }

            const mappedDevices = (data || []).map(mapRowToDevice);

            const filteredDevices = mappedDevices.filter(d => {
                if (isManager) return true;
                const isUnassigned = UNASSIGNED_TENANT_IDS.includes(d.tenantId as any) || !d.tenantId;
                return !isUnassigned;
            });

            setDevices(filteredDevices);
        };

        fetchDevices();

        const channel = supabase
            .channel('devices_status_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'devices_status' },
                () => fetchDevices()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId, isManager, availableTenants, userRole, deviceId]);

    // Fetch telemetry history (últimas 24h)
    useEffect(() => {
        const fetchHistory = async () => {
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            let query = supabase
                .from('telemetry')
                .select('data_registro, hora_registro, temperature, timestamp, mensage_tipo')
                .gte('data_registro', yesterdayStr)
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

            const hist: { time: string; value: number; timestamp?: string }[] = [];
            let lastAddedHour = -1;

            for (const row of (data || [])) {
                if (!row.hora_registro) continue;

                const [hStr] = row.hora_registro.split(':');
                const h = parseInt(hStr, 10);

                if (!isNaN(h) && h !== lastAddedHour) {
                    lastAddedHour = h;
                    // Add only the first record for each hour block
                    hist.push({
                        time: `${hStr}:00`,
                        value: Number(row.temperature) ?? 0,
                        timestamp: row.timestamp ?? undefined
                    });
                }
            }
            setHistory(hist);
        };

        fetchHistory();

        const channel = supabase
            .channel('telemetry_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'telemetry' },
                () => fetchHistory()
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
                query = query.eq('tenant_id', tenantId);
            } else if (isManager && tenantId === 'all') {
                // Gestor vê tudo
            } else if (!isManager && availableTenants.length > 0) {
                const userTenantIds = availableTenants.map(t => t.id);
                query = query.in('tenant_id', userTenantIds);
            } else {
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

            const channel = supabase
                .channel('events_changes')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'events' },
                    () => fetchEvents()
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [tenantId, deviceId, userRole, availableTenants, isManager]);

    const refreshEvents = async () => {
        const dateLimit = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        let query = supabase
            .from('events')
            .select('*')
            .gte('timestamp', dateLimit)
            .order('timestamp', { ascending: false });

        if (deviceId) {
            query = query.eq('device_id', deviceId);
        } else if (tenantId && tenantId !== 'all') {
            query = query.eq('tenant_id', tenantId);
        } else if (isManager && tenantId === 'all') {
            // Gestor vê tudo
        } else if (!isManager && availableTenants.length > 0) {
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
        if (userRole !== 'manager' && userRole !== 'gestor' && userRole !== 'admin') {
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

        const channel = supabase
            .channel('users_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'users' },
                () => fetchUsers()
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
