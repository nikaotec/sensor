import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useMqttData } from '../hooks/useMqttData';
import { supabase } from '../supabase/config';
import { ArrowLeft } from 'lucide-react';

// Sub-componentes
import DeviceHeader from './DeviceDetails/DeviceHeader';
import TelemetryGrid from './DeviceDetails/TelemetryGrid';
import DeviceConfigPanel from './DeviceDetails/DeviceConfigPanel';
import ActionControls from './DeviceDetails/ActionControls';
import SystemInfoPanel from './DeviceDetails/SystemInfoPanel';
import DeviceCharts from './DeviceDetails/DeviceCharts';
import DeviceEvents from './DeviceDetails/DeviceEvents';

// Utils
import { getEventColor, getEventIcon, formatEventTime } from '../utils/deviceUtils';

interface DeviceDetailsProps {
    deviceId: string;
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel' | 'admin-users') => void;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ deviceId, onNavigate }) => {
    const { currentTenant, availableTenants } = useTenant();
    const { currentUser } = useAuth();
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'gestor' || currentUser?.role === 'admin';

    const [remoteSync, setRemoteSync] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    const { devices: supabaseDevices, history, events } = useSupabaseData(currentTenant?.id || '', deviceId, currentUser?.role);
    const { devices: tenantDevices, isConnected, publish, updateDeviceLocal } = useMqttData({ id: 'all' }, currentUser?.role, supabaseDevices);

    const device = tenantDevices.find(d => d.id === deviceId);

    if (!currentTenant) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-white">Carregando dados...</div>;
    }

    // Handlers
    const handleAction = async (topicSuffix: string, payload: any, logMsg: string) => {
        if (!device) return;
        setIsUpdating(true);
        try {
            await publish(`${device.id}/${topicSuffix}`, {
                ...payload,
                user: currentUser?.email || 'sistema',
                userName: currentUser?.name || 'Sistema'
            });

            await supabase.from('device_events').insert([{
                device_id: device.id,
                type: 'maintenance',
                message: logMsg,
                user_email: currentUser?.email,
                user_name: currentUser?.name,
                tenant_id: currentTenant.id
            }]);
        } catch (err) {
            console.error('Erro ao executar ação:', err);
        } finally {
            setTimeout(() => setIsUpdating(false), 1000);
        }
    };

    const handleSaveLimits = async (limits: any) => {
        await handleAction('set_limits', {
            temp_max: parseFloat(limits.tempMax),
            temp_min: parseFloat(limits.tempMin),
            volt_max: parseFloat(limits.voltMax),
            volt_min: parseFloat(limits.voltMin),
            bat_min: parseFloat(limits.batMin),
            door_time: parseInt(limits.doorTime)
        }, 'Limites de alerta atualizados via dashboard');
    };

    const handleSaveHysteresis = async (tempOn: number, tempOff: number) => {
        await handleAction('set_hysteresis', {
            temp_on: tempOn,
            temp_off: tempOff
        }, `Histerese atualizada: ON ${tempOn}°C / OFF ${tempOff}°C`);
    };

    const handleToggleAlarm = async (action: string) => {
        await handleAction(action, {}, `Alarme ${action.replace('_', ' ')} via dashboard`);
    };

    const handleToggleRelay = async (action: string, id: number, port: number) => {
        await handleAction(action, { id, port }, `Relé ${id} (Porta ${port}) - Comandado para ${action.includes('ligar') ? 'LIGAR' : 'DESLIGAR'}`);
    };

    const handleCalibrate = (type: 'tensao' | 'bateria' | 'temperatura', value: number) => {
        const typeMap = { tensao: 'tensao', bateria: 'bateria', temperatura: 'temperatura' };
        handleAction('calibrate', { type: typeMap[type], value }, `Calibração de ${type}: valor real definido para ${value}`);
    };

    const handleSaveName = async (newName: string) => {
        if (!device || !newName.trim()) return;
        try {
            const { error } = await supabase
                .from('devices')
                .update({ name: newName.trim() })
                .eq('id', device.id);

            if (error) throw error;
            updateDeviceLocal(device.id, { name: newName.trim() });
        } catch (err) {
            console.error('Erro ao salvar nome:', err);
            throw err;
        }
    };

    return (
        <div className="flex h-screen bg-[#0A0D08] font-sans selection:bg-primary/30">
            <Sidebar activeItem="device-list" onNavigate={onNavigate} />

            <main className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4 lg:p-8 max-w-7xl mx-auto">
                    {/* Botão Voltar */}
                    <button
                        onClick={() => onNavigate('device-list')}
                        className="group mb-8 flex items-center gap-3 text-slate-500 hover:text-white transition-colors"
                    >
                        <div className="p-2 rounded-xl bg-[#1A1D17] border border-[#2A2E24] group-hover:border-primary/50 transition-all">
                            <ArrowLeft size={20} />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-widest">Painel Geral</span>
                    </button>

                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Header do Dispositivo */}
                        <DeviceHeader
                            device={device}
                            currentUser={currentUser}
                            onNavigate={onNavigate}
                            onUpdateName={handleSaveName}
                            availableTenants={availableTenants}
                        />

                        {/* Grid de Telemetria e Comandos */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <TelemetryGrid device={device} isManager={isManager} />

                                <DeviceCharts
                                    device={device}
                                    history={history}
                                    tempMin={device?.telemetry?.alarmMin?.toString() || ''}
                                    tempMax={device?.telemetry?.alarmMax?.toString() || ''}
                                />
                            </div>

                            <div className="space-y-8">
                                {/* Painel de Configuração */}
                                {isManager && (
                                    <DeviceConfigPanel
                                        device={device}
                                        isConnected={isConnected}
                                        isUpdating={isUpdating}
                                        onSaveHysteresis={handleSaveHysteresis}
                                        onSaveLimits={handleSaveLimits}
                                        onToggleAlarm={handleToggleAlarm}
                                        onCalibrate={handleCalibrate}
                                    />
                                )}

                                {/* Controles Adicionais */}
                                {isManager && (
                                    <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                                        <h3 className="text-xs font-medium text-slate-400 uppercase mb-5 tracking-wider font-heading">Ações Adicionais</h3>
                                        <ActionControls
                                            device={device}
                                            isConnected={isConnected}
                                            isUpdating={isUpdating}
                                            onToggleRelay={handleToggleRelay}
                                            onAction={handleAction}
                                        />
                                    </div>
                                )}

                                {/* Informações do Sistema */}
                                {isManager && (
                                    <SystemInfoPanel
                                        device={device}
                                        remoteSync={remoteSync}
                                        onToggleSync={() => setRemoteSync(!remoteSync)}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Eventos Recentes */}
                        <DeviceEvents
                            events={events}
                            getEventColor={getEventColor}
                            getEventIcon={getEventIcon}
                            formatEventTime={formatEventTime}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DeviceDetails;
