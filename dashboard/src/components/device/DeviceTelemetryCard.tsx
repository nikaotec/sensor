import React from 'react';
import {
    AlertTriangle,
    Wrench,
    Thermometer,
    Droplets,
    BatteryCharging,
    Zap,
    RotateCw,
    Wifi,
    CheckCircle2,
    Cpu,
    Bell,
    BellOff,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import type { Device } from '../../data/mockData';
import { getStatusStyle, getStatusLabel } from '../../utils/statusUtils';
import { firmwareRegistryService } from '../../services/FirmwareRegistryService';
import { VersionService } from '../../services/VersionService';
import { supabase } from '../../supabase/config';

interface DeviceTelemetryCardProps {
    device: Device;
    isManager: boolean;
    /** Role do usuário para controle fino de permissões */
    userRole?: string;
    handleAction?: (action: string, extraPayload: any, logMsg: string) => void;
    isUpdating?: boolean;
    isConnected?: boolean;
}

const DeviceTelemetryCard: React.FC<DeviceTelemetryCardProps> = ({ device, isManager, userRole, handleAction, isUpdating, isConnected }) => {
    const [isOfflinePaused, setIsOfflinePaused] = React.useState<boolean>((device as any)?.alerts_paused || false);

    React.useEffect(() => {
        setIsOfflinePaused((device as any)?.alerts_paused || false);
    }, [(device as any)?.alerts_paused]);

    // Admin e manager podem silenciar definitivamente
    const canSilencePermanently = userRole === 'admin' || isManager;

    const handleTogglePause = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const newValue = !isOfflinePaused;
        setIsOfflinePaused(newValue);

        try {
            const { error } = await supabase
                .from('devices_status')
                .update({ alerts_paused: newValue })
                .eq('id', device.id);

            if (error) throw error;
        } catch (err) {
            console.error('Erro ao atualizar silenciamento no Supabase:', err);
            // Reverter em caso de erro
            setIsOfflinePaused(!newValue);
        }
    };

    return (
        <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg relative">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider font-heading">Monitoramento em Tempo Real</h3>
                <div className="flex items-center gap-2">
                    {/* Botão de Silenciar Alertas Offline (visível para admin e manager) */}
                    {canSilencePermanently && (
                        <button
                            onClick={handleTogglePause}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-300 z-30 cursor-pointer ${isOfflinePaused
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                                : 'bg-[#0F110D] border-[#2A2E24] text-slate-500 hover:text-slate-300 hover:border-slate-600'
                                }`}
                            title={isOfflinePaused ? 'Alertas Silenciados — clique para reativar' : 'Silenciar Alertas (apenas para você)'}
                        >
                            {isOfflinePaused ? (
                                <>
                                    <BellOff size={14} />
                                    <span className="text-[9px] font-bold uppercase tracking-tighter">Silenciado</span>
                                </>
                            ) : (
                                <>
                                    <Bell size={14} />
                                    <span className="text-[9px] font-bold uppercase tracking-tighter">Silenciar</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Badge de Versão de Firmware */}
            {(device?.telemetry as any)?.version && (() => {
                const latestFw = firmwareRegistryService.getLatestVersion();
                const latestVersion = latestFw?.version;
                const deviceVersion = (device.telemetry as any).version;
                const isUpToDate = latestVersion ? VersionService.isUpToDate(deviceVersion, latestVersion) : true;
                return (
                    <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl border border-[#2A2E24] bg-[#0F110D]">
                        <div className="size-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                            <Cpu size={14} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Firmware Instalado</span>
                            <span className="text-xs font-bold text-white font-mono">v{deviceVersion}</span>
                        </div>
                        <div className="ml-auto">
                            {isUpToDate ? (
                                <span className="text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded-full font-bold uppercase tracking-tighter flex items-center gap-1">
                                    <CheckCircle2 size={10} />
                                    Atualizado
                                </span>
                            ) : (
                                <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded-full font-bold uppercase tracking-tighter flex items-center gap-1">
                                    <AlertTriangle size={10} />
                                    Atualizar para v{latestVersion}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })()}

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
                            <h4 className="text-4xl font-black text-primary tracking-tight">
                                {device?.telemetry?.temp !== undefined ? `${device.telemetry.temp.toFixed(1)}°C` : '--'}
                            </h4>
                        </div>
                        <div className="text-right">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase border ${getStatusStyle(device?.status || 'offline')}`}>
                                {getStatusLabel(device?.status || 'offline')}
                            </span>
                        </div>
                    </div>
                    <div className="col-span-2 flex items-center justify-between px-5 py-2.5 bg-[#0F110D] rounded-xl border border-[#2A2E24] mt-1 mb-1">
                        <div className="flex items-center gap-2">
                            <Thermometer size={14} className="text-slate-500" />
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Ambiente:</span>
                            <span className="text-[10px] text-slate-200 font-bold font-mono">
                                {device?.telemetry?.tempExternal !== undefined ? `${device.telemetry.tempExternal.toFixed(1)}°C` :
                                    device?.telemetry?.tempExt !== undefined ? `${device.telemetry.tempExt.toFixed(1)}°C` : '--'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Droplets size={14} className="text-slate-500" />
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Umidade:</span>
                            <span className="text-[10px] text-slate-200 font-bold font-mono">
                                {device?.telemetry?.humidity !== undefined ? `${device.telemetry.humidity.toFixed(0)}%` : '--'}
                            </span>
                        </div>
                    </div>

                    <div className="col-span-2 flex items-center justify-between mt-1 mb-[-4px]">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Extremos do Período</span>
                        {(isManager || userRole === 'admin' || userRole === 'user') && handleAction && (
                            <button
                                onClick={() => handleAction('reset_manual', {}, 'Reset de registros de temperatura')}
                                disabled={isUpdating || !isConnected}
                                title="Zerar os registros de temperatura máxima e mínima do período"
                                className="flex items-center gap-1.5 text-[9px] px-2.5 py-1.5 rounded-lg bg-[#0F110D] border border-[#2A2E24] hover:bg-primary/20 hover:text-primary hover:border-primary/30 transition-all font-bold tracking-widest text-slate-400 disabled:opacity-50"
                            >
                                <RotateCw size={10} />
                                RESETAR MÍN/MÁX
                            </button>
                        )}
                    </div>

                    <div className="bg-[#0A0D08] p-3 rounded-xl border border-[#2A2E24] text-center flex flex-col items-center justify-center shadow-inner group/card hover:border-red-500/30 transition-colors relative overflow-hidden">
                        <div className="flex items-center gap-1 mb-1 z-10">
                            <ArrowUp size={10} className="text-red-400" />
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest group-hover/card:text-red-400 transition-colors">Máxima</p>
                        </div>
                        <p className="text-base font-bold text-[#FF5F5F] drop-shadow-[0_0_8px_rgba(255,95,95,0.3)] z-10">
                            {device?.telemetry?.tempMax !== undefined ? `${device.telemetry.tempMax.toFixed(1)}°C` : '--'}
                        </p>
                    </div>
                    <div className="bg-[#0A0D08] p-3 rounded-xl border border-[#2A2E24] text-center flex flex-col items-center justify-center shadow-inner group/card hover:border-primary/30 transition-colors relative overflow-hidden">
                        <div className="flex items-center gap-1 mb-1 z-10">
                            <ArrowDown size={10} className="text-primary" />
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest group-hover/card:text-primary transition-colors">Mínima</p>
                        </div>
                        <p className="text-base font-bold text-primary drop-shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.3)] z-10">
                            {device?.telemetry?.tempMin !== undefined ? `${device.telemetry.tempMin.toFixed(1)}°C` : '--'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="flex items-center gap-3 p-3 bg-[#0A0D08] rounded-xl border border-[#2A2E24] shadow-inner">
                        <div className="size-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                            <BatteryCharging size={16} />
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest leading-tight">Bateria</p>
                            <p className="text-sm font-bold text-white leading-tight">
                                {device?.telemetry?.batteryVoltage !== undefined ? `${device.telemetry.batteryVoltage.toFixed(2)}V` : '--'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[#0A0D08] rounded-xl border border-[#2A2E24] shadow-inner">
                        <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                            <Zap size={16} />
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest leading-tight">Tensão</p>
                            <p className="text-sm font-bold text-white leading-tight">
                                {device?.telemetry?.inputVoltage !== undefined ? `${device.telemetry.inputVoltage}V` : '--'}
                            </p>
                        </div>
                    </div>
                </div>

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
                                const state = device?.telemetry ? (device.telemetry as any)[`rele${rele.id}`] ?? (rele.id === 0 ? device.telemetry.rele : undefined) : undefined;
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
    );
};

export default DeviceTelemetryCard;
