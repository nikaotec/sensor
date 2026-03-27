import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface NotificationContextType {
    activeAlerts: any[];
    addAlert: (alert: any) => void;
    clearAlert: (index: number) => void;
    hasAlerts: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeAlerts, setActiveAlerts] = useState<any[]>([]);

    const addAlert = (alert: any) => {
        setActiveAlerts(prev => {
            const isNew = !prev.some(a => a.TIPO === alert.TIPO && a.ID_DISPOSITIVO === alert.ID_DISPOSITIVO);
            if (isNew) {
                return [{ ...alert, timestamp: new Date() }, ...prev];
            }
            return prev;
        });
    };

    const clearAlert = (index: number) => {
        setActiveAlerts(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <NotificationContext.Provider value={{ activeAlerts, addAlert, clearAlert, hasAlerts: activeAlerts.length > 0 }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
