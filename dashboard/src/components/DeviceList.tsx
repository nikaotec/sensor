import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useMqttData } from '../hooks/useMqttData';
import { Search, AlertTriangle, BatteryCharging, Zap, Wifi, ServerCrash, Thermometer, Droplets, CheckCircle2 } from 'lucide-react';
import { firmwareRegistryService } from '../services/FirmwareRegistryService';
import { VersionService } from '../services/VersionService';

interface DeviceListProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel' | 'admin-users' | 'ota-panel') => void;
    onDeviceClick: (deviceId: string) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ onNavigate, onDeviceClick }) => {
    const { currentTenant, availableTenants } = useTenant();
    const { currentUser } = useAuth();
    if (!currentTenant) return <div className="flex h-screen items-center justify-center bg-background-dark text-white">Carregando dados...</div>;

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'warning'>('all');

    // Dados base do Firebase + sobreposição ao vivo do MQTT
    // Escuta todos os dados para que a lógica lide mesmo quando a aba não estiver em "Todos".
    const { devices: supabaseDevices } = useSupabaseData(currentTenant.id);
    const { devices: tenantDevices, isConnected: mqttConnected } = useMqttData('all', currentUser?.role, supabaseDevices);

    // Filtro para garantir que só seja exibido dispositivos vinculados
    const authFilteredDevices = React.useMemo(() => {
        const allowedTenantIds = availableTenants.map(t => t.id);
        const allowedTenantNames = availableTenants.map(t => t.name);

        const assignedDevices = tenantDevices.filter(d => {
            if (!d || !d.tenantId) return false;
            const t = String(d.tenantId).trim().toLowerCase();
            return t !== "" && t !== "unknown" && t !== "empresa_default" && t !== "nikaotec" && t !== "null" && t !== "undefined";
        });

        if (currentTenant && currentTenant.id !== 'all') {
            return assignedDevices.filter(d => d.tenantId === currentTenant.id || d.tenantId === currentTenant.name);
        }

        if (currentUser?.role === 'manager') return assignedDevices;

        return assignedDevices.filter(d => allowedTenantIds.includes(d.tenantId) || allowedTenantNames.includes(d.tenantId));
    }, [tenantDevices, currentUser?.role, availableTenants, currentTenant]);

    // Filter by search, status AND require mqttUpdated to be true
    const filteredDevices = authFilteredDevices.filter(device => {

        const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'online': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'offline': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-dark text-slate-100 font-display">
            <Sidebar activeItem="device-list" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background-dark">
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-8 bg-[#1A1D17]/80 backdrop-blur-md border-b border-[#2A2E24] sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-white tracking-tight">Dispositivos de {currentTenant.name}</h2>
                        {mqttConnected && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                                <Wifi size={10} /> MQTT Live
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex items-center bg-[#0F110D] px-4 py-2 rounded-xl border border-[#2A2E24] w-64 lg:w-96 group focus-within:border-primary/50 transition-all">
                            <Search size={18} className="text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm px-3 w-full text-white placeholder:text-slate-500"
                                placeholder="Buscar dispositivo ou local..."
                            />
                        </div>
                        <div className="flex bg-[#0F110D] rounded-xl p-1 border border-[#2A2E24]">
                            {['all', 'online', 'warning', 'offline'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f as any)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === f ? 'bg-primary/20 text-primary border border-primary/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
                                >
                                    {f === 'all' ? 'TODOS' : f.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 pb-24 sm:pb-8 custom-scrollbar 2xl:max-w-[1600px] 2xl:mx-auto w-full">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredDevices.length === 0 ? (
                                <div className="col-span-1 md:col-span-2 xl:col-span-3 py-12 flex flex-col items-center justify-center text-slate-500 bg-[#1A1D17] rounded-2xl border border-[#2A2E24]">
                                    <ServerCrash size={48} className="mb-4 opacity-50" />
                                    <p className="text-lg">Nenhum dispositivo encontrado para os filtros aplicados.</p>
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

                                    const isOffline = device.status === 'offline' || !(device as any).mqttUpdated;

                                    return (
                                        <div
                                            key={device.id}
                                            onClick={() => onDeviceClick(device.id)}
                                            className={`bg-[#1A1D17] rounded-2xl border shadow-lg p-6 relative flex flex-col cursor-pointer transition-all group overflow-hidden ${isOffline
                                                ? 'border-red-400/30 opacity-80 grayscale-[0.5] hover:border-red-400/50'
                                                : 'border-[#2A2E24] hover:border-primary/50'
                                                }`}
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                                <ServerCrash size={80} className="text-primary" />
                                            </div>

                                            <div className="mb-4 flex flex-col z-10">
                                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-loose font-heading">Monitoramento em Tempo Real</h3>
                                                <div className="flex justify-between items-center mt-1">
                                                    <div>
                                                        <h4 className="font-bold text-white text-lg group-hover:text-primary transition-colors">{device.name}</h4>
                                                        {device.location && (
                                                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                                                {device.location}
                                                                {device.telemetry?.version && (() => {
                                                                    const latestFw = firmwareRegistryService.getLatestVersion();
                                                                    const latestVersion = latestFw?.version;
                                                                    const isUpToDate = latestVersion ? VersionService.isUpToDate(device.telemetry.version, latestVersion) : true;
                                                                    return (
                                                                        <div className="flex items-center gap-1.5 ml-2">
                                                                            <span className="text-[8px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-700 font-bold uppercase tracking-tighter">
                                                                                FW {device.telemetry.version}
                                                                            </span>
                                                                            {isUpToDate ? (
                                                                                <span className="text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter flex items-center gap-1 text-[7px] sm:text-[8px]">
                                                                                    <CheckCircle2 size={10} />
                                                                                    Atualizado
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter flex items-center gap-1 text-[7px] sm:text-[8px]">
                                                                                    <AlertTriangle size={10} />
                                                                                    Atualizar
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </p>
                                                        )}
                                                        {currentTenant?.id === 'all' && (
                                                            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md mt-1.5 inline-block font-medium">
                                                                {availableTenants.find(t => t.id === device.tenantId)?.name || device.tenantId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {device.status === 'offline' && (
                                                <div className="mb-4 bg-slate-800/50 text-slate-400 text-xs px-4 py-3 rounded-xl border border-slate-700 flex items-start gap-3 z-10">
                                                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                                                    <span className="leading-snug">
                                                        <strong className="text-white">Dispositivo offline.</strong><br />
                                                        Exibindo o último estado conhecido. Os dados voltarão ao tempo real quando o dispositivo reconectar.
                                                    </span>
                                                </div>
                                            )}

                                            <div className="bg-[#0F110D] rounded-xl p-4 mb-4 flex items-center justify-between border border-[#2A2E24] z-10">
                                                <div>
                                                    <div className="text-xs text-slate-500 font-medium mb-1 font-heading uppercase tracking-wider">Temperatura Atual</div>
                                                    <div className="text-4xl font-bold text-white tracking-tight">
                                                        {device.telemetry.temp !== undefined ? `${device.telemetry.temp.toFixed(1)}` : '--'}
                                                        <span className="text-lg text-slate-400 font-medium ml-1">°C</span>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${getStatusStyle(device.status)} ${device.status === 'offline' ? 'opacity-50' : ''}`}>
                                                    {getStatusLabel(device.status)}
                                                </div>
                                            </div>

                                            {/* Telemetria Secundária: Ambiente e Umidade */}
                                            <div className="flex items-center justify-between px-4 py-2 bg-[#0F110D]/50 rounded-xl border border-[#2A2E24] mb-4 z-10">
                                                <div className="flex items-center gap-2">
                                                    <Thermometer size={12} className="text-slate-500" />
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Ext:</span>
                                                    <span className="text-[10px] text-slate-200 font-bold">{device.telemetry?.tempExt !== undefined ? `${device.telemetry.tempExt.toFixed(1)}°C` : '--'}</span>
                                                </div>
                                                <div className="w-px h-3 bg-[#2A2E24]"></div>
                                                <div className="flex items-center gap-2">
                                                    <Droplets size={12} className="text-slate-500" />
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Umid:</span>
                                                    <span className="text-[10px] text-slate-200 font-bold">{device.telemetry?.humidity !== undefined ? `${device.telemetry.humidity.toFixed(0)}%` : '--'}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-4 z-10">
                                                <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex flex-col items-center justify-center text-center">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Máxima</div>
                                                    <div className="text-lg font-bold text-rose-500">
                                                        {device.telemetry.tempMax !== undefined ? `${device.telemetry.tempMax.toFixed(1)}°C` : '--'}
                                                    </div>
                                                </div>
                                                <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex flex-col items-center justify-center text-center">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Mínima</div>
                                                    <div className="text-lg font-bold text-indigo-400">
                                                        {device.telemetry.tempMin !== undefined ? `${device.telemetry.tempMin.toFixed(1)}°C` : '--'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-6 z-10">
                                                <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                                                        <BatteryCharging size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bateria</div>
                                                        <div className="text-sm font-bold text-white">
                                                            {device.telemetry.batteryVoltage !== undefined ? `${device.telemetry.batteryVoltage.toFixed(2)}V` : '--'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                                        <Zap size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tensão</div>
                                                        <div className="text-sm font-bold text-white">
                                                            {device.telemetry.inputVoltage !== undefined ? `${device.telemetry.inputVoltage}V` : '--'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-auto pt-4 border-t border-[#2A2E24] flex items-center justify-between z-10">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Wifi size={14} className={device.telemetry.signal && device.telemetry.signal > -75 ? 'text-primary' : 'text-amber-500'} />
                                                    <span className="text-xs font-medium">Sinal RSSI: {device.telemetry.signal !== undefined ? `${device.telemetry.signal} dBm` : '--'}</span>
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-[#0F110D] border border-[#2A2E24] ${device.telemetry.signal && device.telemetry.signal > -75 ? 'text-emerald-400' : 'text-amber-500'}`}>
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
            </main>
        </div>
    );
};

export default DeviceList;

