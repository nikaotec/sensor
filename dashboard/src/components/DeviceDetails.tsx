import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { metrics } from '../data/mockData';
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
import { ArrowLeft, Settings as SettingsIcon, AlertTriangle, BatteryCharging, Zap, Wifi, RefreshCw, RotateCw, Download } from 'lucide-react';

interface DeviceDetailsProps {
    deviceId: string;
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details') => void;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ deviceId, onNavigate }) => {
    const { currentTenant } = useTenant();
    if (!currentTenant) return <div className="flex h-screen items-center justify-center bg-background-dark text-white">Carregando dados...</div>;
    const [remoteSync, setRemoteSync] = useState(true);

    const { devices: tenantDevices, history } = useFirebaseData(currentTenant.id);

    // Filter by tenant and deviceId
    const device = tenantDevices.find(d => d.id === deviceId) || tenantDevices[0];
    const tenantMetrics = metrics[currentTenant.id] || metrics['t1'];

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

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeItem="device-list" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative bg-background-light text-text-dark">
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-[#2A2E24]/50 rounded-xl transition-colors text-white">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold leading-none text-white tracking-tight">{device?.name || 'Device'}</h2>
                            <p className="text-xs text-slate-400 mt-1">{device?.location} • ID: {device?.id}</p>
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                                                <h4 className="text-4xl font-black text-primary tracking-tight">{(device?.telemetry?.temp || 0).toFixed(1)}°C</h4>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase border ${getStatusStyle(device?.status || 'offline')}`}>{getStatusLabel(device?.status || 'offline')}</span>
                                            </div>
                                        </div>
                                        <div className="bg-[#0F110D] p-4 rounded-2xl border border-[#2A2E24] text-center flex flex-col items-center justify-center">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Máxima</p>
                                            <p className="text-lg font-bold text-[#E63946]">{(device?.telemetry?.tempMax || 0).toFixed(1)}°C</p>
                                        </div>
                                        <div className="bg-[#0F110D] p-4 rounded-2xl border border-[#2A2E24] text-center flex flex-col items-center justify-center">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Mínima</p>
                                            <p className="text-lg font-bold text-primary">{(device?.telemetry?.tempMin || 0).toFixed(1)}°C</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="flex items-center gap-3 p-4 bg-[#0F110D] rounded-2xl border border-[#2A2E24]">
                                            <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                                <BatteryCharging size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Bateria</p>
                                                <p className="text-md font-bold text-white">{(device?.telemetry?.batteryVoltage || 0).toFixed(2)}V</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-[#0F110D] rounded-2xl border border-[#2A2E24]">
                                            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                                                <Zap size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Tensão</p>
                                                <p className="text-md font-bold text-white">{device?.telemetry?.inputVoltage || 0}V</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-2">
                                        <div className="flex items-center gap-2 text-slate-500 font-bold tracking-wide">
                                            <Wifi size={16} />
                                            <span>Sinal RSSI: {device?.telemetry?.signal || '--'} dBm</span>
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
                                        <span className="text-slate-400">Versão FW</span>
                                        <span className="font-mono text-white font-medium">v2.4.1-stable</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Endereço IP</span>
                                        <span className="font-mono text-white font-medium">192.168.1.145</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Protocolo</span>
                                        <span className="font-mono text-white font-medium">MQTT / TLS 1.3</span>
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
                        </div>

                        {/* Right Column: Historical Charts */}
                        <div className="lg:col-span-2 space-y-6">
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
                                        <AreaChart data={history && history.length > 0 ? history : tenantMetrics.historicalData}>
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
                                        {[
                                            { msg: 'Configuração atualizada remotamente', time: '1h atrás', icon: <RefreshCw size={16} /> },
                                            { msg: 'Conexão WiFi restabelecida', time: '4h atrás', icon: <Wifi size={16} /> },
                                            { msg: 'Sistema reiniciado por Watchdog', time: 'Ontem', icon: <RotateCw size={16} /> },
                                        ].map((e, i) => (
                                            <div key={i} className="flex gap-4 p-3 rounded-xl border border-[#2A2E24] bg-[#0F110D] hover:border-primary/30 transition-colors group cursor-pointer">
                                                <div className="text-slate-500 group-hover:text-primary transition-colors mt-0.5">{e.icon}</div>
                                                <div>
                                                    <p className="text-white text-sm font-medium leading-snug">{e.msg}</p>
                                                    <p className="text-slate-400 text-[10px] mt-1 uppercase tracking-widest font-bold">{e.time}</p>
                                                </div>
                                            </div>
                                        ))}
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
