import { useMemo } from 'react';
import { useSupabaseData } from './useSupabaseData';
import { useMqttData } from './useMqttData';
import type { Device } from '../domain/entities/Device';

export interface TelemetryData {
    supabaseDevices: Device[];
    tenantDevices: Device[];
    displayDevices: Device[];
    mqttConnected: boolean;
}

export const useTelemetryData = (
    currentTenant: { id: string, name: string } | null,
    availableTenants: { id: string, name: string }[],
    currentUser: { role: string } | null
) => {
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'gestor';
    const isAdmin = currentUser?.role === 'admin';

    // Fetch initial devices from Supabase
    const { devices: supabaseDevices } = useSupabaseData(
        currentTenant?.id || 'all',
        undefined,
        currentUser?.role
    );

    // Update with live MQTT stream
    const { devices: tenantDevices, isConnected: mqttConnected, publish, updateDeviceLocal } = useMqttData(
        { id: currentTenant?.id || 'all', name: currentTenant?.name },
        currentUser?.role,
        supabaseDevices
    );

    // Filter refined to respect the selected tab and role permissions
    const displayDevices = useMemo(() => {
        if (!tenantDevices || tenantDevices.length === 0) return [];

        // Always filter internal nikaotec devices if needed, but be permissive for managers
        const filteredDevices = tenantDevices.filter(d => {
            if (!d) return false;
            // Managers see everything in 'All' tab, including unassigned devices
            if ((isManager || isAdmin) && currentTenant?.id === 'all') return true;

            if (!d.tenantId) return false;
            const t = String(d.tenantId).trim().toLowerCase();
            return t !== "" && t !== "null" && t !== "undefined";
        });

        // If in a specific tenant tab (not "all"), filter only by it
        if (currentTenant && currentTenant.id !== 'all') {
            return filteredDevices.filter(d =>
                String(d.tenantId).toLowerCase() === String(currentTenant.id).toLowerCase() ||
                String(d.tenantId).toLowerCase() === String(currentTenant.name).toLowerCase()
            );
        }

        // If manager and in "All" tab, show all filtered devices
        if (isManager || isAdmin) {
            return filteredDevices;
        }

        // Normal user: show only devices from linked/available tenants
        const allowedTenantIds = availableTenants.map(t => String(t.id).toLowerCase());
        const allowedTenantNames = availableTenants.map(t => String(t.name).toLowerCase());

        return filteredDevices.filter(d => {
            const dTenant = String(d.tenantId).toLowerCase();
            return allowedTenantIds.includes(dTenant) || allowedTenantNames.includes(dTenant);
        });
    }, [tenantDevices, currentTenant, availableTenants, isManager, isAdmin]);

    return {
        supabaseDevices,
        tenantDevices,
        displayDevices,
        mqttConnected,
        publish,
        updateDeviceLocal
    };
};
