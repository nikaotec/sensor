import { useMemo } from 'react';
import { useSupabaseData } from './useSupabaseData';
import { useMqttData } from './useMqttData';

export interface TelemetryData {
    devices: any[];
    displayDevices: any[];
    mqttConnected: boolean;
    mqttClient?: any;
}

export const useTelemetryData = (
    currentTenant: any,
    availableTenants: any[],
    currentUser: any,
    onAlert?: (payload: any) => void,
    onDeviceNameChange?: (deviceId: string, newName: string) => void
) => {
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'gestor';
    const isAdmin = currentUser?.role === 'admin';

    // Fetch initial devices from Supabase and update with live MQTT stream
    const { devices: supabaseDevices } = useSupabaseData(
        currentTenant?.id || '',
        undefined,
        currentUser?.role,
        currentUser?.allowedDevices
    );

    const { devices: tenantDevices, isConnected: mqttConnected, mqttClient } = useMqttData(
        'all',
        currentUser?.role,
        supabaseDevices,
        onAlert,
        onDeviceNameChange
    );

    // Filter refined to respect the selected tab and role permissions
    const displayDevices = useMemo(() => {
        // If there are no devices, return empty
        if (!tenantDevices || tenantDevices.length === 0) return [];

        // Always filter unlinked devices
        const assignedDevices = tenantDevices.filter(d => {
            if (!d || !d.tenantId) return false;
            const t = String(d.tenantId).trim().toLowerCase();
            return t !== "" && t !== "unknown" && t !== "empresa_default" && t !== "nikaotec" && t !== "null" && t !== "undefined";
        });

        // If in a specific tenant tab (not "all"), filter only by it
        if (currentTenant && currentTenant.id !== 'all') {
            return assignedDevices.filter(d => d.tenantId === currentTenant.id || d.tenantId === currentTenant.name);
        }

        // Se gestor e na aba "Todos", mostra todos os dispositivos atribuídos
        if (isManager) {
            return assignedDevices;
        }

        // Normal user: show only devices from linked tenants AND allowed devices
        const allowedTenantIds = availableTenants.map(t => t.id);
        const allowedTenantNames = availableTenants.map(t => t.name);
        
        let filteredByTenant = assignedDevices.filter(d => {
            return allowedTenantIds.includes(d.tenantId) || allowedTenantNames.includes(d.tenantId);
        });

        if (!isAdmin && !isManager) {
            const allowedDevices = currentUser?.allowedDevices || currentUser?.allowed_devices || [];
            if (!allowedDevices || allowedDevices.length === 0) {
                return []; // Se não tem permissão para nenhum, retorna vazio
            }
            return filteredByTenant.filter(d => allowedDevices.includes(d.id));
        }

        return filteredByTenant;
    }, [tenantDevices, currentTenant, availableTenants, isManager, isAdmin, currentUser]);

    const onlineDevices = useMemo(() => {
        // Garantir que o dispositivo esteja online E tenha recebido atualização via MQTT nesta sessão com dados reais
        // Filtramos "zerados" (temp === 0 ou strings "0.0") pois podem indicar sensor ainda não inicializado ou erro
        return displayDevices.filter(d => {
            const tempValue = d.telemetry?.temp;
            const hasData = tempValue !== undefined && tempValue !== null;
            const isZero = hasData && Number(tempValue) === 0;

            return d.status === 'online' && d.mqttUpdated && hasData && !isZero;
        });
    }, [displayDevices]);

    return {
        supabaseDevices,
        tenantDevices,
        displayDevices,
        onlineDevices,
        mqttConnected,
        mqttClient
    };
};
