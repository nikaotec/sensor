import React, { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
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
    // Métodos de silenciamento local do usuário logado
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

    // Ref para o currentUser — garante que o addAlert sempre veja o usuário atual
    // mesmo que a closure tenha sido capturada antes do login
    const currentUserRef = useRef(currentUser);
    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

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

    // Lê diretamente do localStorage sem depender de estado React,
    // garantindo que sempre retorna o valor mais recente mesmo em closures antigas.
    const getUserMuteSettings = useCallback((deviceId: string): UserAlarmMuteSettings => {
        const user = currentUserRef.current;
        if (!user) {
            return { muteTemp: false, muteVolt: false, muteBat: false, muteDoor: false, muteOffline: false };
        }
        const storageKey = `user_mute_settings_${user.id}_${deviceId}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Erro ao analisar configurações de silenciamento:", e);
            }
        }
        return { muteTemp: false, muteVolt: false, muteBat: false, muteDoor: false, muteOffline: false };
    }, []); // Sem dependências: lê sempre do localStorage e do ref atualizado

    // Salva no localStorage e força re-render dos componentes que exibem o estado do mute
    const [muteUpdateTrigger, setMuteUpdateTrigger] = useState(0);
    const saveUserMuteSettings = useCallback((deviceId: string, settings: UserAlarmMuteSettings) => {
        const user = currentUserRef.current;
        if (!user) return;
        const storageKey = `user_mute_settings_${user.id}_${deviceId}`;
        localStorage.setItem(storageKey, JSON.stringify(settings));
        
        // Limpar alertas ativos que acabaram de ser silenciados
        setActiveAlerts(prev => prev.filter(alert => {
            if ((alert.ID_DISPOSITIVO || alert.id) !== deviceId) return true;
            
            const type = (alert.TIPO || '').toUpperCase();
            if (settings.muteTemp && type.includes('TEMP')) return false;
            if (settings.muteVolt && (type.includes('TENSAO') || type.includes('ENERGIA') || type.includes('OUTAGE') || type.includes('FALTA'))) return false;
            if (settings.muteBat && type.includes('BAT')) return false;
            if (settings.muteDoor && (type.includes('PORTA') || type.includes('DOOR'))) return false;
            if (settings.muteOffline && type.includes('OFFLINE')) return false;
            
            return true;
        }));

        // Força re-render apenas dos componentes de UI
        setMuteUpdateTrigger(prev => prev + 1);
    }, []);

    // Helper para verificar se um tipo específico de alerta está silenciado pelo usuário.
    // Lê direto do localStorage via getUserMuteSettings (que usa ref, não closure).
    const isAlertMutedByUser = useCallback((deviceId: string, alertType: string): boolean => {
        const settings = getUserMuteSettings(deviceId);
        const type = alertType.toUpperCase();

        if (type.includes('TEMP')) return settings.muteTemp;
        if (type.includes('TENSAO') || type.includes('ENERGIA') || type.includes('OUTAGE') || type.includes('FALTA')) return settings.muteVolt;
        if (type.includes('BAT')) return settings.muteBat;
        if (type.includes('PORTA') || type.includes('DOOR')) return settings.muteDoor;
        if (type.includes('OFFLINE')) return settings.muteOffline;

        return false;
    }, [getUserMuteSettings]); // getUserMuteSettings é estável (sem deps), então este também é

    // addAlert é estável: isDeviceSnoozed e isAlertMutedByUser são estáveis,
    // portanto o hook useMqttData sempre terá a função correta capturada,
    // e as verificações internas sempre leem o estado mais recente.
    const addAlert = useCallback((payload: any, onNew?: () => void) => {
        const deviceId = payload.ID_DISPOSITIVO || payload.id;

        // 1. Não dispara se o dispositivo estiver em snooze de 2 min geral
        if (deviceId && isDeviceSnoozed(deviceId)) return;

        // 2. Não dispara som nem popup se o usuário tiver silenciado localmente este tipo de alarme.
        //    Lê do localStorage em tempo real (via ref), não de closure capturada.
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

    // muteUpdateTrigger é usado apenas para forçar re-render dos componentes de UI
    // que exibem o estado visual dos toggles. Não afeta a lógica do addAlert.
    void muteUpdateTrigger;

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
