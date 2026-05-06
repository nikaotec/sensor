import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useMqttData } from '../hooks/useMqttData';
import { supabase } from '../supabase/config';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    ReferenceLine
} from 'recharts';
import {
    Settings as SettingsIcon,
    RefreshCw,
    AlertTriangle,
    Zap,
    Thermometer,
    ArrowLeft,
    Wrench,
    Droplets,
    RotateCw,
    BatteryCharging,
    Wifi,
    Download,
    VolumeX,
    Volume2,
    Gauge,
    DoorOpen,
    ToggleLeft,
    ToggleRight,
    Settings2,
    Edit3,
    Save,
    X
} from 'lucide-react';

interface DeviceDetailsProps {
    deviceId: string;
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel' | 'admin-users') => void;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ deviceId, onNavigate }) => {
    const { currentTenant, availableTenants } = useTenant();
    const { currentUser } = useAuth();
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'gestor' || currentUser?.role === 'admin';
    if (!currentTenant) return <div className="flex h-screen items-center justify-center bg-background-dark text-white">Carregando dados...</div>;
    const [remoteSync, setRemoteSync] = useState(true);

    const { devices: supabaseDevices, history, events } = useSupabaseData(currentTenant.id, deviceId, currentUser?.role);
    const { devices: tenantDevices, isConnected, publish, updateDeviceLocal } = useMqttData({ id: 'all' }, currentUser?.role, supabaseDevices);

    // Debug: log do history
    console.log('[DeviceDetails] history:', history, 'deviceId:', deviceId);

    // Estados locais para controle remoto
    const [tempMinInput, setTempMinInput] = useState<string>('');
    const [tempMaxInput, setTempMaxInput] = useState<string>('');
    const [voltMinInput, setVoltMinInput] = useState<string>('');
    const [voltMaxInput, setVoltMaxInput] = useState<string>('');
    const [batMinInput, setBatMinInput] = useState<string>('');
    const [doorTimeInput, setDoorTimeInput] = useState<string>('');

    // Estados para histerese do relé 0
    const [hysteresisOnInput, setHysteresisOnInput] = useState<string>('7.5');
    const [hysteresisOffInput, setHysteresisOffInput] = useState<string>('2.5');

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

    // Estados para edição de nome
    const [isEditingName, setIsEditingName] = useState(false);
    const [newDeviceName, setNewDeviceName] = useState('');
    const [isChangingName, setIsChangingName] = useState(false);

    // Filter by tenant and deviceId
    const device = tenantDevices.find(d => d.id === deviceId);

    // Sincronizar inputs com dados do dispositivo quando eles chegarem ou se o auto-sync estiver ligado
    useEffect(() => {
        if (device?.telemetry) {
            if (remoteSync) {
                if (device.telemetry.alarmMax !== undefined) setTempMaxInput(device.telemetry.alarmMax.toString());
                if (device.telemetry.alarmMin !== undefined) setTempMinInput(device.telemetry.alarmMin.toString());
                if (device.telemetry.voltMaxLimit !== undefined) setVoltMaxInput(device.telemetry.voltMaxLimit.toString());
                if (device.telemetry.voltMinLimit !== undefined) setVoltMinInput(device.telemetry.voltMinLimit.toString());
                if (device.telemetry.batMinLimit !== undefined) setBatMinInput(device.telemetry.batMinLimit.toString());
                if (device.telemetry.doorMaxTime !== undefined) setDoorTimeInput(device.telemetry.doorMaxTime.toString());

                if ((device.telemetry as any).R0_TEMP_ON !== undefined) setHysteresisOnInput((device.telemetry as any).R0_TEMP_ON.toString());
                if ((device.telemetry as any).R0_TEMP_OFF !== undefined) setHysteresisOffInput((device.telemetry as any).R0_TEMP_OFF.toString());
            }
            // Sincronizar estados de alarmes (CHK_*)
            if (device.telemetry.chkVolt !== undefined) setChkVolt(device.telemetry.chkVolt);
            if (device.telemetry.chkBat !== undefined) setChkBat(device.telemetry.chkBat);
            if (device.telemetry.chkTemp !== undefined) setChkTemp(device.telemetry.chkTemp);
            if (device.telemetry.chkDoor !== undefined) setChkDoor(device.telemetry.chkDoor);
        }
    }, [device?.telemetry, remoteSync]);

