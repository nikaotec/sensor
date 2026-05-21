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
    currentUser: any
) => {
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'gestor';
    const isAdmin = currentUser?.role === 'admin';

    // Fetch initial devices from Supabase and update with live MQTT stream
    const { devices: supabaseDevices } = useSupabaseData(
        currentTenant?.id || '',
        undefined,
        currentUser?.role
    );

    const { devices: tenantDevices, isConnected: mqttConnected, mqttClient } = useMqttData(
        'all',
        currentUser?.role,
        supabaseDevices
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

        // If manager and in "All" tab, show all ASSIGNED devices
        if (isManager || isAdmin) {
            return assignedDevices;
        }

        // Normal user: show only devices from linked tenants
        const allowedTenantIds = availableTenants.map(t => t.id);
        const allowedTenantNames = availableTenants.map(t => t.name);

        return assignedDevices.filter(d => {
            return allowedTenantIds.includes(d.tenantId) || allowedTenantNames.includes(d.tenantId);
        });
    }, [tenantDevices, currentTenant, availableTenants, isManager, isAdmin]);

    const onlineDevices = useMemo(() => {
        return displayDevices.filter(d => d.status === 'online');
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
