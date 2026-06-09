import { useState, useEffect } from 'react';
import type { Device } from '../data/mockData';
import { useTenant } from '../contexts/TenantContext';
import { mapRowToDevice } from '../services/SupabaseMapper';
import { channelManager } from '../services/ChannelManager';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nikaotech.com/api';

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

export const useSupabaseData = (tenantId: string, deviceId?: string, userRole?: string, allowedDevices?: string[]) => {
    const { availableTenants } = useTenant();
    const [devices, setDevices] = useState<Device[]>([]);
    const [history, setHistory] = useState<{ time: string, value: number, timestamp?: string }[]>([]);
    const [events, setEvents] = useState<DeviceEvent[]>([]);

    const isManager = userRole === 'manager' || userRole === 'gestor';

    // Fetch devices
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                let url = `${API_BASE_URL}/devices`;
                if (deviceId) {
                    url = `${API_BASE_URL}/devices/${deviceId}`;
                }
                const response = await fetch(url);
                if (!response.ok) throw new Error('Falha ao buscar dispositivos');
                const data = await response.json();

                const dataArray = Array.isArray(data) ? data : [data];
                const mappedDevices = dataArray.map(mapRowToDevice);

                const filteredDevices = mappedDevices.filter(d => {
                    if (isManager) return true;
                    if (userRole === 'admin') return true;

                    const isUnassigned = UNASSIGNED_TENANT_IDS.includes(d.tenantId as any) || !d.tenantId;
                    if (isUnassigned) return false;

                    if (userRole === 'user' || userRole === 'viewer') {
                        if (allowedDevices && allowedDevices.length > 0) {
                            return allowedDevices.includes(d.id);
                        }
                        return false;
                    }

                    return true;
                });

                // Filtrar por tenantId localmente no carregamento inicial se não for 'all' e não for detalhe de device único
                const finalDevices = (tenantId && tenantId !== 'all' && !deviceId)
                    ? filteredDevices.filter(d => d.tenantId === tenantId)
                    : filteredDevices;

                setDevices(finalDevices);
            } catch (error) {
                console.error("API Error (devices):", error);
            }
        };

        fetchDevices();

        const channelId = `devices_status_${tenantId}_${deviceId || 'all'}`;
        channelManager.subscribe(channelId, 'devices_status', () => {
            fetchDevices();
        });

        return () => {
            channelManager.unsubscribe(channelId);
        };
    }, [tenantId, isManager, availableTenants, userRole, deviceId, allowedDevices]);

    // Fetch telemetry history (últimas 24h)
    useEffect(() => {
        const fetchHistory = async () => {
            if (!deviceId) {
                setHistory([]);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/history`);
                if (!response.ok) throw new Error('Falha ao buscar histórico de telemetria');
                const data = await response.json();

                const hist: { time: string; value: number; timestamp?: string }[] = [];
                let lastAddedHour = -1;

                // Ordena do mais antigo para o mais novo para plotar o gráfico
                const sortedData = [...data].reverse();

                for (const row of sortedData) {
                    const horaReg = row.horaRegistro || row.hora_registro;
                    if (!horaReg) continue;

                    const [hStr] = horaReg.split(':');
                    const h = parseInt(hStr, 10);

                    if (!isNaN(h) && h !== lastAddedHour) {
                        lastAddedHour = h;
                        // Adiciona o primeiro registro para cada bloco de hora
                        hist.push({
                            time: `${hStr}:00`,
                            value: Number(row.temperature) ?? 0,
                            timestamp: row.timestamp ?? undefined
                        });
                    }
                }
                setHistory(hist);
            } catch (error) {
                console.error("API Error (history):", error);
            }
        };

        fetchHistory();

        const channelId = `telemetry_${tenantId}_${deviceId || 'all'}`;
        channelManager.subscribe(
            channelId,
            'telemetry',
            () => fetchHistory(),
            { event: 'INSERT', schema: 'public' }
        );

        return () => {
            channelManager.unsubscribe(channelId);
        };
    }, [tenantId, deviceId]);

    // Fetch events
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                let url = `${API_BASE_URL}/events?`;
                if (deviceId) {
                    url += `deviceId=${deviceId}&`;
                }
                if (tenantId) {
                    url += `tenantId=${tenantId}&`;
                }
                if (userRole) {
                    url += `userRole=${userRole}&`;
                }
                if (availableTenants && availableTenants.length > 0) {
                    availableTenants.forEach(t => {
                        url += `availableTenantIds=${t.id}&`;
                    });
                }

                const response = await fetch(url);
                if (!response.ok) throw new Error('Falha ao buscar eventos');
                const data = await response.json();

                const mappedEvents: DeviceEvent[] = (data || []).map((row: any) => ({
                    id: row.id,
                    deviceId: row.deviceId || row.device_id,
                    type: row.details?.TIPO || row.type || '',
                    msg: row.msg,
                    message: row.message,
                    timestamp: row.timestamp,
                    tenantId: row.tenantId || row.tenant_id,
                    userName: row.userName || row.user_name,
                    userEmail: row.userEmail || row.user_email,
                    source: row.source,
                    value: row.value,
                    details: row.details,
                }));
                const filteredEvents = mappedEvents.filter(e => {
                    if (userRole === 'user' || userRole === 'viewer') {
                        if (allowedDevices && allowedDevices.length > 0) {
                            return allowedDevices.includes(e.deviceId);
                        }
                        return false;
                    }
                    return true;
                });

                setEvents(filteredEvents);
            } catch (error) {
                console.error("API Error (events):", error);
            }
        };

        if (userRole) {
            fetchEvents();

            const channelId = `events_${tenantId}_${deviceId || 'all'}`;
            channelManager.subscribe(channelId, 'events', () => {
                fetchEvents();
            });

            return () => {
                channelManager.unsubscribe(channelId);
            };
        }
    }, [tenantId, deviceId, userRole, availableTenants, isManager, allowedDevices]);

    const refreshEvents = async () => {
        try {
            let url = `${API_BASE_URL}/events?`;
            if (deviceId) {
                url += `deviceId=${deviceId}&`;
            }
            if (tenantId) {
                url += `tenantId=${tenantId}&`;
            }
            if (userRole) {
                url += `userRole=${userRole}&`;
            }
            if (availableTenants && availableTenants.length > 0) {
                availableTenants.forEach(t => {
                    url += `availableTenantIds=${t.id}&`;
                });
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha ao atualizar eventos');
            const data = await response.json();

            const mappedEvents: DeviceEvent[] = (data || []).map((row: any) => ({
                id: row.id,
                deviceId: row.deviceId || row.device_id,
                tenantId: row.tenantId || row.tenant_id,
                type: row.details?.TIPO || row.type || '',
                msg: row.msg || row.message,
                severity: row.severity,
                timestamp: row.timestamp,
                userName: row.userName || row.user_name,
                userEmail: row.userEmail || row.user_email
            }));
            const filteredEvents = mappedEvents.filter(e => {
                if (userRole === 'user' || userRole === 'viewer') {
                    if (allowedDevices && allowedDevices.length > 0) {
                        return allowedDevices.includes(e.deviceId);
                    }
                    return false;
                }
                return true;
            });

            setEvents(filteredEvents);
        } catch (error) {
            console.error("API Error (refreshEvents):", error);
        }
    };

    return { devices, history, events, refreshEvents };
};

export const useUsers = (userRole?: string) => {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users`);
            if (!response.ok) throw new Error('Falha ao buscar usuários');
            const data = await response.json();
            setUsers(data || []);
        } catch (error) {
            console.error("API Error (users):", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (userRole !== 'manager' && userRole !== 'gestor' && userRole !== 'admin') {
            setIsLoading(false);
            return;
        }

        fetchUsers();

        const channelId = 'users_global_changes';
        channelManager.subscribe(channelId, 'users', () => {
            fetchUsers();
        });

        return () => {
            channelManager.unsubscribe(channelId);
        };
    }, [userRole]);

    return { users, isLoading, refreshUsers: fetchUsers };
};

export const useReports = (tenantId: string) => {
    const [reportConfigs, setReportConfigs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/reports/configs?tenantId=${tenantId}`);
            if (!response.ok) throw new Error('Falha ao buscar configs de relatórios');
            const data = await response.json();
            setReportConfigs(data || []);
        } catch (error) {
            console.error("API Error (reports configs):", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
        const channelId = `report_configs_${tenantId}`;
        channelManager.subscribe(channelId, 'report_configs', () => {
            fetchReports();
        });

        return () => {
            channelManager.unsubscribe(channelId);
        };
    }, [tenantId]);

    const saveReportConfig = async (config: any) => {
        const response = await fetch(`${API_BASE_URL}/reports/configs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        if (!response.ok) throw new Error('Falha ao salvar configuração de relatório');
        await fetchReports();
    };

    const deleteReportConfig = async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/reports/configs/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Falha ao excluir configuração de relatório');
        await fetchReports();
    };

    return { reportConfigs, isLoading, saveReportConfig, deleteReportConfig };
};