    // Se o dispositivo ainda não foi carregado ou não encontrado
    if (!device) {
        return (
            <div className="flex h-screen overflow-hidden bg-background-dark text-slate-100 font-display">
                <Sidebar activeItem="device-list" onNavigate={onNavigate} />
                <main className="flex-1 flex flex-col items-center justify-center p-8 bg-background-dark">
                    <div className="bg-[#1A1D17] border border-[#2A2E24] p-10 rounded-3xl flex flex-col items-center text-center max-w-md shadow-2xl">
                        <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 animate-pulse">
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

            // Valida se o tenantId é um UUID válido antes de inserir no banco
            const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            const tenant_id = device.tenantId && isValidUUID(device.tenantId) ? device.tenantId : null;

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
        const isAuthorized = currentUser?.role === 'gestor' || currentUser?.role === 'manager' || currentUser?.role === 'admin';
        if (!isAuthorized) return;

        const nameToSet = newDeviceName.trim().substring(0, 31);
        setIsChangingName(true);

        const isAdmin = isAuthorized;

        try {
            // 1. Atualizar banco de dados Supabase imediatamente
            const { error } = await supabase
                .from('devices_status')
                .update({ name: nameToSet, updated_at: new Date().toISOString() })
                .eq('id', device.id);

            if (error) throw error;

            // 2. Enviar comando via MQTT para o dispositivo atualizar a EEPROM dele
            const payload = {
                intencao: 'alterar_nome',
                novo_nome: nameToSet,
                dispositivo_id: device.id,
                id: device.id,
                is_admin: isAdmin,
                source: 'dashboard'
            };

            publish('esp32c3/status/action', JSON.stringify(payload));

            // 3. O updateDeviceLocal (useMqttData) irá cuidar de criar a trava de 30s
            // para que a próxima telemetria com nome antigo do n8n não apague o novo nome.
            if (updateDeviceLocal) {
                updateDeviceLocal(device.id, { name: nameToSet });
            }

            setIsEditingName(false);
            console.log('Nome salvo no Supabase e comando enviado para o dispositivo.');
        } catch (error: any) {
            console.error('Erro ao mudar nome:', error);
            alert(`Erro ao mudar nome: ${error.message}`);
        } finally {
            setTimeout(() => setIsChangingName(false), 500);
        }
    };

    const handleSaveHysteresis = async () => {
        if (!hysteresisOnInput || !hysteresisOffInput || !device) return;

        const tempOn = parseFloat(hysteresisOnInput);
        const tempOff = parseFloat(hysteresisOffInput);

        handleAction('configurar_rele', {
            rele_index: 0,
            temp_on: tempOn,
            temp_off: tempOff
        }, `Histerese configurada: Ligar > ${hysteresisOnInput}°C, Desligar < ${hysteresisOffInput}°C`);

        try {
            await supabase.from('devices_status').update({
                updated_at: new Date().toISOString()
            }).eq('id', device.id);
        } catch (e) {
            console.error('Save Hysteresis DB error:', e);
        }

        if (updateDeviceLocal) {
            updateDeviceLocal(device.id, {
                telemetry: {
                    ...device.telemetry,
                    tempOn: tempOn,
                    tempOff: tempOff
                }
            });
        }
    };

    const handleSaveLimits = async () => {
        if (!device) return;
        const changes = [];
        if (tempMaxInput) changes.push(`T.Máx: ${tempMaxInput}°C`);
        if (tempMinInput) changes.push(`T.Mín: ${tempMinInput}°C`);
        if (voltMaxInput) changes.push(`V.Máx: ${voltMaxInput}V`);
        if (voltMinInput) changes.push(`V.Mín: ${voltMinInput}V`);
        if (batMinInput) changes.push(`Bat.Mín: ${batMinInput}V`);
        if (doorTimeInput) changes.push(`Porta: ${doorTimeInput}s`);

        handleAction('configurar_limites', {
            temp_max: tempMaxInput !== '' ? parseFloat(tempMaxInput) : undefined,
            temp_min: tempMinInput !== '' ? parseFloat(tempMinInput) : undefined,
            volt_max: voltMaxInput !== '' ? parseFloat(voltMaxInput) : undefined,
            volt_min: voltMinInput !== '' ? parseFloat(voltMinInput) : undefined,
            bat_min: batMinInput !== '' ? parseFloat(batMinInput) : undefined,
            tempo_porta: doorTimeInput !== '' ? parseInt(doorTimeInput) : undefined,
        }, `Limites atualizados: ${changes.join(', ')}`);

        try {
            await supabase.from('devices_status').update({
                temp_max: tempMaxInput !== '' ? parseFloat(tempMaxInput) : null,
                temp_min: tempMinInput !== '' ? parseFloat(tempMinInput) : null,
                alarm_max: tempMaxInput !== '' ? parseFloat(tempMaxInput) : null,
                alarm_min: tempMinInput !== '' ? parseFloat(tempMinInput) : null,
                updated_at: new Date().toISOString()
            }).eq('id', device.id);
        } catch (e) {
            console.error('Save Limits DB error:', e);
        }

        if (updateDeviceLocal) {
            updateDeviceLocal(device.id, {
                telemetry: {
                    ...device.telemetry,
                    alarmMax: tempMaxInput !== '' ? parseFloat(tempMaxInput) : device.telemetry?.alarmMax,
                    alarmMin: tempMinInput !== '' ? parseFloat(tempMinInput) : device.telemetry?.alarmMin,
                    tempMax: tempMaxInput !== '' ? parseFloat(tempMaxInput) : device.telemetry?.tempMax,
                    tempMin: tempMinInput !== '' ? parseFloat(tempMinInput) : device.telemetry?.tempMin,
                    voltMaxLimit: voltMaxInput !== '' ? parseFloat(voltMaxInput) : device.telemetry?.voltMaxLimit,
                    voltMinLimit: voltMinInput !== '' ? parseFloat(voltMinInput) : device.telemetry?.voltMinLimit,
                    batMinLimit: batMinInput !== '' ? parseFloat(batMinInput) : device.telemetry?.batMinLimit,
                    doorMaxTime: doorTimeInput !== '' ? parseInt(doorTimeInput) : device.telemetry?.doorMaxTime,
                }
            });
        }
    };

    const handleToggleRelay = (action: 'ligar_rele' | 'desligar_rele', index?: number, port?: number) => {
        const payload = index !== undefined ? { rele_index: index, porta: port } : {};
        const msg = index !== undefined
            ? `Relé ${index} (Porta ${port}) ${action === 'ligar_rele' ? 'ligado' : 'desligado'} manualmente`
            : (action === 'ligar_rele' ? 'Relé ligado manualmente' : 'Relé desligado manualmente');

        // Update local state immediately (Optimistic Update)
        if (device && updateDeviceLocal && index !== undefined) {
            const isLigando = action === 'ligar_rele';
            updateDeviceLocal(device.id, {
                telemetry: {
                    ...device.telemetry,
                    [`rele${index}`]: isLigando,
                    // Fallback for relay 0 legacy key
                    ...(index === 0 ? { rele: isLigando } : {})
                }
            } as any);
        }

        handleAction(action, payload, msg);
    };

    // Handler para habilitar/desabilitar alarmes por sensor
    const handleToggleAlarm = async (sensor: 'habilitar_tensao' | 'desabilitar_tensao' | 'habilitar_bateria' | 'desabilitar_bateria' | 'habilitar_temperatura' | 'desabilitar_temperatura' | 'habilitar_porta' | 'desabilitar_porta') => {
        const sensorNames: Record<string, string> = {
            'habilitar_tensao': 'Tensão',
            'desabilitar_tensao': 'Tensão',
            'habilitar_bateria': 'Bateria',
            'desabilitar_bateria': 'Bateria',
            'habilitar_temperatura': 'Temperatura',
            'desabilitar_temperatura': 'Temperatura',
            'habilitar_porta': 'Porta',
            'desabilitar_porta': 'Porta'
        };
        const actionType = sensor.startsWith('habilitar') ? 'habilitado' : 'desabilitado';
        const isEnabled = sensor.startsWith('habilitar');

        // Update otimista do estado local para feedback imediato
        const telemetryUpdates: any = {};
        const supabaseUpdates: any = { updated_at: new Date().toISOString() };

        if (sensor === 'habilitar_tensao' || sensor === 'desabilitar_tensao') {
            setChkVolt(isEnabled);
            telemetryUpdates.chkVolt = isEnabled;
            supabaseUpdates.chk_volt = isEnabled;
        } else if (sensor === 'habilitar_bateria' || sensor === 'desabilitar_bateria') {
            setChkBat(isEnabled);
            telemetryUpdates.chkBat = isEnabled;
            supabaseUpdates.chk_bat = isEnabled;
        } else if (sensor === 'habilitar_temperatura' || sensor === 'desabilitar_temperatura') {
            setChkTemp(isEnabled);
            telemetryUpdates.chkTemp = isEnabled;
            supabaseUpdates.chk_temp = isEnabled;
        } else if (sensor === 'habilitar_porta' || sensor === 'desabilitar_porta') {
            setChkDoor(isEnabled);
            telemetryUpdates.chkDoor = isEnabled;
            supabaseUpdates.chk_door = isEnabled;
        }

        if (device) {
            if (updateDeviceLocal) {
                updateDeviceLocal(device.id, {
                    telemetry: {
                        ...device.telemetry,
                        ...telemetryUpdates
                    }
                });
            }
            try {
                await supabase.from('devices_status').update(supabaseUpdates).eq('id', device.id);
            } catch (e) {
                console.error('Error saving alarm toggle to db:', e);
            }
        }

        handleAction(sensor, {}, `Alarme de ${sensorNames[sensor]} ${actionType} via dashboard`);
    };

    // Handler para calibração de sensores
    const handleSettings2 = (type: 'tensao' | 'bateria' | 'temperatura') => {
        if (type === 'temperatura') {
            const value = tempCalibration;
            if (!value || isNaN(parseFloat(value))) {
                alert('Por favor, insira um valor válido para calibração');
                return;
            }
            handleAction('calibrar_temperatura', { nova_temperatura: parseFloat(value) }, `Calibração de temperatura com offset ${value}C`);
            setTempCalibration('');
            return;
        }
        const value = type === 'tensao' ? voltCalibration : batCalibration;
        if (!value || isNaN(parseFloat(value))) {
            alert('Por favor, insira um valor válido para calibração');
            return;
        }
        const action = type === 'tensao' ? 'calibrar_tensao' : 'calibrar_bateria';
        handleAction(action, { nova_tensao: parseFloat(value) }, `Calibração de ${type === 'tensao' ? 'tensão' : 'bateria'} para ${value}V`);
        setVoltCalibration('');
        setBatCalibration('');
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'online': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'offline': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-slate-700 text-slate-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'online': return 'ESTÁVEL';
            case 'warning': return 'ALERTA';
            case 'error': return 'ERRO';
            case 'offline': return 'OFFLINE';
            default: return status.toUpperCase();
        }
    };

