import React from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    BatteryCharging,
    Droplets,
    ServerCrash,
    Thermometer,
    Wifi,
    Zap
} from 'lucide-react';

interface DeviceCardProps {
    device: any;
    onDeviceClick: (deviceId: string) => void;
    isManager: boolean;
    currentTenantId: string;
    availableTenants: any[];
}

const DeviceCard: React.FC<DeviceCardProps> = ({
    device,
    onDeviceClick,
    isManager,
    currentTenantId,
    availableTenants
}) => {
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'online': return 'ESTÁVEL';
            case 'warning': return 'ALERTA';
            case 'error': return 'ERRO';
            case 'offline': return 'OFFLINE';
            default: return status.toUpperCase();
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'online': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'offline': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-slate-800 text-slate-400 border-slate-700';
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
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-lg group-hover:text-primary transition-colors">{device.name}</h4>
                            {device.fwVersion && (
                                <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono tracking-tighter" title="Versão do Firmware">
                                    v{device.fwVersion}
                                </span>
                            )}
                        </div>
                        {device.location && (
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                {device.location}
                            </p>
                        )}
                        {currentTenantId === 'all' && (
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
                        Exibindo o último estado conhecido.
                    </span>
                </div>
            )}

            <div className="bg-[#0F110D] rounded-xl p-4 mb-4 flex items-center justify-between border border-[#2A2E24] z-10">
                <div>
                    <div className="text-xs text-slate-500 font-medium mb-1 font-heading uppercase tracking-wider">Temperatura Atual</div>
                    <div className="text-4xl font-bold text-white tracking-tight">
                        {device.telemetry?.temp !== undefined ? `${device.telemetry.temp.toFixed(1)}` : '--'}
                        <span className="text-lg text-slate-400 font-medium ml-1">°C</span>
                    </div>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${getStatusStyle(device.status || 'offline')} ${device.status === 'offline' ? 'opacity-50' : ''}`}>
                    {getStatusLabel(device.status || 'offline')}
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
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                        <ArrowUp size={16} color="#f43f5e" />
                        Máxima
                    </div>
                    <div className="text-lg font-bold text-rose-500">
                        {device.telemetry.tempMax !== undefined ? `${device.telemetry.tempMax.toFixed(1)}°C` : '--'}
                    </div>
                </div>
                <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex flex-col items-center justify-center text-center">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                        <ArrowDown size={16} color="#818cf8" />
                        Mínima
                    </div>
                    <div className="text-lg font-bold text-indigo-400">
                        {device.telemetry.tempMin !== undefined ? `${device.telemetry.tempMin.toFixed(1)}°C` : '--'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 z-10">
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

            {/* Status dos Relés (Indicadores visuais) - Apenas para Gestores */}
            {isManager && (
                <div className="mb-6 bg-[#0F110D]/30 border border-[#2A2E24] rounded-xl p-3 z-10">
                    <div className="flex items-center gap-2 mb-2.5 px-1">
                        <div className="w-1 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(151,215,0,0.5)]"></div>
                        <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Status do Equipamento</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: 0, port: 23 },
                            { id: 1, port: 19 },
                            { id: 2, port: 18 },
                            { id: 3, port: 5 }
                        ].map((rele) => {
                            const state: any = device?.telemetry ? (device.telemetry as any)[`rele${rele.id}`] ?? (rele.id === 0 ? (device.telemetry as any).rele : undefined) : undefined;
                            const isOn = state === true || state === 1 || state === 'on';

                            return (
                                <div
                                    key={rele.id}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-300 ${isOn
                                        ? 'bg-emerald-500/10 border-emerald-500/30'
                                        : 'bg-slate-900/40 border-[#2A2E24]'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isOn ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`}></div>
                                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">R-{rele.id}</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${isOn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                        {isOn ? (
                                            <>
                                                <Activity size={8} className="animate-pulse" />
                                                <span>LIG</span>
                                            </>
                                        ) : (
                                            <span>DESL</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
};

export default React.memo(DeviceCard);
