
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Tenant } from '../data/mockData';
import { useAuth } from './AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, documentId, onSnapshot } from 'firebase/firestore';

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
        let unsubscribe: () => void = () => { };

        try {
            if (currentUser.role === 'manager') {
                // Manager vê todas as empresas em tempo real
                unsubscribe = onSnapshot(collection(db, 'tenants'), (snapshot) => {
                    const fetchedTenants: Tenant[] = [];
                    snapshot.forEach((doc) => {
                        fetchedTenants.push({ id: doc.id, ...doc.data() } as Tenant);
                    });
                    setAvailableTenants(fetchedTenants);
                    if (!currentTenantId) setCurrentTenantId('all');
                    setLoadingTenants(false);
                }, (error) => {
                    console.error("Firestore Manager Tenants Listener Error:", error);
                    setAvailableTenants([]);
                    setLoadingTenants(false);
                });
            } else if (currentUser.tenantIds && currentUser.tenantIds.length > 0) {
                // Usuários normais ou admin escutam apenas seus ids
                const q = query(collection(db, 'tenants'), where(documentId(), 'in', currentUser.tenantIds));
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const fetchedTenants: Tenant[] = [];
                    snapshot.forEach((doc) => {
                        fetchedTenants.push({ id: doc.id, ...doc.data() } as Tenant);
                    });
                    setAvailableTenants(fetchedTenants);
                    if (fetchedTenants.length > 0 && !currentTenantId) {
                        setCurrentTenantId('all');
                    }
                    setLoadingTenants(false);
                }, (error) => {
                    console.error("Firestore Tenant Listener Error:", error);
                    setAvailableTenants([]);
                    setLoadingTenants(false);
                });
            } else {
                setAvailableTenants([]);
                if (!currentTenantId) setCurrentTenantId('all');
                setLoadingTenants(false);
            }
        } catch (e: any) {
            console.error("Firebase Firestore error setup listeners:", e.message);
            setAvailableTenants([]);
            setLoadingTenants(false);
        }

        return () => unsubscribe();
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
