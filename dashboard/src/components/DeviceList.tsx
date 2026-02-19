
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useMqtt } from '../hooks/useMqtt';

interface DeviceListProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details') => void;
    onDeviceClick: (deviceId: string) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ onNavigate, onDeviceClick }) => {
    const { currentTenant } = useTenant();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'warning'>('all');

    // Filter by tenant using useMqtt
    const { devices: tenantDevices } = useMqtt(currentTenant.id);

    // Filter by search and status
    const filteredDevices = tenantDevices.filter(device => {
        const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'online': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'offline': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-slate-700 text-slate-400';
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeItem="device-list" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 flex items-center justify-between px-8 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-border">
                    <h2 className="text-xl font-bold">Dispositivos de {currentTenant.name}</h2>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-slate-100 dark:bg-slate-card border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary w-64"
                                placeholder="Buscar dispositivo ou local..."
                            />
                        </div>
                        <div className="flex bg-slate-800 rounded-lg p-1">
                            {['all', 'online', 'warning', 'offline'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f as any)}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${statusFilter === f ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    {f.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-white dark:bg-slate-card rounded-xl border border-slate-200 dark:border-slate-border shadow-sm overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium">Nome / Tipo</th>
                                        <th className="px-6 py-4 font-medium">Localização</th>
                                        <th className="px-6 py-4 font-medium">Visto em</th>
                                        <th className="px-6 py-4 font-medium">Telemetria</th>
                                        <th className="px-6 py-4 font-medium text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {filteredDevices.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                Nenhum dispositivo encontrado para os filtros aplicados.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDevices.map((device) => (
                                            <tr key={device.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusStyle(device.status)}`}>
                                                        {device.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-200">{device.name}</span>
                                                        <span className="text-xs text-slate-500">{device.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400">
                                                    {device.location}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">
                                                    {device.lastSeen}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-3">
                                                        {device.telemetry.temp !== undefined && (
                                                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                                                                <span className="material-symbols-outlined text-[14px] text-primary">thermostat</span>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{device.telemetry.temp}°C</span>
                                                            </div>
                                                        )}
                                                        {device.telemetry.inputVoltage !== undefined && device.telemetry.inputVoltage > 0 && (
                                                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                                                                <span className="material-symbols-outlined text-[14px] text-emerald-500">bolt</span>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{device.telemetry.inputVoltage}V</span>
                                                            </div>
                                                        )}
                                                        {device.telemetry.batteryVoltage !== undefined && (
                                                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                                                                <span className="material-symbols-outlined text-[14px] text-amber-500">battery_charging_full</span>
                                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{device.telemetry.batteryVoltage}V</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => onDeviceClick(device.id)}
                                                        className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DeviceList;
