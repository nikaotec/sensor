import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useMqttData } from '../hooks/useMqttData';
import { supabase } from '../supabase/config';
import { Wifi, Settings as SettingsIcon, RefreshCw } from 'lucide-react';

// Sub-componentes modularizados
import DeviceHeader from './device/DeviceHeader';
import DeviceTelemetryCard from './device/DeviceTelemetryCard';
import HysteresisControl from './device/HysteresisControl';
import AlarmSettings from './device/AlarmSettings';
import SensorAlarmToggles from './device/SensorAlarmToggles';
import UserAlarmMuteControl from './device/UserAlarmMuteControl';
import CalibrationControl from './device/CalibrationControl';
import RelayControl from './device/RelayControl';
import DeviceHistoryChart from './device/DeviceHistoryChart';
import RecentEvents from './device/RecentEvents';

interface DeviceDetailsProps {
    deviceId: string;
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel' | 'admin-users' | 'ota-panel') => void;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ deviceId, onNavigate }) => {
    const { currentTenant, availableTenants } = useTenant();
    const { currentUser } = useAuth();

    // Todos os hooks devem ser chamados incondicionalmente no topo
    const [remoteSync, setRemoteSync] = useState(true);
    const { devices: supabaseDevices, history, events } = useSupabaseData(currentTenant?.id || '', deviceId, currentUser?.role);
    const { devices: tenantDevices, isConnected, publish, updateDeviceLocal, mqttClient } = useMqttData('all', currentUser?.role, supabaseDevices);

    // Estados locais para controle remoto
    const [tempMinInput, setTempMinInput] = useState<string>('');
    const [tempMaxInput, setTempMaxInput] = useState<string>('');
    const [voltMinInput, setVoltMinInput] = useState<string>('');
    const [voltMaxInput, setVoltMaxInput] = useState<string>('');
    const [batMinInput, setBatMinInput] = useState<string>('');
    const [doorTimeInput, setDoorTimeInput] = useState<string>('');
    const [voltReturnDelayInput, setVoltReturnDelayInput] = useState<string>('');

    // Estados para histerese do relé 0
    const [hysteresisOnInput, setHysteresisOnInput] = useState<string>('');
    const [hysteresisOffInput, setHysteresisOffInput] = useState<string>('');

    const [isUpdating, setIsUpdating] = useState(false);

    // Estados para controle de alarmes por sensor (CHK_*)
    const [chkVolt, setChkVolt] = useState<boolean>(true);
    const [chkBat, setChkBat] = useState<boolean>(true);
    const [chkTemp, setChkTemp] = useState<boolean>(true);
    const [chkDoor, setChkDoor] = useState<boolean>(true);

    // Estados para calibração
    const [voltCalibration, setVoltCalibration] = useState<string>('');
    const [batCalibration, setBatCalibration] = useState<string>('');
    const [tempCalibration, setTempCalibration] = useState<string>('');
    const [selectedTempSensor, setSelectedTempSensor] = useState<'DS18B20' | 'PT100'>('DS18B20');

    // Estados para edição de nome
    const [isEditingName, setIsEditingName] = useState(false);
    const [newDeviceName, setNewDeviceName] = useState('');
    const [isChangingName, setIsChangingName] = useState(false);
    const [wifiResetting, setWifiResetting] = useState(false);

    const device = tenantDevices.find(d => d.id === deviceId);

    // Estado para silenciar alertas de offline (Supabase alerts_paused)
    const [isOfflinePaused, setIsOfflinePaused] = useState<boolean>((device as any)?.alerts_paused || false);

    useEffect(() => {
        setIsOfflinePaused((device as any)?.alerts_paused || false);
    }, [(device as any)?.alerts_paused, deviceId]);

