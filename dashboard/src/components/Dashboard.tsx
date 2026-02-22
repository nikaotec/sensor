
import React from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useMqtt } from '../hooks/useMqtt';
import { alerts } from '../data/mockData';
import {
    Thermometer,
    Droplets,
    Zap,
    Battery,
    Wifi,
    DoorClosed,
    DoorOpen,
    AlertTriangle,
    Search,
    Bell,
    ArrowRight,
    Activity
} from 'lucide-react';


interface DashboardProps {
    onDeviceClick: () => void;
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onDeviceClick, onNavigate }) => {
    const { currentTenant, currentUser } = useTenant();
    const { devices: tenantDevices } = useMqtt(currentTenant.id);
    const tenantAlerts = alerts.filter(a => a.tenantId === currentTenant.id);

    const onlineCount = tenantDevices.filter(d => d.status === 'online').length;
    const criticalCount = tenantAlerts.filter(a => a.severity === 'critical' && a.status === 'New').length;



    const getSignalIcon = (rssi?: number) => {
        if (!rssi) return <Wifi size={16} className="text-slate-500" />;
        if (rssi > -60) return <Wifi size={16} className="text-emerald-500" />;
        if (rssi > -80) return <Wifi size={16} className="text-amber-500" />;
        return <Wifi size={16} className="text-red-500" />;
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
            <Sidebar activeItem="dashboard" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header with Title and User Info */}
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 bg-background-light/50 dark:bg-background-dark/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-border sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold dark:text-white">Dashboard</h2>
                        <div className="h-6 w-px bg-slate-border/50 mx-2"></div>
                        <div className="hidden lg:flex items-center bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 w-96 group focus-within:border-primary/50 transition-all">
                            <Search size={18} className="text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input type="text" placeholder="Procurar dispositivos ou registros..." className="bg-transparent border-none outline-none text-sm px-3 w-full text-slate-600 dark:text-slate-300 placeholder:text-slate-500" />
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-slate-400 hover:text-primary transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 size-2 bg-cta rounded-full border-2 border-background-dark"></span>
                        </button>
                        <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-border">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold leading-none">{currentUser.name}</p>
                                <p className="text-[10px] text-primary uppercase tracking-wider font-bold mt-1.5">{currentTenant.name}</p>
                            </div>
                            <img
                                className="size-10 rounded-full border-2 border-primary/30"
                                src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser.name}`}
                                alt="Profile"
                            />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white dark:bg-slate-card p-6 rounded-2xl border border-slate-200 dark:border-slate-border shadow-sm hover:border-primary/50 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                                    <Activity size={24} />
                                </div>
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full text-emerald-500 bg-emerald-500/10">LIVE</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Sensores Online</p>
                            <h3 className="text-2xl font-bold">{onlineCount} / {tenantDevices.length}</h3>
                        </div>

                        <div className="bg-white dark:bg-slate-card p-6 rounded-2xl border border-slate-200 dark:border-slate-border shadow-sm hover:border-cta/50 transition-colors group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 rounded-xl bg-cta/10 text-cta group-hover:scale-110 transition-transform">
                                    <AlertTriangle size={24} />
                                </div>
                                {criticalCount > 0 && <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white bg-cta animate-pulse">URGENTE</span>}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Alertas Ativos</p>
                            <h3 className="text-2xl font-bold">{criticalCount}</h3>
                        </div>

                        <div className="bg-white dark:bg-slate-card p-6 rounded-2xl border border-slate-200 dark:border-slate-border shadow-sm hover:border-primary/50 transition-colors group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                    <Thermometer size={24} />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Média Temperatura</p>
                            <h3 className="text-2xl font-bold">{(tenantDevices[0]?.telemetry.temp || 0).toFixed(1)}°C</h3>
                        </div>

                        <div className="bg-white dark:bg-slate-card p-6 rounded-2xl border border-slate-200 dark:border-slate-border shadow-sm hover:border-primary/50 transition-colors group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                                    <Droplets size={24} />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Umidade Média</p>
                            <h3 className="text-2xl font-bold">{(tenantDevices[0]?.telemetry.humidity || 0).toFixed(0)}%</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Recent Alerts (Full Width now that Chart is gone) */}
                        <div className="lg:col-span-3 bg-white dark:bg-slate-card rounded-2xl border border-slate-200 dark:border-slate-border shadow-sm flex flex-col h-full">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-border">
                                <h3 className="text-lg font-bold">Status de Eventos</h3>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Conectividade e alertas</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                {tenantDevices.map(device => (
                                    <div key={device.id} className="p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-border rounded-xl flex items-center justify-between hover:border-primary/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            {getSignalIcon(device.telemetry.signal)}
                                            <div>
                                                <p className="text-xs font-bold">{device.name}</p>
                                                <p className="text-[10px] text-slate-500 mt-0.5">{device.telemetry.signal ? `${device.telemetry.signal} dBm` : 'Sem sinal'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {device.telemetry.doorOpen !== undefined && (
                                                <div className={`p-1.5 rounded-lg flex items-center gap-2 ${device.telemetry.doorOpen ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                    {device.telemetry.doorOpen ? <DoorOpen size={16} /> : <DoorClosed size={16} />}
                                                    <span className="text-[10px] font-bold uppercase">{device.telemetry.doorOpen ? 'Aberta' : 'Fechada'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => onNavigate('alerts')} className="p-4 text-center text-[10px] font-bold text-primary hover:bg-primary/5 transition-colors border-t border-slate-200 dark:border-slate-border tracking-widest">
                                VER CENTRAL DE ALERTAS
                            </button>
                        </div>
                    </div>

                    {/* Active Devices Table */}
                    <div className="bg-white dark:bg-slate-card rounded-2xl border border-slate-200 dark:border-slate-border shadow-sm overflow-hidden mb-8">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-border flex items-center justify-between">
                            <h3 className="text-lg font-bold uppercase tracking-tight">Dispositivos Ativos</h3>
                            <button onClick={onDeviceClick} className="text-[10px] bg-primary text-white font-bold py-1.5 px-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform">VER TODOS</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50">
                                    <tr>
                                        <th className="px-6 py-4 font-bold border-b border-slate-border/50">Status</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-border/50">Sensor / Local</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-border/50">🌡️ Temp</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-border/50">💧 Umidade</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-border/50">🔋 Energia</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-border/50">📡 Sinal</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-border/50 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {tenantDevices.slice(0, 5).map((device) => (
                                        <tr key={device.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group cursor-pointer" onClick={() => navigateToDeviceDetails()}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`size-2 rounded-full ring-4 ring-offset-2 ring-transparent ${device.status === 'online' ? 'bg-emerald-500 ring-emerald-500/10' : 'bg-cta ring-cta/10 shadow-[0_0_12px_rgba(249,115,22,0.4)]'}`}></span>
                                                    <span className="text-[10px] font-bold uppercase">{device.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800 dark:text-slate-100">{device.name}</p>
                                                <p className="text-[10px] text-slate-500 mt-1">{device.location}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-base font-bold text-primary">{(device.telemetry.temp || 0).toFixed(1)}°C</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{(device.telemetry.humidity || 0).toFixed(0)}%</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1"><Zap size={10} /> Rede</span>
                                                        <span className="text-xs font-bold text-emerald-500">{device.telemetry.inputVoltage || 0}V</span>
                                                    </div>
                                                    <div className="h-6 w-px bg-slate-border/50"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1"><Battery size={10} /> Bat</span>
                                                        <span className="text-xs font-bold text-amber-500">{device.telemetry.batteryVoltage || 0}V</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {getSignalIcon(device.telemetry.signal)}
                                                    <span className="text-xs font-medium text-slate-500">{device.telemetry.signal || '--'} dBm</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                                                    <ArrowRight size={18} />
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

    function navigateToDeviceDetails() {
        onNavigate('device-details');
    }
};

export default Dashboard;