    const getEventIcon = (type: string) => {
        if (type?.includes('ALERTA_TENSAO')) return <Zap size={16} />;
        if (type?.includes('ALERTA_TEMP')) return <Thermometer size={16} />;
        if (type?.includes('ALERTA_PORTA') || type?.includes('PORTA')) return <DoorOpen size={16} />;
        if (type?.includes('ALERTA_BATERIA') || type?.includes('BATERIA')) return <BatteryCharging size={16} />;
        if (type?.includes('ALERTA')) return <AlertTriangle size={16} />;
        if (type?.includes('CONFIG')) return <RefreshCw size={16} />;
        if (type?.includes('RELE')) return <Zap size={16} />;
        if (type?.includes('PORTA')) return <DoorOpen size={16} />;
        return <RotateCw size={16} />;
    };

    const getEventColor = (type: string): { bg: string; border: string; text: string; icon: string } => {
        if (!type) return { bg: 'bg-[#0F110D]', border: 'border-[#2A2E24]', text: 'text-slate-400', icon: 'text-slate-500' };

        const upperType = type.toUpperCase();

        if (upperType.includes('TENSAO_ALTA') || upperType.includes('TENSAO_BAIXA') ||
            upperType.includes('TEMP_ALTA') || upperType.includes('TEMP_BAIXA') ||
            upperType.includes('PORTA_ABERTA') || upperType.includes('BATERIA_CRITICA')) {
            return { bg: 'bg-red-950/30', border: 'border-red-600/50', text: 'text-red-400', icon: 'text-red-500' };
        }
        if (upperType.includes('ALERTA')) {
            return { bg: 'bg-orange-950/30', border: 'border-orange-600/50', text: 'text-orange-400', icon: 'text-orange-500' };
        }
        if (upperType.includes('NORMALIZADO') || upperType.includes('RECOVER')) {
            return { bg: 'bg-emerald-950/30', border: 'border-emerald-600/50', text: 'text-emerald-400', icon: 'text-emerald-500' };
        }
        if (upperType.includes('CONFIG') || upperType.includes('LIMITE')) {
            return { bg: 'bg-blue-950/30', border: 'border-blue-600/50', text: 'text-blue-400', icon: 'text-blue-500' };
        }
        if (upperType.includes('RELE') || upperType.includes('MQTT')) {
            return { bg: 'bg-purple-950/30', border: 'border-purple-600/50', text: 'text-purple-400', icon: 'text-purple-500' };
        }
        return { bg: 'bg-[#0F110D]', border: 'border-[#2A2E24]', text: 'text-slate-400', icon: 'text-slate-500' };
    };

