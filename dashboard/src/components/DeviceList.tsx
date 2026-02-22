
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
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredDevices.length === 0 ? (
                                    <div className="col-span-1 md:col-span-2 xl:col-span-3 py-12 text-center text-slate-500">
                                        Nenhum dispositivo encontrado para os filtros aplicados.
                                    </div>
                                ) : (
                                    filteredDevices.map((device) => {
                                        const getStatusLabel = (status: string) => {
                                            switch (status) {
                                                case 'online': return 'ESTÁVEL';
                                                case 'warning': return 'ALERTA';
                                                case 'error': return 'ERRO';
                                                case 'offline': return 'OFFLINE';
                                                default: return status.toUpperCase();
                                            }
                                        };

                                        const getSignalQuality = (rssi?: number) => {
                                            if (!rssi) return 'Desconhecido';
                                            if (rssi > -65) return 'Excelente';
                                            if (rssi > -75) return 'Bom';
                                            if (rssi > -85) return 'Regular';
                                            return 'Fraco';
                                        };

                                        return (
                                            <div
                                                key={device.id}
                                                onClick={() => onDeviceClick(device.id)}
                                                className="bg-white dark:bg-slate-card rounded-2xl border border-slate-200 dark:border-slate-border shadow-sm p-6 relative flex flex-col cursor-pointer hover:shadow-md transition-shadow group"
                                            >
                                                <div className="mb-4 flex flex-col">
                                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-loose">Monitoramento em Tempo Real</h3>
                                                    <div className="flex justify-between items-center mt-2">
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg group-hover:text-primary transition-colors">{device.name}</h4>
                                                    </div>
                                                </div>

                                                {device.status === 'offline' && (
                                                    <div className="mb-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs px-3 py-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                                                        <span className="material-symbols-outlined text-[18px] text-amber-500">warning</span>
                                                        <span className="leading-snug">
                                                            <strong>Dispositivo offline.</strong><br />
                                                            Esse card exibe o último momento conhecido. Os dados voltarão ao tempo real quando o dispositivo reconectar.
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-4 flex items-center justify-between border border-slate-100 dark:border-slate-800">
                                                    <div>
                                                        <div className="text-xs text-slate-500 font-medium mb-1">Temperatura Atual</div>
                                                        <div className="text-4xl font-light text-primary tracking-tight">
                                                            {device.telemetry.temp !== undefined ? `${device.telemetry.temp.toFixed(1)}°C` : '--'}
                                                        </div>
                                                    </div>
                                                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusStyle('online')} ${device.status === 'offline' ? 'opacity-50' : ''}`}>
                                                        {getStatusLabel(device.status)}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Máxima</div>
                                                        <div className="text-lg font-bold text-rose-500">
                                                            {device.telemetry.tempMax !== undefined ? `${device.telemetry.tempMax.toFixed(1)}°C` : '--'}
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Mínima</div>
                                                        <div className="text-lg font-bold text-indigo-500">
                                                            {device.telemetry.tempMin !== undefined ? `${device.telemetry.tempMin.toFixed(1)}°C` : '--'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-amber-100/50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-[16px]">battery_charging_full</span>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bateria</div>
                                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                                {device.telemetry.batteryVoltage !== undefined ? `${device.telemetry.batteryVoltage.toFixed(2)}V` : '--'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-[16px]">bolt</span>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tensão</div>
                                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                                {device.telemetry.inputVoltage !== undefined ? `${device.telemetry.inputVoltage}V` : '--'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <span className="material-symbols-outlined text-[16px]">signal_cellular_alt</span>
                                                        <span className="text-xs">Sinal RSSI: {device.telemetry.signal !== undefined ? `${device.telemetry.signal} dBm` : '--'}</span>
                                                    </div>
                                                    <span className={`text-xs font-bold ${device.telemetry.signal && device.telemetry.signal > -75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                        {getSignalQuality(device.telemetry.signal)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DeviceList;
