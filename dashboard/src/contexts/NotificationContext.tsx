import React, { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';

const SNOOZE_DURATION_MS = 2 * 60 * 1000; // 2 minutos

interface NotificationContextType {
    activeAlerts: any[];
    addAlert: (alert: any, onNew?: () => void) => void;
    clearAlert: (index: number) => void;
    hasAlerts: boolean;
    /** Silencia alertas de um dispositivo por 2 minutos */
    snoozeDevice: (deviceId: string) => void;
    /** Verifica se um dispositivo está em snooze */
    isDeviceSnoozed: (deviceId: string) => boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
    // Map de deviceId -> timestamp de expiração do snooze
    const snoozeMapRef = useRef<Map<string, number>>(new Map());

    const isDeviceSnoozed = useCallback((deviceId: string): boolean => {
        const expiry = snoozeMapRef.current.get(deviceId);
        if (!expiry) return false;
        if (Date.now() >= expiry) {
            snoozeMapRef.current.delete(deviceId);
            return false;
        }
        return true;
    }, []);

    const snoozeDevice = useCallback((deviceId: string) => {
        const expiry = Date.now() + SNOOZE_DURATION_MS;
        snoozeMapRef.current.set(deviceId, expiry);
        // Remove automaticamente o alerta ativo desse dispositivo do toast
        setActiveAlerts(prev => prev.filter(a => (a.ID_DISPOSITIVO || a.id) !== deviceId));
    }, []);

    const addAlert = useCallback((payload: any, onNew?: () => void) => {
        const deviceId = payload.ID_DISPOSITIVO || payload.id;
        // Não dispara se o dispositivo estiver em snooze
        if (deviceId && isDeviceSnoozed(deviceId)) return;

        setActiveAlerts(prev => {
            const isNew = !prev.some(a => a.TIPO === payload.TIPO && (a.ID_DISPOSITIVO || a.id) === deviceId);
            if (isNew) {
                if (onNew) {
                    setTimeout(onNew, 0);
                }
                return [{ ...payload, timestamp: new Date() }, ...prev].slice(0, 10);
            }
            return prev;
        });
    }, [isDeviceSnoozed]);

    const clearAlert = (index: number) => {
        setActiveAlerts(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <NotificationContext.Provider value={{ activeAlerts, addAlert, clearAlert, hasAlerts: activeAlerts.length > 0, snoozeDevice, isDeviceSnoozed }}>
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
