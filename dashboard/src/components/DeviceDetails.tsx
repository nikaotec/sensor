import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { useMqttData } from '../hooks/useMqttData';

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
import { ArrowLeft, Settings as SettingsIcon, AlertTriangle, BatteryCharging, Zap, Wifi, RefreshCw, RotateCw, Download, Sliders, Power, ShieldAlert, Play, Target } from 'lucide-react';

interface DeviceDetailsProps {
    deviceId: string;
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel') => void;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ deviceId, onNavigate }) => {
    const { currentTenant, availableTenants } = useTenant();
    const { currentUser } = useAuth();
    if (!currentTenant) return <div className="flex h-screen items-center justify-center bg-background-dark text-white">Carregando dados...</div>;
    const [remoteSync, setRemoteSync] = useState(true);

    const { devices: firebaseDevices, history, events } = useFirebaseData(currentTenant.id, deviceId);
    const { devices: tenantDevices, publish } = useMqttData('all', currentUser?.role, firebaseDevices);

    const [showConfig, setShowConfig] = useState(false);
    const [configData, setConfigData] = useState({
        temp_max: 25,
        temp_min: 15,
        volt_max: 240,
        volt_min: 190,
        bat_min: 11.5,
        tempo_porta: 60
    });

    const handleCommand = (intencao: string, extraArgs: any = {}) => {
        const targetId = deviceId; // Pegamos do id recebido da URL
        if (!targetId) return;

        const payload = {
            intencao,
            is_admin: currentUser?.role === 'admin' || currentUser?.role === 'manager',
            remoteJid: "dashboard@web",
            source: "dashboard",
            id: targetId,
            user: {
                name: currentUser?.name || 'Usuário Desconhecido',
                email: currentUser?.email || 'Sem Email'
            },
            ...extraArgs
        };

        publish('esp32c3/status/action', JSON.stringify(payload));
        alert(`Comando '${intencao}' enviado com sucesso!`);
    };

    const submitConfig = () => {
        handleCommand('configurar_limites', {
            temp_max: Number(configData.temp_max),
            temp_min: Number(configData.temp_min),
            volt_max: Number(configData.volt_max),
            volt_min: Number(configData.volt_min),
            bat_min: Number(configData.bat_min),
            tempo_porta: Number(configData.tempo_porta)
        });
        setShowConfig(false);
    };

