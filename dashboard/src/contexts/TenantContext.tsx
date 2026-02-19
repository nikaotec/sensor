
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { tenants, users } from '../data/mockData';
import type { Tenant, User } from '../data/mockData';

interface TenantContextType {
    currentTenant: Tenant;
    currentUser: User;
    setTenantId: (id: string) => void;
    availableTenants: Tenant[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Default to first tenant and user for initial load
const defaultTenant = tenants[0];
const defaultUser = users[0];

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentTenantId, setCurrentTenantId] = useState<string>(defaultTenant.id);
    const [currentTenant, setCurrentTenant] = useState<Tenant>(defaultTenant);
    const [currentUser, setCurrentUser] = useState<User>(defaultUser);

    useEffect(() => {
        const foundTenant = tenants.find(t => t.id === currentTenantId) || defaultTenant;
        setCurrentTenant(foundTenant);

        // Simulating user switch based on tenant for demo purposes
        // In real app, user would belong to one or more tenants
        const foundUser = users.find(u => u.tenantId === currentTenantId) || users[0];
        setCurrentUser(foundUser);

        // Update CSS variables for dynamic theming (optional but cool)
        if (foundTenant.colors?.primary) {
            document.documentElement.style.setProperty('--color-primary', foundTenant.colors.primary);
        }

    }, [currentTenantId]);

    const setTenantId = (id: string) => {
        if (tenants.some(t => t.id === id)) {
            setCurrentTenantId(id);
        }
    };

    return (
        <TenantContext.Provider value={{ currentTenant, currentUser, setTenantId, availableTenants: tenants }}>
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
