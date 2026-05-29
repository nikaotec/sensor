import React, { createContext, useContext, useState, useRef, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

const SNOOZE_DURATION_MS = 2 * 60 * 1000; // 2 minutos

export interface UserAlarmMuteSettings {
    muteTemp: boolean;
    muteVolt: boolean;
    muteBat: boolean;
    muteDoor: boolean;
    muteOffline: boolean;
}

interface NotificationContextType {
    activeAlerts: any[];
    addAlert: (alert: any, onNew?: () => void) => void;
    clearAlert: (index: number) => void;
    hasAlerts: boolean;
    snoozeDevice: (deviceId: string) => void;
    isDeviceSnoozed: (deviceId: string) => boolean;
    // Novos métodos de silenciamento local do usuário logado
    getUserMuteSettings: (deviceId: string) => UserAlarmMuteSettings;
    saveUserMuteSettings: (deviceId: string, settings: UserAlarmMuteSettings) => void;
    isAlertMutedByUser: (deviceId: string, alertType: string) => boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
    const { currentUser } = useAuth();
    
    // Map de deviceId -> timestamp de expiração do snooze
    const snoozeMapRef = useRef<Map<string, number>>(new Map());
    
    // Estado local para re-renderizar componentes ao alterar silenciamentos
    const [muteUpdateTrigger, setMuteUpdateTrigger] = useState(0);

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
        setActiveAlerts(prev => prev.filter(a => (a.ID_DISPOSITIVO || a.id) !== deviceId));
    }, []);

    // Carrega configurações de silenciamento do localStorage específicas para o usuário logado
    const getUserMuteSettings = useCallback((deviceId: string): UserAlarmMuteSettings => {
        if (!currentUser) {
            return { muteTemp: false, muteVolt: false, muteBat: false, muteDoor: false, muteOffline: false };
        }
        const storageKey = `user_mute_settings_${currentUser.id}_${deviceId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Erro ao analisar configurações de silenciamento:", e);
            }
        }
        return { muteTemp: false, muteVolt: false, muteBat: false, muteDoor: false, muteOffline: false };
    }, [currentUser, muteUpdateTrigger]);

    // Salva configurações de silenciamento do localStorage específicas para o usuário logado
    const saveUserMuteSettings = useCallback((deviceId: string, settings: UserAlarmMuteSettings) => {
        if (!currentUser) return;
        const storageKey = `user_mute_settings_${currentUser.id}_${deviceId}`;
        localStorage.setItem(storageKey, JSON.stringify(settings));
        setMuteUpdateTrigger(prev => prev + 1);
    }, [currentUser]);

    // Helper para verificar se um tipo específico de alerta está silenciado pelo usuário
    const isAlertMutedByUser = useCallback((deviceId: string, alertType: string): boolean => {
        const settings = getUserMuteSettings(deviceId);
        const type = alertType.toUpperCase();
        
        if (type.includes('TEMP')) return settings.muteTemp;
        if (type.includes('TENSAO') || type.includes('ENERGIA') || type.includes('OUTAGE')) return settings.muteVolt;
        if (type.includes('BAT')) return settings.muteBat;
        if (type.includes('PORTA') || type.includes('DOOR')) return settings.muteDoor;
        if (type.includes('OFFLINE')) return settings.muteOffline;
        
        return false;
    }, [getUserMuteSettings]);

    const addAlert = useCallback((payload: any, onNew?: () => void) => {
        const deviceId = payload.ID_DISPOSITIVO || payload.id;
        
        // 1. Não dispara se o dispositivo estiver em snooze de 2 min geral
        if (deviceId && isDeviceSnoozed(deviceId)) return;

        // 2. Não dispara o alerta se o usuário tiver silenciado localmente este tipo de alarme
        if (deviceId && payload.TIPO && isAlertMutedByUser(deviceId, payload.TIPO)) {
            console.log(`[SILENCIADO LOCALMENTE] Alerta ${payload.TIPO} silenciado por preferências do usuário.`);
            return;
        }

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
    }, [isDeviceSnoozed, isAlertMutedByUser]);

    const clearAlert = (index: number) => {
        setActiveAlerts(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <NotificationContext.Provider value={{ 
            activeAlerts, 
            addAlert, 
            clearAlert, 
            hasAlerts: activeAlerts.length > 0, 
            snoozeDevice, 
            isDeviceSnoozed,
            getUserMuteSettings,
            saveUserMuteSettings,
            isAlertMutedByUser
        }}>
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
