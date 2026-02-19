
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useMqtt } from '../hooks/useMqtt';
import { metrics } from '../data/mockData';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';

interface DeviceDetailsProps {
    deviceId: string;
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details') => void;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ deviceId, onNavigate }) => {
    const { currentTenant } = useTenant();
    const [remoteSync, setRemoteSync] = useState(true);

    const { devices: tenantDevices } = useMqtt(currentTenant.id);

    // Filter by tenant and deviceId
    const device = tenantDevices.find(d => d.id === deviceId) || tenantDevices[0];
    const tenantMetrics = metrics[currentTenant.id] || metrics['t1'];

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeItem="device-list" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 flex items-center justify-between px-8 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-border">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-card rounded-lg transition-colors">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h2 className="text-xl font-bold leading-none">{device.name}</h2>
                            <p className="text-xs text-slate-500 mt-1">{device.location} • ID: {device.id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${device.status === 'online' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                            {device.status}
                        </span>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-border mx-2"></div>
                        <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">settings</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Stats and Overview */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm">
                                <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider">Monitoramento em Tempo Real</h3>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 flex items-end justify-between bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1 font-medium">Temperatura Atual</p>
                                                <h4 className="text-4xl font-black text-primary">{device.telemetry.temp?.toFixed(1)}°C</h4>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-1 rounded uppercase">Estável</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/5 text-center">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Máxima</p>
                                            <p className="text-lg font-bold text-rose-500">{device.telemetry.tempMax?.toFixed(1)}°C</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/5 text-center">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Mínima</p>
                                            <p className="text-lg font-bold text-blue-500">{device.telemetry.tempMin?.toFixed(1)}°C</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                                            <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                <span className="material-symbols-outlined text-xl">battery_charging_full</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Bateria</p>
                                                <p className="text-md font-bold text-slate-200">{device.telemetry.batteryVoltage?.toFixed(2)}V</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                                            <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                <span className="material-symbols-outlined text-xl">bolt</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Tensão</p>
                                                <p className="text-md font-bold text-slate-200">{device.telemetry.inputVoltage}V</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-2">
                                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                                            <span className="material-symbols-outlined text-sm">signal_cellular_alt</span>
                                            <span>Sinal RSSI: {device.telemetry.signal} dBm</span>
                                        </div>
                                        <span className="text-emerald-500 font-bold">Excelente</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm">
                                <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider">Informações do Sistema</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Versão FW</span>
                                        <span className="font-mono">v2.4.1-stable</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Endereço IP</span>
                                        <span className="font-mono">192.168.1.145</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Protocolo</span>
                                        <span className="font-mono">MQTT / TLS 1.3</span>
                                    </div>
                                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <span className="text-sm font-bold">Monitoramento Ativo</span>
                                        <button
                                            onClick={() => setRemoteSync(!remoteSync)}
                                            className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${remoteSync ? 'bg-primary' : 'bg-slate-700'}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background-dark shadow ring-0 transition duration-200 ease-in-out ${remoteSync ? 'translate-x-5' : 'translate-x-0'}`}></span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Historical Charts */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-lg font-bold">Histórico de Temperatura (24h)</h3>
                                    <div className="flex gap-2">
                                        <button className="text-[10px] font-bold px-2 py-1 bg-primary text-background-dark rounded uppercase">Ao Vivo</button>
                                    </div>
                                </div>
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={tenantMetrics.historicalData}>
                                            <defs>
                                                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} domain={['dataMin - 5', 'dataMax + 5']} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                                itemStyle={{ color: '#fff', fontSize: '12px' }}
                                            />
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
                                <div className="bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Eventos Recentes</h4>
                                    <div className="space-y-3">
                                        {[
                                            { msg: 'Configuração atualizada remotamente', time: '1h atrás', icon: 'sync' },
                                            { msg: 'Conexão WiFi restabelecida', time: '4h atrás', icon: 'wifi' },
                                            { msg: 'Sistema reiniciado por Watchdog', time: 'Ontem', icon: 'restart_alt' },
                                        ].map((e, i) => (
                                            <div key={i} className="flex gap-3 text-xs p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                                                <span className="material-symbols-outlined text-[16px] text-slate-500">{e.icon}</span>
                                                <div>
                                                    <p className="text-slate-200 font-medium">{e.msg}</p>
                                                    <p className="text-slate-500 text-[10px] mt-0.5">{e.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm flex flex-col justify-center items-center text-center">
                                    <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                                        <span className="material-symbols-outlined text-3xl">download</span>
                                    </div>
                                    <h4 className="text-sm font-bold mb-1">Relatório Completo</h4>
                                    <p className="text-xs text-slate-500 mb-4">Baixe o histórico completo em CSV para este dispositivo.</p>
                                    <button className="w-full py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">EXPORTAR DADOS</button>
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
