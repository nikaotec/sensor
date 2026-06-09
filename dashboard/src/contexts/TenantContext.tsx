
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Tenant } from '../data/mockData';
import { useAuth } from './AuthContext';
import { supabase } from '../supabase/config';

interface TenantContextType {
    currentTenant: Tenant | null;
    setTenantId: (id: string) => void;
    availableTenants: Tenant[];
    loadingTenants: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser, loading: authLoading } = useAuth();
    const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
    const [loadingTenants, setLoadingTenants] = useState(true);

    // Fetch user tenants based on their tenantIds in real-time
    useEffect(() => {
        if (authLoading) return;

        if (!currentUser) {
            setAvailableTenants([]);
            setCurrentTenant(null);
            setLoadingTenants(false);
            return;
        }

        setLoadingTenants(true);

        const userRole = currentUser?.role || 'admin';
        const userTenants = currentUser?.tenantIds || [];

        const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nikaotech.com/api';

        const fetchTenants = async () => {
            try {
                let data: any[] | null = null;
                let url = `${API_BASE_URL}/tenants`;

                if (userRole !== 'manager' && userTenants && userTenants.length > 0) {
                    const params = new URLSearchParams();
                    userTenants.forEach((id: string) => params.append('ids', id));
                    url += `?${params.toString()}`;
                } else if (userRole !== 'manager') {
                    setAvailableTenants([]);
                    if (!currentTenantId) setCurrentTenantId('all');
                    setLoadingTenants(false);
                    return;
                }

                const response = await fetch(url);
                if (!response.ok) throw new Error('Falha ao carregar empresas da API REST');
                data = await response.json();

                const fetchedTenants: Tenant[] = (data || []).map((row: any) => ({
                    id: row.id,
                    name: row.name,
                    status: row.status || 'active',
                    plan: row.plan || 'pro',
                    colors: row.colors || {},
                    ...row
                })) as Tenant[];

                setAvailableTenants(fetchedTenants);
                if (fetchedTenants.length > 0 && !currentTenantId) {
                    setCurrentTenantId('all');
                } else if (!currentTenantId) {
                    setCurrentTenantId('all');
                }
                setLoadingTenants(false);
            } catch (e: any) {
                console.error("API Error fetching tenants:", e.message);
                setAvailableTenants([]);
                setLoadingTenants(false);
            }
        };

        fetchTenants();

        // Realtime subscription para tenants
        const channel = supabase
            .channel('tenants_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tenants' },
                () => {
                    fetchTenants();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, authLoading]);

    // Update active tenant object and theme when ID changes
    useEffect(() => {
        if (!currentTenantId) return;

        if (currentTenantId === 'all') {
            setCurrentTenant({
                id: 'all',
                name: 'Todas as Empresas',
                status: 'active',
                plan: 'pro'
            } as Tenant);
            document.documentElement.style.setProperty('--color-primary', '#38bdf8'); // default sky
        } else if (availableTenants.length === 0) {
            setCurrentTenant({
                id: 'none',
                name: 'Sem Empresa Vinculada',
                status: 'active',
                plan: 'pro'
            } as Tenant);
        } else {
            const found = availableTenants.find(t => t.id === currentTenantId) || availableTenants[0];
            setCurrentTenant(found);

            if (found?.colors?.primary) {
                document.documentElement.style.setProperty('--color-primary', found.colors.primary);
            }
        }
    }, [currentTenantId, availableTenants]);

    const setTenantId = (id: string) => {
        if (id === 'all' || availableTenants.some(t => t.id === id)) {
            setCurrentTenantId(id);
        }
    };

    return (
        <TenantContext.Provider value={{ currentTenant, setTenantId, availableTenants, loadingTenants }}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};
