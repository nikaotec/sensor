
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

        const fetchTenants = async () => {
            try {
                let data: any[] | null = null;
                let error: any = null;

                if (userRole === 'manager') {
                    // Manager vê todas as empresas
                    const result = await supabase.from('tenants').select('*');
                    data = result.data;
                    error = result.error;
                } else if (userTenants && userTenants.length > 0) {
                    // Usuários normais ou admin: apenas seus tenants
                    const result = await supabase
                        .from('tenants')
                        .select('*')
                        .in('id', userTenants);
                    data = result.data;
                    error = result.error;
                } else {
                    setAvailableTenants([]);
                    if (!currentTenantId) setCurrentTenantId('all');
                    setLoadingTenants(false);
                    return;
                }

                if (error) {
                    console.error("Supabase Tenants Error:", error);
                    // Se der erro, tenta usar dados em memória ou continua com array vazio
                    setAvailableTenants([]);
                    setLoadingTenants(false);
                    return;
                }

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
                console.error("Supabase error fetching tenants:", e.message);
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