    // Filter by tenant and deviceId
    const device = tenantDevices.find(d => d.id === deviceId) || tenantDevices[0];


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
        if (type.includes('ALERTA')) return <AlertTriangle size={16} />;
        if (type.includes('CONFIG')) return <RefreshCw size={16} />;
        if (type.includes('RELE')) return <Zap size={16} />;
        if (type.includes('PORTA')) return <RefreshCw size={16} />;
        return <RotateCw size={16} />;
    };

    const formatEventTime = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 1) return 'Agora mesmo';
            if (diffMins < 60) return `${diffMins}m atrás`;
            if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`;
            return date.toLocaleDateString('pt-BR');
        } catch (e) {
            return timestamp;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-dark text-slate-100 font-display">
            <Sidebar activeItem="device-list" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative bg-background-dark text-slate-100">
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 bg-[#1A1D17]/80 backdrop-blur-md border-b border-[#2A2E24] sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-[#2A2E24]/50 rounded-xl transition-colors text-slate-400 hover:text-white">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold leading-none text-white tracking-tight">{device?.name || 'Dispositivo'}</h2>
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

                <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-10 py-6 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {/* Left Column: Stats and Overview */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                                <h3 className="text-xs font-medium text-slate-400 uppercase mb-4 tracking-wider font-heading">Monitoramento em Tempo Real</h3>

                                {device?.status === 'offline' && (
                                    <div className="mb-4 bg-[#0F110D] text-slate-400 text-xs px-4 py-3 rounded-xl border border-amber-500/20 flex items-start gap-3 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                        <span className="leading-snug">
                                            <strong className="text-amber-500 font-bold block mb-1">Dispositivo offline!</strong>
                                            Os dados exibidos são do último registro conhecido. O tempo real será retomado quando voltar a ficar online.
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
                                        <div className="bg-[#0F110D] p-4 rounded-2xl border border-[#2A2E24] text-center flex flex-col items-center justify-center">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Máxima</p>
                                            <p className="text-lg font-bold text-[#E63946]">{device?.telemetry?.tempMax !== undefined ? `${device.telemetry.tempMax.toFixed(1)}°C` : '--'}</p>
                                        </div>
                                        <div className="bg-[#0F110D] p-4 rounded-2xl border border-[#2A2E24] text-center flex flex-col items-center justify-center">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Mínima</p>
                                            <p className="text-lg font-bold text-primary">{device?.telemetry?.tempMin !== undefined ? `${device.telemetry.tempMin.toFixed(1)}°C` : '--'}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="flex items-center gap-3 p-4 bg-[#0F110D] rounded-2xl border border-[#2A2E24]">
                                            <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                                <BatteryCharging size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Bateria</p>
                                                <p className="text-md font-bold text-white">{device?.telemetry?.batteryVoltage !== undefined ? `${device.telemetry.batteryVoltage.toFixed(2)}V` : '--'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-[#0F110D] rounded-2xl border border-[#2A2E24]">
                                            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                                                <Zap size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Tensão</p>
                                                <p className="text-md font-bold text-white">{device?.telemetry?.inputVoltage !== undefined ? `${device.telemetry.inputVoltage}V` : '--'}</p>
                                            </div>
                                        </div>
                                    </div>

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
                                        <span className="text-slate-400">Saúde dos Sensores</span>
                                        <span className={`font-mono font-medium ${!device?.telemetry?.saude ? 'text-slate-500' :
                                            (Object.values(device.telemetry.saude).every(v => v === true) ? 'text-emerald-400' : 'text-red-400')
                                            }`}>
                                            {!device?.telemetry?.saude ? '--' :
                                                Object.values(device.telemetry.saude).every(v => v === true) ? '100% Saudável' : 'Falha Parcial'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Modo de Operação</span>
                                        <span className="font-mono text-white font-medium">{device?.telemetry?.modo || '--'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Tempo Ligado (Uptime)</span>
                                        <span className="font-mono text-white font-medium">
                                            {device?.telemetry?.uptime ? `${Math.floor(device.telemetry.uptime / 3600)}h ${Math.floor((device.telemetry.uptime % 3600) / 60)}m` : '--'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Endereço IP</span>
                                        <span className="font-mono text-white font-medium">{device?.telemetry?.ip || '--'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Protocolo de Rede</span>
                                        <span className="font-mono text-white font-medium">{device?.telemetry?.protocolo || '--'}</span>
                                    </div>
                                    <div className="pt-5 mt-5 border-t border-[#2A2E24] flex items-center justify-between">
                                        <span className="text-sm font-bold text-white">Monitoramento Ativo</span>
                                        <button
                                            onClick={() => setRemoteSync(!remoteSync)}
                                            className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${remoteSync ? 'bg-primary' : 'bg-[#0F110D] border-[#2A2E24]'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${remoteSync ? 'translate-x-6' : 'translate-x-0'}`}></span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Column: Control Panel */}
                            <div className="lg:col-span-1 space-y-6">
                                {/* PAINEL DE CONTROLE (NOVO) */}
                                <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider font-heading flex items-center gap-2">
                                            <Sliders size={14} /> Painel de Controle Remoto
                                        </h3>
                                        <button
                                            onClick={() => setShowConfig(!showConfig)}
                                            className="text-xs text-primary hover:text-primary/80 transition-colors underline"
                                        >
                                            Parâmetros
                                        </button>
                                    </div>

                                    {showConfig ? (
                                        <div className="bg-[#0F110D] p-4 rounded-xl border border-[#2A2E24] space-y-4 mb-4">
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                    <label className="text-slate-500 mb-1 block">T. Max (°C)</label>
                                                    <input type="number" value={configData.temp_max} onChange={e => setConfigData({ ...configData, temp_max: e.target.valueAsNumber })} className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white" />
                                                </div>
                                                <div>
                                                    <label className="text-slate-500 mb-1 block">T. Min (°C)</label>
                                                    <input type="number" value={configData.temp_min} onChange={e => setConfigData({ ...configData, temp_min: e.target.valueAsNumber })} className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white" />
                                                </div>
                                                <div>
                                                    <label className="text-slate-500 mb-1 block">V. Max (V)</label>
                                                    <input type="number" value={configData.volt_max} onChange={e => setConfigData({ ...configData, volt_max: e.target.valueAsNumber })} className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white" />
                                                </div>
                                                <div>
                                                    <label className="text-slate-500 mb-1 block">V. Min (V)</label>
                                                    <input type="number" value={configData.volt_min} onChange={e => setConfigData({ ...configData, volt_min: e.target.valueAsNumber })} className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white" />
                                                </div>
                                                <div>
                                                    <label className="text-slate-500 mb-1 block">Bat. Min (V)</label>
                                                    <input type="number" value={configData.bat_min} onChange={e => setConfigData({ ...configData, bat_min: e.target.valueAsNumber })} className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white" />
                                                </div>
                                                <div>
                                                    <label className="text-slate-500 mb-1 block">T. Porta (s)</label>
                                                    <input type="number" value={configData.tempo_porta} onChange={e => setConfigData({ ...configData, tempo_porta: e.target.valueAsNumber })} className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white" />
                                                </div>
                                            </div>
                                            <button onClick={submitConfig} className="w-full py-2 bg-primary text-background-dark font-bold rounded-lg text-xs hover:bg-primary/90 transition-colors">
                                                Salvar Limites
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleCommand('ligar_rele')}
                                                disabled={device?.telemetry?.rele === true}
                                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300 ${device?.telemetry?.rele === true
                                                    ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-default'
                                                    : 'bg-[#0F110D] border border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-500 cursor-pointer'
                                                    }`}
                                            >
                                                <Power size={18} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                                    {device?.telemetry?.rele === true ? 'Relé Ligado' : 'Ligar Relé'}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => handleCommand('desligar_rele')}
                                                disabled={device?.telemetry?.rele === false}
                                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300 ${device?.telemetry?.rele === false
                                                    ? 'bg-red-500/20 border border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] cursor-default'
                                                    : 'bg-[#0F110D] border border-red-500/20 hover:bg-red-500/10 text-red-500 cursor-pointer'
                                                    }`}
                                            >
                                                <Power size={18} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                                    {device?.telemetry?.rele === false ? 'Relé Desligado' : 'Desligar Relé'}
                                                </span>
                                            </button>

                                            <button
                                                onClick={() => handleCommand('modo_manutencao')}
                                                disabled={String(device?.telemetry?.modo || '').toUpperCase().includes('MANUT')}
                                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300 ${String(device?.telemetry?.modo || '').toUpperCase().includes('MANUT')
                                                    ? 'bg-amber-500/20 border border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-default'
                                                    : 'bg-[#0F110D] border border-amber-500/20 hover:bg-amber-500/10 text-amber-500 cursor-pointer'
                                                    }`}
                                            >
                                                <SettingsIcon size={18} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-center">Modo<br />Manutenção</span>
                                            </button>
                                            <button
                                                onClick={() => handleCommand('modo_operacional')}
                                                disabled={String(device?.telemetry?.modo || '').toUpperCase().includes('OPER') || String(device?.telemetry?.modo || '').toUpperCase().includes('NORMAL')}
                                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300 ${String(device?.telemetry?.modo || '').toUpperCase().includes('OPER') || String(device?.telemetry?.modo || '').toUpperCase().includes('NORMAL')
                                                    ? 'bg-primary/20 border border-primary text-primary shadow-[0_0_15px_var(--color-primary-rgb)] cursor-default'
                                                    : 'bg-[#0F110D] border border-primary/20 hover:bg-primary/10 text-primary cursor-pointer'
                                                    }`}
                                            >
                                                <Play size={18} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-center">Modo<br />Operacional</span>
                                            </button>

                                            <button
                                                onClick={() => handleCommand('silenciar_alarme')}
                                                className="col-span-2 flex flex-row items-center justify-center gap-3 bg-[#0F110D] border border-slate-600/30 hover:bg-slate-600/20 text-slate-300 p-3 rounded-xl transition-colors mt-1"
                                            >
                                                <ShieldAlert size={16} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Silenciar Alarme</span>
                                            </button>

                                            <div className="col-span-2 pt-3 border-t border-[#2A2E24] mt-2 grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => {
                                                        const tensao = prompt("Digite o valor para calibrar a tensão principal (V):");
                                                        if (tensao) handleCommand('calibrar_tensao', { nova_tensao: parseFloat(tensao) });
                                                    }}
                                                    className="flex flex-col items-center justify-center gap-1 bg-[#0F110D] border border-[#2A2E24] hover:bg-slate-800/50 text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
                                                >
                                                    <Target size={14} />
                                                    <span className="text-[9px] font-bold uppercase tracking-wider">Calibrar AC</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const tensao = prompt("Digite o valor para calibrar a bateria (V):");
                                                        if (tensao) handleCommand('calibrar_bateria', { nova_tensao: parseFloat(tensao) });
                                                    }}
                                                    className="flex flex-col items-center justify-center gap-1 bg-[#0F110D] border border-[#2A2E24] hover:bg-slate-800/50 text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
                                                >
                                                    <Target size={14} />
                                                    <span className="text-[9px] font-bold uppercase tracking-wider">Calibrar Bat</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Historical Charts */}
                            <div className="lg:col-span-1 xl:col-span-2 space-y-6">
                                <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-lg font-bold text-white">Histórico de Temperatura (24h)</h3>
                                        <div className="flex gap-2">
                                            {device?.status === 'online' ? (
                                                <button className="text-[10px] font-bold px-3 py-1.5 bg-primary text-background-dark rounded-lg uppercase tracking-widest shadow-lg shadow-primary/20">Ao Vivo</button>
                                            ) : (
                                                <span className="text-[10px] font-bold px-3 py-1.5 bg-slate-500/10 border border-slate-500/20 text-slate-400 rounded-lg uppercase tracking-widest">Último Conhecido</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={history || []}>
                                                <defs>
                                                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2E24" />
                                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                                                <YAxis
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                                    dx={-10}
                                                    domain={[
                                                        (dataMin: number) => Math.floor(Math.min(dataMin, device?.config?.minTempInfo ?? dataMin) - 2),
                                                        (dataMax: number) => Math.ceil(Math.max(dataMax, device?.config?.maxTempInfo ?? dataMax) + 2)
                                                    ]}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0F110D', border: '1px solid #2A2E24', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                                />
                                                {device?.config?.minTempInfo !== undefined && (
                                                    <ReferenceLine
                                                        y={device.config.minTempInfo}
                                                        stroke="#ef4444"
                                                        strokeDasharray="4 4"
                                                        label={{ position: 'insideBottomRight', value: 'Min', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }}
                                                    />
                                                )}
                                                {device?.config?.maxTempInfo !== undefined && (
                                                    <ReferenceLine
                                                        y={device.config.maxTempInfo}
                                                        stroke="#ef4444"
                                                        strokeDasharray="4 4"
                                                        label={{ position: 'insideTopRight', value: 'Max', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }}
                                                    />
                                                )}
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="var(--color-primary)"
                                                    strokeWidth={3}
                                                    fillOpacity={1}
                                                    fill="url(#colorTemp)"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                                        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-5 font-heading">Eventos Recentes</h4>
                                        <div className="space-y-4">
                                            {events && events.length > 0 ? (
                                                events.map((e, i) => (
                                                    <div key={i} className="flex gap-4 p-3 rounded-xl border border-[#2A2E24] bg-[#0F110D] hover:border-primary/30 transition-colors group cursor-pointer">
                                                        <div className="text-slate-500 group-hover:text-primary transition-colors mt-0.5">
                                                            {getEventIcon(e.type)}
                                                        </div>
                                                        <div>
                                                            <p className="text-white text-sm font-medium leading-snug">
                                                                {(() => {
                                                                    const txt = e.msg || e.message || 'Evento desconhecido';
                                                                    return txt.charAt(0).toUpperCase() + txt.slice(1);
                                                                })()}
                                                            </p>
                                                            <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-widest font-bold">{formatEventTime(e.timestamp)}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-4 text-center text-slate-500 text-xs italic">Nenhum evento registrado recentemente.</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg flex flex-col justify-center items-center text-center">
                                        <div className="size-16 bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center text-primary mb-5 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
                                            <Download size={28} />
                                        </div>
                                        <h4 className="text-base font-bold mb-2 text-white">Relatório Completo</h4>
                                        <p className="text-xs text-slate-400 mb-6 max-w-[200px] leading-relaxed">Baixe o histórico completo em CSV para este dispositivo.</p>
                                        <button className="w-full py-3 bg-[#0F110D] border border-[#2A2E24] rounded-xl text-xs font-bold text-white uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-colors">
                                            EXPORTAR DADOS
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
            </main>
        </div>
    );
};

export default DeviceDetails;