    const formatEventTime = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        } catch (e) {
            return timestamp;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-dark text-slate-100 font-display">
            <Sidebar activeItem="device-list" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative bg-background-dark text-slate-100">
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-8 bg-[#1A1D17]/80 backdrop-blur-md border-b border-[#2A2E24] sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-[#2A2E24]/50 rounded-xl transition-colors text-slate-400 hover:text-white">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex flex-col">
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newDeviceName}
                                        onChange={(e) => setNewDeviceName(e.target.value)}
                                        maxLength={31}
                                        placeholder="Novo nome..."
                                        className="bg-[#0a0c08] border border-primary/50 rounded-lg px-3 py-1.5 text-white text-lg font-bold w-48 focus:border-primary outline-none"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleChangeDeviceName}
                                        disabled={isChangingName || !newDeviceName.trim()}
                                        className="p-1.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                                    >
                                        <Save size={18} />
                                    </button>
                                    <button
                                        onClick={() => { setIsEditingName(false); setNewDeviceName(''); }}
                                        className="p-1.5 text-slate-400 hover:text-white"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold leading-none text-white tracking-tight">{device?.name || 'Dispositivo'}</h2>
                                    {(currentUser?.role === 'gestor' || currentUser?.role === 'manager') && (
                                        <button
                                            onClick={() => { setIsEditingName(true); setNewDeviceName(device?.name || ''); }}
                                            className="p-1 text-slate-500 hover:text-primary transition-colors"
                                            title="Alterar nome"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                                {availableTenants?.find(t => t.id === device?.tenantId)?.name || device?.tenantId || 'Empresa Desconhecida'}
                                {device?.location ? ` • ${device.location}` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border tracking-widest ${getStatusStyle(device?.status || 'offline')}`}>
                            {getStatusLabel(device?.status || 'offline')}
                        </span>
                        <div className="h-8 w-px bg-[#2A2E24] mx-2"></div>
                        <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                            <SettingsIcon size={20} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-10 py-6 pb-24 sm:pb-6 custom-scrollbar 2xl:max-w-[1600px] 2xl:mx-auto w-full">
                    <div className="flex flex-col gap-8">
                        {/* Top Section: Three cards in a row (or stacked on mobile) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Card 1: Monitoramento em Tempo Real */}
                            <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                                <h3 className="text-xs font-medium text-slate-400 uppercase mb-4 tracking-wider font-heading">Monitoramento em Tempo Real</h3>

                                {device?.status === 'offline' && (
                                    <div className="mb-4 bg-[#0F110D] text-slate-400 text-xs px-4 py-3 rounded-xl border border-amber-500/20 flex items-start gap-3 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                        <span className="leading-snug">
                                            <strong className="text-amber-500 font-bold block mb-1">Dispositivo offline!</strong>
                                            Os dados exibidos são do último registro conhecido.
                                        </span>
                                    </div>
                                )}

                                {device?.telemetry?.modo === 'MANUAL' && (
                                    <div className="mb-4 bg-blue-500/10 text-blue-400 text-xs px-4 py-3 rounded-xl border border-blue-500/20 flex items-start gap-3 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                        <Wrench className="text-blue-500 shrink-0 mt-0.5" size={18} />
                                        <span className="leading-snug">
                                            <strong className="text-blue-500 font-bold block mb-1">Modo Manutenção Ativo</strong>
                                            Os alertas automáticos estão suspensos para este dispositivo.
                                        </span>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 flex items-end justify-between bg-[#0F110D] p-5 rounded-2xl border border-[#2A2E24]">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1 font-medium">Temperatura Atual</p>
                                                <h4 className="text-4xl font-black text-primary tracking-tight">{device?.telemetry?.temp !== undefined ? `${device.telemetry.temp.toFixed(1)}°C` : '--'}</h4>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase border ${getStatusStyle(device?.status || 'offline')}`}>{getStatusLabel(device?.status || 'offline')}</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-between px-5 py-2.5 bg-[#0F110D] rounded-xl border border-[#2A2E24] mt-1 mb-1">
                                            <div className="flex items-center gap-2">
                                                <Thermometer size={14} className="text-slate-500" />
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Ambiente:</span>
                                                <span className="text-[10px] text-slate-200 font-bold font-mono">{device?.telemetry?.tempExt !== undefined ? `${device.telemetry.tempExt.toFixed(1)}°C` : '--'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Droplets size={14} className="text-slate-500" />
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Umidade:</span>
                                                <span className="text-[10px] text-slate-200 font-bold font-mono">{device?.telemetry?.humidity !== undefined ? `${device.telemetry.humidity.toFixed(0)}%` : '--'}</span>
                                            </div>
                                        </div>

                                        <div className="bg-[#0A0D08] p-3 rounded-xl border border-[#2A2E24] text-center flex flex-col items-center justify-center shadow-inner group/card hover:border-red-500/30 transition-colors">
                                            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-widest group-hover/card:text-red-400 transition-colors">Máxima</p>
                                            <p className="text-base font-bold text-[#FF5F5F] drop-shadow-[0_0_8px_rgba(255,95,95,0.3)]">{device?.telemetry?.tempMax !== undefined ? `${device.telemetry.tempMax.toFixed(1)}°C` : '--'}</p>
                                        </div>
                                        <div className="bg-[#0A0D08] p-3 rounded-xl border border-[#2A2E24] text-center flex flex-col items-center justify-center shadow-inner group/card hover:border-primary/30 transition-colors">
                                            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1 tracking-widest group-hover/card:text-primary transition-colors">Mínima</p>
                                            <p className="text-base font-bold text-primary drop-shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.3)]">{device?.telemetry?.tempMin !== undefined ? `${device.telemetry.tempMin.toFixed(1)}°C` : '--'}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div className="flex items-center gap-3 p-3 bg-[#0A0D08] rounded-xl border border-[#2A2E24] shadow-inner">
                                            <div className="size-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                                <BatteryCharging size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest leading-tight">Bateria</p>
                                                <p className="text-sm font-bold text-white leading-tight">{device?.telemetry?.batteryVoltage !== undefined ? `${device.telemetry.batteryVoltage.toFixed(2)}V` : '--'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-[#0A0D08] rounded-xl border border-[#2A2E24] shadow-inner">
                                            <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                                                <Zap size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest leading-tight">Tensão</p>
                                                <p className="text-sm font-bold text-white leading-tight">{device?.telemetry?.inputVoltage !== undefined ? `${device.telemetry.inputVoltage}V` : '--'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Porta Status (Show only if available) */}
                                    {device?.telemetry?.doorOpen !== undefined && (
                                        <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${device.telemetry.doorOpen ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`size-8 rounded-lg flex items-center justify-center ${device.telemetry.doorOpen ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                    <RotateCw size={16} className={device.telemetry.doorOpen ? 'animate-pulse' : ''} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Sensor de Porta</p>
                                                    <p className={`text-sm font-bold ${device.telemetry.doorOpen ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {device.telemetry.doorOpen ? 'ABERTA' : 'FECHADA'}
                                                    </p>
                                                </div>
                                            </div>
                                            {device.telemetry.doorOpen && device.telemetry.secondsOpen !== undefined && (
                                                <div className="text-right">
                                                    <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Aberta há</p>
                                                    <p className="text-xs font-mono font-bold text-red-400">{device.telemetry.secondsOpen}s</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Status dos Relés (Indicadores Visuais) - Apenas para Gestores */}
                                    {isManager && (
                                        <div className="pt-2 border-t border-[#2A2E24]/50 mt-2">
                                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1 block mb-2">Máquinas</p>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { id: 0, label: 'R-0' },
                                                    { id: 1, label: 'R-1' },
                                                    { id: 2, label: 'R-2' },
                                                    { id: 3, label: 'R-3' }
                                                ].map((rele) => {
                                                    const state: any = device?.telemetry ? (device.telemetry as any)[`rele${rele.id}`] ?? (rele.id === 0 ? device.telemetry.rele : undefined) : undefined;
                                                    return (
                                                        <div key={rele.id} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${state === true ? 'bg-emerald-500/10 border-emerald-500/30' : state === false ? 'bg-red-500/5 border-red-500/20' : 'bg-[#0A0D08] border-[#2A2E24] opacity-50'}`}>
                                                            <span className="text-[8px] font-bold text-slate-500 mb-1.5">{rele.label}</span>
                                                            <div className={`size-2.5 rounded-full ${state === true ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse' : state === false ? 'bg-red-500' : 'bg-slate-700'}`} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between text-xs pt-2">
                                        <div className="flex items-center gap-2 text-slate-500 font-bold tracking-wide">
                                            <Wifi size={16} />
                                            <span>Sinal RSSI: {device?.telemetry?.signal !== undefined ? `${device.telemetry.signal} dBm` : '--'}</span>
                                        </div>
                                        {(() => {
                                            const rssi = device?.telemetry?.signal;
                                            if (!rssi) return <span className="text-slate-500 font-bold bg-[#0F110D] px-2 py-1 rounded border border-[#2A2E24]">Desconhecido</span>;
                                            if (rssi > -60) return <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Excelente</span>;
                                            if (rssi > -80) return <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">Bom</span>;
                                            return <span className="text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/20">Fraco</span>;
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Controle Remoto (Expanded) - Apenas para Gestores */}
                            {isManager && (
                                <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                        <SettingsIcon size={40} className="text-primary rotate-12" />
                                    </div>

                                    <h3 className="text-xs font-medium text-slate-400 uppercase mb-5 tracking-wider font-heading flex items-center gap-2">
                                        <RefreshCw size={14} className={isUpdating ? 'animate-spin' : ''} />
                                        Painel de Controle
                                    </h3>

                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                                        {/* Seção: Controle de Histerese */}
                                        <div className="bg-[#0A0D08] p-4 rounded-xl border border-blue-500/20 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="size-2 rounded-full bg-blue-500 animate-pulse"></div>
                                                <span className="text-[11px] font-bold text-white uppercase tracking-widest">Histerese (Relé Automático)</span>
                                            </div>
                                            <p className="text-[9px] text-slate-500 mb-3">Temp &gt;= ON Liga | Temp &lt;= OFF Desliga</p>
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] text-slate-400 uppercase font-bold tracking-widest px-1">Ligar Máx (°C)</label>
                                                    <input type="number" step="0.1" value={hysteresisOnInput} onChange={(e) => setHysteresisOnInput(e.target.value)} className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500/50 focus:outline-none transition-colors" placeholder="7.5" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] text-slate-400 uppercase font-bold tracking-widest px-1">Desligar Mín (°C)</label>
                                                    <input type="number" step="0.1" value={hysteresisOffInput} onChange={(e) => setHysteresisOffInput(e.target.value)} className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500/50 focus:outline-none transition-colors" placeholder="2.5" />
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleSaveHysteresis}
                                                disabled={isUpdating || !isConnected}
                                                className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]
                                                    ${isUpdating ? 'bg-slate-700 text-slate-400 cursor-wait' : isConnected ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed opacity-50'}`}
                                            >
                                                {isUpdating ? 'ENVIANDO...' : (isConnected ? 'ATUALIZAR HISTERESE' : 'SEM CONEXÃO')}
                                            </button>
                                        </div>

                                        {/* Temperatura */}
                                        <div className="space-y-2 pb-3 border-b border-[#2A2E24]/50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="size-1.5 rounded-full bg-red-500"></div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alerta de Temperatura</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Mín (°C)</label>
                                                    <input type="number" step="0.1" value={tempMinInput} onChange={(e) => { setTempMinInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-red-500/50 focus:outline-none" placeholder="0.0" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Máx (°C)</label>
                                                    <input type="number" step="0.1" value={tempMaxInput} onChange={(e) => { setTempMaxInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-red-500/50 focus:outline-none" placeholder="0.0" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tensão */}
                                        <div className="space-y-2 pb-3 border-b border-[#2A2E24]/50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="size-1.5 rounded-full bg-amber-500"></div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alerta de Tensão</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Mín (V)</label>
                                                    <input type="number" step="1" value={voltMinInput} onChange={(e) => { setVoltMinInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500/50 focus:outline-none" placeholder="0" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Máx (V)</label>
                                                    <input type="number" step="1" value={voltMaxInput} onChange={(e) => { setVoltMaxInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500/50 focus:outline-none" placeholder="0" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Outros */}
                                        <div className="grid grid-cols-2 gap-3 pb-2">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Bat. Mín (V)</label>
                                                <input type="number" step="0.1" value={batMinInput} onChange={(e) => { setBatMinInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-primary/50 focus:outline-none" placeholder="0.0" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Porta (s)</label>
                                                <input type="number" step="1" value={doorTimeInput} onChange={(e) => { setDoorTimeInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-primary/50 focus:outline-none" placeholder="0" />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSaveLimits}
                                            disabled={isUpdating || !isConnected}
                                            className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98]
                                                ${isUpdating ? 'bg-slate-700 text-slate-400 cursor-wait' : isConnected ? 'bg-primary text-background-dark hover:bg-primary-light shadow-primary/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed opacity-50'}`}
                                        >
                                            {isUpdating ? 'ENVIANDO...' : (isConnected ? 'ATUALIZAR LIMITES' : 'SEM CONEXÃO')}
                                        </button>

                                        {/* Seção: Controle de Alarmes por Sensor */}
                                        <div className="pt-4 mt-4 border-t border-[#2A2E24]">
                                            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3 block">Alarmes por Sensor</label>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                                {/* Toggle: Alarme de Tensão */}
                                                <button
                                                    onClick={() => handleToggleAlarm(chkVolt ? 'desabilitar_tensao' : 'habilitar_tensao')}
                                                    disabled={isUpdating || !isConnected}
                                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                                                        ${chkVolt
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                                                            : 'bg-[#0F110D] border-[#2A2E24] hover:bg-[#151811]'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg transition-colors ${chkVolt ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                                                            <Gauge size={16} />
                                                        </div>
                                                        <div>
                                                            <p className={`text-[11px] font-bold uppercase tracking-wider ${chkVolt ? 'text-emerald-400' : 'text-slate-400'}`}>Tensão</p>
                                                            <p className={`text-[9px] font-medium ${chkVolt ? 'text-emerald-500/70' : 'text-slate-600'}`}>{chkVolt ? 'Alerta Ativado' : 'Desativado'}</p>
                                                        </div>
                                                    </div>
                                                    <div className={chkVolt ? 'text-emerald-500' : 'text-slate-600'}>
                                                        {chkVolt ? (
                                                            <ToggleRight size={24} className="transition-transform group-hover:scale-105" />
                                                        ) : (
                                                            <ToggleLeft size={24} className="transition-transform group-hover:scale-105" />
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Toggle: Alarme de Bateria */}
                                                <button
                                                    onClick={() => handleToggleAlarm(chkBat ? 'desabilitar_bateria' : 'habilitar_bateria')}
                                                    disabled={isUpdating || !isConnected}
                                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                                                        ${chkBat
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                                                            : 'bg-[#0F110D] border-[#2A2E24] hover:bg-[#151811]'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg transition-colors ${chkBat ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                                                            <BatteryCharging size={16} />
                                                        </div>
                                                        <div>
                                                            <p className={`text-[11px] font-bold uppercase tracking-wider ${chkBat ? 'text-emerald-400' : 'text-slate-400'}`}>Bateria</p>
                                                            <p className={`text-[9px] font-medium ${chkBat ? 'text-emerald-500/70' : 'text-slate-600'}`}>{chkBat ? 'Alerta Ativado' : 'Desativado'}</p>
                                                        </div>
                                                    </div>
                                                    <div className={chkBat ? 'text-emerald-500' : 'text-slate-600'}>
                                                        {chkBat ? (
                                                            <ToggleRight size={24} className="transition-transform group-hover:scale-105" />
                                                        ) : (
                                                            <ToggleLeft size={24} className="transition-transform group-hover:scale-105" />
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Toggle: Alarme de Temperatura */}
                                                <button
                                                    onClick={() => handleToggleAlarm(chkTemp ? 'desabilitar_temperatura' : 'habilitar_temperatura')}
                                                    disabled={isUpdating || !isConnected}
                                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                                                        ${chkTemp
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                                                            : 'bg-[#0F110D] border-[#2A2E24] hover:bg-[#151811]'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg transition-colors ${chkTemp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                                                            <Thermometer size={16} />
                                                        </div>
                                                        <div>
                                                            <p className={`text-[11px] font-bold uppercase tracking-wider ${chkTemp ? 'text-emerald-400' : 'text-slate-400'}`}>Temperatura</p>
                                                            <p className={`text-[9px] font-medium ${chkTemp ? 'text-emerald-500/70' : 'text-slate-600'}`}>{chkTemp ? 'Alerta Ativado' : 'Desativado'}</p>
                                                        </div>
                                                    </div>
                                                    <div className={chkTemp ? 'text-emerald-500' : 'text-slate-600'}>
                                                        {chkTemp ? (
                                                            <ToggleRight size={24} className="transition-transform group-hover:scale-105" />
                                                        ) : (
                                                            <ToggleLeft size={24} className="transition-transform group-hover:scale-105" />
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Toggle: Alarme de Porta */}
                                                <button
                                                    onClick={() => handleToggleAlarm(chkDoor ? 'desabilitar_porta' : 'habilitar_porta')}
                                                    disabled={isUpdating || !isConnected}
                                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                                                        ${chkDoor
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                                                            : 'bg-[#0F110D] border-[#2A2E24] hover:bg-[#151811]'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg transition-colors ${chkDoor ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                                                            <DoorOpen size={16} />
                                                        </div>
                                                        <div>
                                                            <p className={`text-[11px] font-bold uppercase tracking-wider ${chkDoor ? 'text-emerald-400' : 'text-slate-400'}`}>Porta</p>
                                                            <p className={`text-[9px] font-medium ${chkDoor ? 'text-emerald-500/70' : 'text-slate-600'}`}>{chkDoor ? 'Alerta Ativado' : 'Desativado'}</p>
                                                        </div>
                                                    </div>
                                                    <div className={chkDoor ? 'text-emerald-500' : 'text-slate-600'}>
                                                        {chkDoor ? (
                                                            <ToggleRight size={24} className="transition-transform group-hover:scale-105" />
                                                        ) : (
                                                            <ToggleLeft size={24} className="transition-transform group-hover:scale-105" />
                                                        )}
                                                    </div>
                                                </button>
                                            </div>

                                            {/* Seção de Calibração */}
                                            <div className="mt-6 pt-5 border-t border-[#2A2E24]">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                                                        <Settings2 size={16} className="text-primary" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[11px] text-white uppercase font-bold tracking-widest leading-none">Calibração de Sensores</h4>
                                                        <p className="text-[9px] text-slate-500 mt-1">Insira o valor medido pelo multímetro para manter a precisão.</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 bg-[#0A0D08] p-4 rounded-xl border border-[#2A2E24] shadow-inner">
                                                    {/* Calibração de Tensão */}
                                                    <div className="space-y-1.5 focus-within:ring-1 focus-within:ring-amber-500/30 rounded-lg transition-all p-1">
                                                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Tensão Real (V)</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="number"
                                                                step="1"
                                                                value={voltCalibration}
                                                                onChange={(e) => setVoltCalibration(e.target.value)}
                                                                className="flex-1 bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500 focus:outline-none transition-colors placeholder:text-slate-600"
                                                                placeholder="Ex: 220"
                                                            />
                                                            <button
                                                                onClick={() => handleSettings2('tensao')}
                                                                disabled={isUpdating || !isConnected || !voltCalibration}
                                                                className="px-4 py-2 bg-[#0F110D] border border-[#2A2E24] hover:bg-amber-500/10 hover:border-amber-500/30 text-amber-500 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Aplicar
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Calibração de Bateria */}
                                                    <div className="space-y-1.5 focus-within:ring-1 focus-within:ring-emerald-500/30 rounded-lg transition-all p-1">
                                                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Bateria Real (V)</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={batCalibration}
                                                                onChange={(e) => setBatCalibration(e.target.value)}
                                                                className="flex-1 bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-slate-600"
                                                                placeholder="Ex: 12.6"
                                                            />
                                                            <button
                                                                onClick={() => handleSettings2('bateria')}
                                                                disabled={isUpdating || !isConnected || !batCalibration}
                                                                className="px-4 py-2 bg-[#0F110D] border border-[#2A2E24] hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-500 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Aplicar
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Calibração de Temperatura */}
                                                    <div className="space-y-1.5 focus-within:ring-1 focus-within:ring-red-500/30 rounded-lg transition-all p-1">
                                                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Temperatura Real (°C)</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={tempCalibration}
                                                                onChange={(e) => setTempCalibration(e.target.value)}
                                                                className="flex-1 bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-red-500 focus:outline-none transition-colors placeholder:text-slate-600"
                                                                placeholder="Ex: 25.0"
                                                            />
                                                            <button
                                                                onClick={() => handleSettings2('temperatura')}
                                                                disabled={isUpdating || !isConnected || !tempCalibration}
                                                                className="px-4 py-2 bg-[#0F110D] border border-[#2A2E24] hover:bg-red-500/10 hover:border-red-500/30 text-red-500 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Aplicar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Controle de Saída (Relés) */}
                                        <div className="pt-3 border-t border-[#2A2E24] space-y-4">
                                            <div>
                                                <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1 block mb-2">Controle de Saída (Relés)</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { id: 0, port: 23 },
                                                        { id: 1, port: 19 },
                                                        { id: 2, port: 18 },
                                                        { id: 3, port: 5 }
                                                    ].map((rele) => {
                                                        const currentState: any = device?.telemetry ? (device.telemetry as any)[`rele${rele.id}`] ?? (rele.id === 0 ? device.telemetry.rele : undefined) : undefined;

                                                        return (
                                                            <div key={rele.id} className="flex flex-col gap-1 p-2 bg-[#1A1D17] border border-[#2A2E24] rounded-lg relative overflow-hidden">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-[10px] text-slate-400 font-medium">Relé {rele.id} <span className="text-[8px] opacity-40 uppercase tracking-widest ml-0.5">(P-{rele.port})</span></span>
                                                                    <div className={`flex items-center gap-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded transition-all ${currentState === true ? 'bg-emerald-500/20 text-emerald-400' : currentState === false ? 'bg-red-500/20 text-red-400' : 'bg-[#0F110D] text-slate-600 border border-[#2A2E24]'}`}>
                                                                        <div className={`size-1.5 rounded-full ${currentState === true ? 'bg-emerald-400 animate-pulse' : currentState === false ? 'bg-red-500' : 'bg-slate-600'}`} />
                                                                        {currentState === true ? 'ON' : currentState === false ? 'OFF' : 'N/A'}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => handleToggleRelay('ligar_rele', rele.id, rele.port)}
                                                                        disabled={isUpdating || !isConnected || currentState === true}
                                                                        className={`flex-1 py-1.5 rounded-lg text-[8px] font-bold uppercase transition-all ${currentState === true ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40' : 'bg-[#0F110D] border border-[#2A2E24] text-slate-400 hover:text-emerald-500'}`}>
                                                                        LIGAR
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleToggleRelay('desligar_rele', rele.id, rele.port)}
                                                                        disabled={isUpdating || !isConnected || currentState === false}
                                                                        className={`flex-1 py-1.5 rounded-lg text-[8px] font-bold uppercase transition-all ${currentState === false ? 'bg-red-500/20 text-red-500 border border-red-500/40' : 'bg-[#0F110D] border border-[#2A2E24] text-slate-400 hover:text-red-500'}`}>
                                                                        DESLIGAR
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1 block mb-2">Comandos Rápidos</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => handleAction(device?.telemetry?.modo === 'MANUAL' ? 'modo_operacional' : 'modo_manutencao', {}, `Modo alterado para: ${device?.telemetry?.modo === 'MANUAL' ? 'OPERACIONAL' : 'MANUTENÇÃO'}`)}
                                                        disabled={isUpdating || !isConnected}
                                                        className={`py-2 rounded-lg text-[9px] font-bold uppercase transition-all border ${device?.telemetry?.modo === 'MANUAL' ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' : 'bg-[#0F110D] border border-[#2A2E24] text-slate-400 hover:text-white'}`}
                                                    >
                                                        {device?.telemetry?.modo === 'MANUAL' ? 'SAIR MANUTENÇÃO' : 'ENTRAR MANUTENÇÃO'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(device?.telemetry?.silenced ? 'reativar_alarme' : 'silenciar_alarme', {}, device?.telemetry?.silenced ? 'Alarme reativado via dashboard' : 'Alarme silenciado via dashboard')}
                                                        disabled={isUpdating || !isConnected}
                                                        className={`py-2 rounded-lg text-[9px] font-bold uppercase transition-all border ${device?.telemetry?.silenced ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' : 'bg-[#0F110D] border border-[#2A2E24] text-slate-400 hover:text-white'}`}
                                                    >
                                                        <div className="flex items-center justify-center gap-2">
                                                            {device?.telemetry?.silenced ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                                            {device?.telemetry?.silenced ? 'ALARMES SILENCIADOS' : 'SILENCIAR ALARME'}
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Card 3: Informações do Sistema - Apenas para Gestores */}
                            {isManager && (
                                <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                                    <h3 className="text-xs font-medium text-slate-400 uppercase mb-4 tracking-wider font-heading">Informações do Sistema</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Última Atividade</span>
                                            <span className="font-mono text-white font-medium">{device?.lastSeen ? new Date(device.lastSeen).toLocaleString('pt-BR') : '--'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Endereço MAC</span>
                                            <span className="font-mono text-white font-medium">{device?.id || '--'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Endereço IP</span>
                                            <span className="font-mono text-white font-medium">{device?.telemetry?.ip || '--'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Modo</span>
                                            <span className="font-mono text-white font-medium">{device?.telemetry?.modo || '--'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Uptime</span>
                                            <span className="font-mono text-white font-medium">
                                                {device?.telemetry?.uptime ? `${Math.floor(device.telemetry.uptime / 3600)}h ${Math.floor((device.telemetry.uptime % 3600) / 60)}m` : '--'}
                                            </span>
                                        </div>
                                        <div className="pt-5 mt-5 border-t border-[#2A2E24] flex items-center justify-between">
                                            <span className="text-sm font-bold text-white">Sincronia Ativa</span>
                                            <button onClick={() => setRemoteSync(!remoteSync)} className={`relative inline-flex h-6 w-12 rounded-full border-2 transition-colors ${remoteSync ? 'bg-primary border-transparent' : 'bg-[#0F110D] border-[#2A2E24]'}`}>
                                                <span className={`h-5 w-5 transform rounded-full bg-white transition duration-200 ${remoteSync ? 'translate-x-6' : 'translate-x-0'}`}></span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Historical Chart below */}
                        <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-bold text-white">Histórico de Temperatura (24h)</h3>
                                <div className="flex gap-2">
                                    {device?.status === 'online' && <span className="text-[10px] font-bold px-3 py-1.5 bg-primary text-background-dark rounded-lg uppercase tracking-widest shadow-lg shadow-primary/20">Ao Vivo</span>}
                                </div>
                            </div>
                            <div className="h-[400px] relative w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={history && history.length > 0 ? history : []}>
                                        <defs>
                                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2E24" />
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dx={-10} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0F110D', border: '1px solid #2A2E24', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }} />
                                        {tempMinInput && (
                                            <ReferenceLine y={parseFloat(tempMinInput)} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideBottomRight', value: 'Mín', fill: '#ef4444', fontSize: 9 }} />
                                        )}
                                        {tempMaxInput && (
                                            <ReferenceLine y={parseFloat(tempMaxInput)} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'Máx', fill: '#ef4444', fontSize: 9 }} />
                                        )}
                                        <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                                {(!history || history.length === 0) && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <p className="text-slate-500 text-sm">Aguardando dados históricos do dispositivo...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Events below History */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-5 font-heading">Eventos Recentes</h4>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {events && events.length > 0 ? (
                                        events.map((e: any, i) => {
                                            const colors = getEventColor(e.type);
                                            return (
                                                <div key={i} className={`flex gap-4 p-4 rounded-xl border ${colors.border} ${colors.bg} hover:brightness-110 transition-all group`}>
                                                    <div className={`${colors.icon} mt-0.5 transition-colors`}>
                                                        {getEventIcon(e.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`${colors.text} text-sm font-medium leading-snug break-words`}>{e.msg || e.message || 'Evento'}</p>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                                            <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">{formatEventTime(e.timestamp)}</span>
                                                            {(e.userName || e.userEmail) && (
                                                                <span className="text-primary/70 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                                    • Por: {e.userName || 'Sistema'}
                                                                    <span className="text-slate-500 lowercase opacity-60">({e.userEmail})</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-4 text-center text-slate-500 text-xs italic">Nenhum evento registrado recentemente.</div>
                                    )}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg flex flex-col justify-center items-center text-center">
                                <div className="size-16 bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center text-primary mb-5">
                                    <Download size={28} />
                                </div>
                                <h4 className="text-base font-bold mb-2 text-white">Exportação de Dados</h4>
                                <p className="text-xs text-slate-400 mb-6 max-w-[200px]">Gere um relatório detalhado em CSV com todo o histórico deste sensor.</p>
                                <button className="w-full py-3 bg-[#0F110D] border border-[#2A2E24] rounded-xl text-xs font-bold text-white uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-colors">
                                    EXPORTAR HISTÓRICO
                                </button>
                            </div>
                        </div>
                    </div >
                </div >
            </main >
        </div >
    );
};

export default DeviceDetails;
