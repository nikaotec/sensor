
import { useState, useEffect } from 'react';
import { tenantSettings as allSettings } from '../data/mockData';
import type { TenantSettings } from '../data/mockData';

export const useSettings = (tenantId: string) => {
    const [settings, setSettings] = useState<TenantSettings>(allSettings[tenantId] || allSettings['t1']);
    const [isDirty, setIsDirty] = useState(false);
    const [lastSaved, setLastSaved] = useState<string>('12/10/2023 - 14:45');

    useEffect(() => {
        setSettings(allSettings[tenantId] || allSettings['t1']);
        setIsDirty(false);
    }, [tenantId]);

    const updateMqtt = (field: keyof TenantSettings['mqtt'], value: string | boolean) => {
        setSettings(prev => ({
            ...prev,
            mqtt: { ...prev.mqtt, [field]: value }
        }));
        setIsDirty(true);
    };

    const updateThreshold = (field: keyof TenantSettings['thresholds'], value: number) => {
        setSettings(prev => ({
            ...prev,
            thresholds: { ...prev.thresholds, [field]: value }
        }));
        setIsDirty(true);
    };

    const toggleNotification = (field: keyof TenantSettings['notifications']) => {
        setSettings(prev => ({
            ...prev,
            notifications: { ...prev.notifications, [field]: !prev.notifications[field] }
        }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        setIsDirty(false);
        setLastSaved('Salvando...');

        try {
            // Webhook do n8n para enviar o comando via MQTT
            const response = await fetch('http://localhost:5678/webhook/iot-command-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_config',
                    tenantId,
                    settings
                })
            });

            if (!response.ok) throw new Error('Falha ao enviar comando');

            setLastSaved(new Date().toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }));
        } catch (error) {
            console.error('Erro ao salvar:', error);
            setLastSaved('Erro ao sincronizar');
            setIsDirty(true);
        }
    };

    const handleDiscard = () => {
        setSettings(allSettings[tenantId] || allSettings['t1']);
        setIsDirty(false);
    };

    return {
        settings,
        isDirty,
        lastSaved,
        updateMqtt,
        updateThreshold,
        toggleNotification,
        handleSave,
        handleDiscard
    };
};