    const handleToggleOfflinePause = async () => {
        if (!device) return;
        const newValue = !isOfflinePaused;
        setIsOfflinePaused(newValue); // Optimistic UI update

        try {
            const { error } = await supabase
                .from('devices_status')
                .update({ alerts_paused: newValue })
                .eq('id', device.id);

            if (error) throw error;

            if (updateDeviceLocal) {
                updateDeviceLocal(device.id, { alerts_paused: newValue } as any);
            }
        } catch (err) {
            console.error("Erro ao pausar alertas de offline:", err);
            setIsOfflinePaused(!newValue); // Revert on failure
        }
    };

    // Sincronizar inputs com dados do dispositivo
    useEffect(() => {
        if (device?.telemetry) {
            if (remoteSync) {
                if (device.telemetry.alarmMax !== undefined) setTempMaxInput(device.telemetry.alarmMax.toString());
                if (device.telemetry.alarmMin !== undefined) setTempMinInput(device.telemetry.alarmMin.toString());
                if (device.telemetry.voltMaxLimit !== undefined) setVoltMaxInput(device.telemetry.voltMaxLimit.toString());
                if (device.telemetry.voltMinLimit !== undefined) setVoltMinInput(device.telemetry.voltMinLimit.toString());
                if (device.telemetry.batMinLimit !== undefined) setBatMinInput(device.telemetry.batMinLimit.toString());
                if (device.telemetry.doorMaxTime !== undefined) setDoorTimeInput(device.telemetry.doorMaxTime.toString());
                if (device.telemetry.voltReturnDelay !== undefined) setVoltReturnDelayInput(device.telemetry.voltReturnDelay.toString());

                if (device.telemetry.R0_TEMP_ON !== undefined && device.telemetry.R0_TEMP_ON !== 0) {
                    setHysteresisOnInput(device.telemetry.R0_TEMP_ON.toString());
                }
                if (device.telemetry.R0_TEMP_OFF !== undefined && device.telemetry.R0_TEMP_OFF !== 0) {
                    setHysteresisOffInput(device.telemetry.R0_TEMP_OFF.toString());
                }
            }
            if (device.telemetry.chkVolt !== undefined) setChkVolt(device.telemetry.chkVolt);
            if (device.telemetry.chkBat !== undefined) setChkBat(device.telemetry.chkBat);
            if (device.telemetry.chkTemp !== undefined) setChkTemp(device.telemetry.chkTemp);
            if (device.telemetry.chkDoor !== undefined) setChkDoor(device.telemetry.chkDoor);
        }
    }, [device?.telemetry, remoteSync]);

    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'gestor';
    const isAdmin = currentUser?.role === 'admin';
    const canAccessControlPanel = isManager || isAdmin;

    if (!currentTenant) return <div className="flex h-screen items-center justify-center bg-background-dark text-white">Carregando dados...</div>;


