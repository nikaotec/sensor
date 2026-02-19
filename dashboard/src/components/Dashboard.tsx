
import React from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useMqtt } from '../hooks/useMqtt';
import { alerts, metrics } from '../data/mockData';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface DashboardProps {
    onDeviceClick: () => void;
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details') => void;
}

const colorMap = {
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-500 bg-red-500/10 border-red-500/20',
    primary: 'text-primary bg-primary/10 border-primary/20',
};

const Dashboard: React.FC<DashboardProps> = ({ onDeviceClick, onNavigate }) => {
    const { currentTenant, currentUser } = useTenant();

    const { devices: tenantDevices } = useMqtt(currentTenant.id);
    const tenantAlerts = alerts.filter(a => a.tenantId === currentTenant.id);
    const tenantMetrics = metrics[currentTenant.id] || metrics['t1'];

    const onlineCount = tenantDevices.filter(d => d.status === 'online').length;
    const criticalCount = tenantAlerts.filter(a => a.severity === 'critical' && a.status === 'New').length;

    const statusCards = [
        { title: 'Sensores Online', value: String(onlineCount), change: 'Estável', icon: 'sensors', trend: 'neutral', color: 'emerald' },
        { title: 'Alertas Críticos', value: String(criticalCount), change: criticalCount > 0 ? `+${criticalCount}` : '0', icon: 'warning', trend: criticalCount > 0 ? 'down' : 'neutral', color: criticalCount > 0 ? 'red' : 'emerald' },
        { title: 'Total Dispositivos', value: String(tenantDevices.length), change: 'Total', icon: 'bolt', trend: 'neutral', color: 'primary' },
        { title: 'Plano Atual', value: currentTenant.plan.toUpperCase(), change: 'Ativo', icon: 'dns', trend: 'neutral', color: 'primary' },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeItem="dashboard" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 flex items-center justify-between px-8 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-border">
                    <div className="flex items-center gap-4 flex-1 max-w-xl">
                        <div className="relative w-full">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                                type="text"
                                className="w-full bg-slate-100 dark:bg-slate-card border-none rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-primary placeholder-slate-500"
                                placeholder={`Buscar em ${currentTenant.name}...`}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border-2 border-background-dark"></span>
                        </button>
                        <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-border">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold leading-none">{currentUser.name}</p>
                                <p className="text-xs text-slate-500 mt-1">{currentTenant.name}</p>
                            </div>
                            <img
                                className="size-10 rounded-full border-2 border-primary"
                                src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser.name}`}
                                alt="User profile"
                            />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {statusCards.map((card, index) => (
                            <div key={index} className="bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-lg ${(colorMap as any)[card.color]}`}>
                                        <span className="material-symbols-outlined">{card.icon}</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${card.trend === 'up' ? 'text-emerald-500 bg-emerald-500/10' : card.trend === 'down' ? 'text-red-500 bg-red-500/10' : 'text-slate-500 bg-slate-500/10'}`}>
                                        {card.change}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{card.title}</p>
                                <h3 className="text-2xl font-bold">{card.value}</h3>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-bold">Consumo de Energia (kW)</h3>
                                    <p className="text-sm text-slate-500">Dados agregados de {tenantDevices.length} dispositivos</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={tenantMetrics.historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                        <XAxis
                                            dataKey="time"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                                            labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="var(--color-primary)"
                                            fillOpacity={1}
                                            fill="url(#colorValue)"
                                            strokeWidth={3}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-card rounded-xl border border-slate-200 dark:border-slate-border shadow-sm flex flex-col">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-border">
                                <h3 className="text-lg font-bold">Alertas Recentes</h3>
                                <p className="text-sm text-slate-500">Eventos de {currentTenant.name}</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {tenantAlerts.length === 0 ? (
                                    <p className="text-center text-slate-500 text-sm py-4">Nenhum alerta recente</p>
                                ) : (
                                    tenantAlerts.map((alert) => (
                                        <div key={alert.id} className="p-3 bg-slate-50 dark:bg-slate-card border border-slate-200 dark:border-slate-border rounded-lg flex gap-3 items-start hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onNavigate('alerts')}>
                                            <div className={`mt-0.5 size-2 rounded-full flex-shrink-0 ${alert.severity === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-amber-500'}`}></div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{alert.message}</p>
                                                <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">{alert.device} • {alert.time}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button onClick={() => onNavigate('alerts')} className="p-4 text-center text-xs font-bold text-primary hover:bg-primary/5 transition-colors border-t border-slate-200 dark:border-slate-border">
                                VER TODOS OS ALERTAS
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-card rounded-xl border border-slate-200 dark:border-slate-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-border flex items-center justify-between">
                            <h3 className="text-lg font-bold">Dispositivos Ativos</h3>
                            <button onClick={onDeviceClick} className="text-sm text-primary font-bold hover:underline">Ver todos</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium">Dispositivo</th>
                                        <th className="px-6 py-4 font-medium">Localização</th>
                                        <th className="px-6 py-4 font-medium">Temp</th>
                                        <th className="px-6 py-4 font-medium">Bateria/Tensão</th>
                                        <th className="px-6 py-4 font-medium text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {tenantDevices.slice(0, 4).map((device) => (
                                        <tr key={device.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`size-2 rounded-full ${device.status === 'online' ? 'bg-emerald-500' : device.status === 'warning' ? 'bg-amber-500' : 'bg-slate-500'}`}></span>
                                                    <span className="capitalize">{device.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold">{device.name}</td>
                                            <td className="px-6 py-4 text-slate-500">{device.location}</td>
                                            <td className="px-6 py-4 font-mono">{device.telemetry.temp}°C</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-amber-500">{device.telemetry.batteryVoltage}V</span>
                                                    <span className="text-slate-500">|</span>
                                                    <span className="text-xs font-bold text-emerald-500">{device.telemetry.inputVoltage}V</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={onDeviceClick} className="p-1.5 text-slate-500 hover:text-primary transition-colors">
                                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