    if (!device) {
        return (
            <div className="flex h-screen overflow-hidden bg-background-dark text-slate-100 font-display">
                <Sidebar activeItem="device-list" onNavigate={onNavigate} />
                <main className="flex-1 flex flex-col items-center justify-center p-8 bg-background-dark text-center">
                    <div className="bg-[#1A1D17] border border-[#2A2E24] p-10 rounded-3xl max-w-md shadow-2xl">
                        <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 mx-auto animate-pulse">
                            <Wifi size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Localizando Dispositivo</h2>
                        <p className="text-slate-400 mb-8">Aguardando dados de telemetria e conexão com o broker MQTT...</p>
                        <button onClick={() => onNavigate('dashboard')} className="px-6 py-3 bg-[#0F110D] border border-[#2A2E24] rounded-xl text-xs font-bold text-white uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-colors">
                            Voltar ao Painel
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    // Handlers de Ações
    const handleAction = async (action: string, extraPayload: any = {}, logMsg: string) => {
        if (!device || !publish || isUpdating) return;
        setIsUpdating(true);
        const isAdmin = currentUser?.role === 'gestor' || currentUser?.role === 'manager' || currentUser?.role === 'admin';

        const payload = {
            intencao: action,
            id: device.id,
            dispositivo_id: device.id,
            is_admin: isAdmin,
            source: 'dashboard',
            user: {
                name: currentUser?.name || 'Usuário Dashboard',
                email: currentUser?.email || ''
            },
            ...extraPayload
        };

        try {
            publish('esp32c3/status/action', JSON.stringify(payload));
            const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const tenant_id = device.tenantId && isValidUUID(device.tenantId) ? device.tenantId : null;

            // Se for silenciar/reativar alarme geral, também afeta os alertas offline
            if (action === 'silenciar_alarme' || action === 'reativar_alarme') {
                const newValue = action === 'silenciar_alarme';
                setIsOfflinePaused(newValue); // Optimistic UI
                
                await supabase
                    .from('devices_status')
                    .update({ alerts_paused: newValue })
                    .eq('id', device.id);

                if (updateDeviceLocal) {
                    updateDeviceLocal(device.id, { alerts_paused: newValue } as any);
                }
            }

            await supabase.from('events').insert({
                device_id: device.id,
                tenant_id,
                type: 'DASHBOARD_COMMAND',
                msg: logMsg,
                user_name: currentUser?.name || 'Usuário Dashboard',
                user_email: currentUser?.email || '',
                timestamp: new Date().toISOString(),
                source: 'dashboard'
            });
        } catch (error) {
            console.error(`❌ Erro comando ${action}:`, error);
        } finally {
            setTimeout(() => setIsUpdating(false), 1000);
        }
    };

    const handleChangeDeviceName = async () => {
        if (!device || !publish || !newDeviceName.trim()) return;
        const nameToSet = newDeviceName.trim().substring(0, 31);
        setIsChangingName(true);
        try {
            const { error } = await supabase.from('devices_status').update({ name: nameToSet, updated_at: new Date().toISOString() }).eq('id', device.id);
            if (error) throw error;
            publish('esp32c3/status/action', JSON.stringify({
                intencao: 'alterar_nome',
                novo_nome: nameToSet,
                dispositivo_id: device.id,
                id: device.id,
                is_admin: true,
                source: 'dashboard'
            }));
            if (updateDeviceLocal) updateDeviceLocal(device.id, { name: nameToSet });
            setIsEditingName(false);
        } catch (error: any) {
            console.error('Erro ao mudar nome:', error);
            alert(`Erro ao mudar nome: ${error.message}`);
        } finally {
            setTimeout(() => setIsChangingName(false), 500);
        }
    };

    const handleSaveHysteresis = () => {
        if (!hysteresisOnInput || !hysteresisOffInput) return;
        const tempOn = parseFloat(hysteresisOnInput);
        const tempOff = parseFloat(hysteresisOffInput);

        // Atualiza immediately no estado local para feedback visual
        setHysteresisOnInput(hysteresisOnInput);
        setHysteresisOffInput(hysteresisOffInput);

        handleAction('configurar_rele', {
            rele_index: 0,
            temp_on: tempOn,
            temp_off: tempOff,
            funcao: 1 // Força modo AUTOMÁTICO
        }, `Histerese configurada: Ligar > ${hysteresisOnInput}°C, Desligar < ${hysteresisOffInput}°C`);
    };

    const handleSaveLimits = () => {
        handleAction('configurar_limites', {
            temp_max: tempMaxInput !== '' ? parseFloat(tempMaxInput) : undefined,
            temp_min: tempMinInput !== '' ? parseFloat(tempMinInput) : undefined,
            volt_max: voltMaxInput !== '' ? parseFloat(voltMaxInput) : undefined,
            volt_min: voltMinInput !== '' ? parseFloat(voltMinInput) : undefined,
            bat_min: batMinInput !== '' ? parseFloat(batMinInput) : undefined,
            tempo_porta: doorTimeInput !== '' ? parseInt(doorTimeInput) : undefined,
            volt_return_delay: voltReturnDelayInput !== '' ? parseInt(voltReturnDelayInput) : undefined,
        }, `Limites atualizados`);
    };

    const handleToggleRelay = (action: 'ligar_rele' | 'desligar_rele', index?: number, port?: number) => {
        if (device && updateDeviceLocal && index !== undefined) {
            const isLigando = action === 'ligar_rele';
            updateDeviceLocal(device.id, {
                telemetry: { ...device.telemetry, [`rele${index}`]: isLigando, ...(index === 0 ? { rele: isLigando } : {}) }
            } as any);
        }
        handleAction(action, index !== undefined ? { rele_index: index, porta: port } : {}, `${action} rele ${index}`);
    };

    const handleToggleAlarm = (sensor: 'habilitar_tensao' | 'desabilitar_tensao' | 'habilitar_bateria' | 'desabilitar_bateria' | 'habilitar_temperatura' | 'desabilitar_temperatura' | 'habilitar_porta' | 'desabilitar_porta') => {
        const isEnabling = sensor.startsWith('habilitar');
        if (sensor.includes('tensao')) setChkVolt(isEnabling);
        else if (sensor.includes('bateria')) setChkBat(isEnabling);
        else if (sensor.includes('temperatura')) setChkTemp(isEnabling);
        else if (sensor.includes('porta')) setChkDoor(isEnabling);
        handleAction(sensor, {}, `Alarme alterado via dashboard`);
    };

    const handleCalibration = (type: 'tensao' | 'bateria' | 'temperatura') => {
        const val = type === 'tensao' ? voltCalibration : type === 'bateria' ? batCalibration : tempCalibration;
        if (!val || isNaN(parseFloat(val))) return;
        const intent = type === 'temperatura' ? 'calibrar_temperatura' : type === 'tensao' ? 'calibrar_tensao' : 'calibrar_bateria';
        const payloadKey = type === 'temperatura' ? 'nova_temperatura' : 'nova_tensao';

        const extraPayload: any = { [payloadKey]: parseFloat(val) };
        if (type === 'temperatura') {
            extraPayload.sensor_tipo = selectedTempSensor;
        }

        handleAction(intent, extraPayload, `Calibração de ${type} (${type === 'temperatura' ? selectedTempSensor : 'Principal'})`);

        if (type === 'tensao') setVoltCalibration('');
        else if (type === 'bateria') setBatCalibration('');
        else setTempCalibration('');
    };

    const handleWifiReset = () => {
        if (!device || !mqttClient || wifiResetting) return;
        setWifiResetting(true);
        const cmdPayload = JSON.stringify({ intent: "reset_wifi", is_admin: true });
        const cmdTopic = `devices/${device.id}/cmd`;
        mqttClient.publish(cmdTopic, cmdPayload);
        setTimeout(() => setWifiResetting(false), 5000);
    };

    const handleSensorChange = (type: 'DS18B20' | 'PT100') => {
        setSelectedTempSensor(type);
        handleAction('set_sensor_type', { sensor_type: type }, `Tipo de sensor alterado para ${type}`);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-dark text-slate-100 font-display">
            <Sidebar activeItem="device-list" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative bg-background-dark">
                <DeviceHeader
                    device={device}
                    currentUser={currentUser as any}
                    isEditingName={isEditingName}
                    setIsEditingName={setIsEditingName}
                    newDeviceName={newDeviceName}
                    setNewDeviceName={setNewDeviceName}
                    handleChangeDeviceName={handleChangeDeviceName}
                    isChangingName={isChangingName}
                    onNavigate={onNavigate}
                    availableTenants={availableTenants}
                />

                <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-10 py-6 pb-24 sm:pb-6 custom-scrollbar 2xl:max-w-[1600px] 2xl:mx-auto w-full">
                    <div className="flex flex-col gap-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Coluna 1: Telemetria */}
                            <DeviceTelemetryCard
                                device={device as any}
                                isManager={isManager}
                                userRole={currentUser?.role}
                                handleAction={handleAction}
                                isUpdating={isUpdating}
                                isConnected={isConnected}
                            />

                            {/* Coluna 2: Controle (Gestores vêm tudo; Admin vê apenas temperatura) */}
                            {canAccessControlPanel && (
                                <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                        <SettingsIcon size={40} className="text-primary rotate-12" />
                                    </div>
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider font-heading flex items-center gap-2">
                                            <RefreshCw size={14} className={isUpdating ? 'animate-spin' : ''} />
                                            Painel de Controle
                                            {isAdmin && (
                                                <span className="text-[8px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                                    Restrito
                                                </span>
                                            )}
                                        </h3>
                                    </div>
                                    <div className="space-y-4 max-h-[510px] overflow-y-auto pr-1 custom-scrollbar">
                                        {/* Histerese e Calibração: apenas para gestores */}
                                        {isManager && (
                                            <HysteresisControl
                                                hysteresisOnInput={hysteresisOnInput}
                                                setHysteresisOnInput={setHysteresisOnInput}
                                                hysteresisOffInput={hysteresisOffInput}
                                                setHysteresisOffInput={setHysteresisOffInput}
                                                handleSaveHysteresis={handleSaveHysteresis}
                                                isUpdating={isUpdating}
                                                isConnected={isConnected}
                                                setRemoteSync={setRemoteSync}
                                            />
                                        )}
                                        {/* Limites de Alarme: admin vê apenas temperatura */}
                                        <AlarmSettings
                                            tempMinInput={tempMinInput} setTempMinInput={setTempMinInput}
                                            tempMaxInput={tempMaxInput} setTempMaxInput={setTempMaxInput}
                                            voltMinInput={voltMinInput} setVoltMinInput={setVoltMinInput}
                                            voltMaxInput={voltMaxInput} setVoltMaxInput={setVoltMaxInput}
                                            batMinInput={batMinInput} setBatMinInput={setBatMinInput}
                                            doorTimeInput={doorTimeInput} setDoorTimeInput={setDoorTimeInput}
                                            voltReturnDelayInput={voltReturnDelayInput} setVoltReturnDelayInput={setVoltReturnDelayInput}
                                            setRemoteSync={setRemoteSync}
                                            handleSaveLimits={handleSaveLimits}
                                            isUpdating={isUpdating}
                                            isConnected={isConnected}
                                            userRole={currentUser?.role}
                                        />
                                        {/* Toggles de sensores: apenas para gestores */}
                                        {isManager && (
                                            <SensorAlarmToggles
                                                chkVolt={chkVolt} chkBat={chkBat} chkTemp={chkTemp} chkDoor={chkDoor}
                                                isOfflinePaused={isOfflinePaused}
                                                onToggleOfflinePause={handleToggleOfflinePause}
                                                handleToggleAlarm={handleToggleAlarm}
                                                isUpdating={isUpdating}
                                                isConnected={isConnected}
                                            />
                                        )}

                                        {/* Painel de Silenciamento Local de Alarmes: visível para gestores e admins */}
                                        {canAccessControlPanel && (
                                            <UserAlarmMuteControl deviceId={device.id} />
                                        )}

                                        {/* Calibração e Relés: apenas para gestores */}
                                        {isManager && (
                                            <>
                                                <CalibrationControl
                                                    voltCalibration={voltCalibration} setVoltCalibration={setVoltCalibration}
                                                    batCalibration={batCalibration} setBatCalibration={setBatCalibration}
                                                    tempCalibration={tempCalibration} setTempCalibration={setTempCalibration}
                                                    handleCalibration={handleCalibration}
                                                    isUpdating={isUpdating}
                                                    isConnected={isConnected}
                                                    tempSensor={selectedTempSensor}
                                                    handleSensorChange={handleSensorChange}
                                                />
                                                <RelayControl
                                                    device={device}
                                                    handleToggleRelay={handleToggleRelay}
                                                    isUpdating={isUpdating}
                                                    isConnected={isConnected}
                                                    handleAction={handleAction}
                                                    handleWifiReset={handleWifiReset}
                                                    wifiResetting={wifiResetting}
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Gráfico de Histórico */}
                        <DeviceHistoryChart
                            history={history || []}
                            deviceStatus={device.status}
                            tempMinInput={tempMinInput}
                            tempMaxInput={tempMaxInput}
                        />

                        {/* Eventos Recentes */}
                        <RecentEvents events={events || []} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DeviceDetails;
