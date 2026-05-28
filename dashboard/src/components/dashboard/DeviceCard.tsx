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
    Zap,
    BellOff,
    Bell,
    CheckCircle2,
    RotateCcw,
    Volume2,
    VolumeX,
    Clock
} from 'lucide-react';
import type { OtaStatus } from '../../types/ota';
import OtaProgressBadge from '../ota/OtaProgressBadge';
import { VersionService } from '../../services/VersionService';
import { firmwareRegistryService } from '../../services/FirmwareRegistryService';

interface DeviceCardProps {
    device: any;
    onDeviceClick: (deviceId: string) => void;
    isManager: boolean;
    currentTenantId: string;
    availableTenants: any[];
    otaStatus?: OtaStatus;
    onClearOtaProgress?: (deviceId: string) => void;
    mqttClient?: any;
    currentUserRole?: string;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
    device,
    onDeviceClick,
    isManager,
    currentTenantId,
    availableTenants,
    otaStatus,
    onClearOtaProgress,
    mqttClient,
    currentUserRole
}) => {
    const localKey = `offline_alerts_paused_${device.id}`;
    const [isOfflinePaused, setIsOfflinePaused] = React.useState<boolean>(() => {
        return localStorage.getItem(localKey) === 'true';
    });
    const [wifiResetting, setWifiResetting] = React.useState(false);
    // Modo manutenção: silencia todos os alarmes gerais (device em MANUAL)
    const isModoManual = device?.telemetry?.modo === 'MANUAL';
    const [isManualToggling, setIsManualToggling] = React.useState(false);
    const [isSilencing2Min, setIsSilencing2Min] = React.useState(false);

    // Sincronizar o estado local com o localStorage
    React.useEffect(() => {
        setIsOfflinePaused(localStorage.getItem(localKey) === 'true');
    }, [device.id]);

    const handleTogglePause = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newValue = !isOfflinePaused;
        setIsOfflinePaused(newValue);
        if (newValue) {
            localStorage.setItem(localKey, 'true');
        } else {
            localStorage.removeItem(localKey);
        }
    };

    const handleWifiReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!mqttClient || wifiResetting) return;

        setWifiResetting(true);
        const cmdPayload = JSON.stringify({ intent: "reset_wifi", is_admin: true });
        const cmdTopic = `devices/${device.id}/cmd`;
        mqttClient.publish(cmdTopic, cmdPayload);

        setTimeout(() => setWifiResetting(false), 5000);
    };

    const handleToggleModoManutencao = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!mqttClient || isManualToggling) return;
        setIsManualToggling(true);
        const novoModo = isModoManual ? 'AUTO' : 'MANUAL';
        const intencao = isModoManual ? 'modo_automatico' : 'modo_manutencao';
        const payload = JSON.stringify({
            intencao,
            id: device.id,
            dispositivo_id: device.id,
            is_admin: true,
            source: 'dashboard'
        });
        mqttClient.publish('esp32c3/status/action', payload);
        console.log(`🔔 Modo ${novoModo} enviado via MQTT para ${device.name}`);
        setTimeout(() => setIsManualToggling(false), 3000);
    };

    const handleSilenciar2Min = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!mqttClient || isSilencing2Min) return;

        setIsSilencing2Min(true);
        const payload = JSON.stringify({
            intencao: 'silenciar_2min',
            id: device.id,
            dispositivo_id: device.id,
            duracao: 120, // 2 minutos em segundos
            source: 'dashboard',
            is_admin: true // Para garantir que o comando seja aceito
        });
        mqttClient.publish('esp32c3/status/action', payload);
        console.log(`⏳ Silenciamento de 2 min enviado para ${device.name}`);

        setTimeout(() => setIsSilencing2Min(false), 3000);
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
                ? 'border-slate-700/50 hover:border-slate-600'
                : 'border-[#2A2E24] hover:border-primary/50'
                }`}
        >
            <div className={`absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity ${isOffline ? 'grayscale' : ''}`}>
                <ServerCrash size={80} className="text-primary" />
            </div>

            <div className="mb-4 flex flex-col z-20">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-loose font-heading">Monitoramento em Tempo Real</h3>
                <div className="flex justify-between items-center mt-1">
                    <div className="flex justify-between items-start w-full">
                        <div className={`${isOffline ? 'opacity-70' : ''}`}>
                            <h4 className="font-bold text-white text-lg group-hover:text-primary transition-colors">{device.name}</h4>
                            {device.location && (
                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                    {device.location}
                                    {(device.firmwareVersion || device.telemetry?.version) && (() => {
                                        const fwVersion = device.firmwareVersion || device.telemetry.version;
                                        const latestFw = firmwareRegistryService.getLatestVersion();
                                        const latestVersion = latestFw?.version;
                                        const isUpToDate = latestVersion ? VersionService.isUpToDate(fwVersion, latestVersion) : true;
                                        return (
                                            <div className="flex items-center gap-1.5 ml-2">
                                                <span className="text-[8px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-700 font-bold uppercase tracking-tighter">
                                                    FW {fwVersion}
                                                </span>
                                                {isUpToDate ? (
                                                    <span className="text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter flex items-center gap-1">
                                                        <CheckCircle2 size={10} />
                                                        Atualizado
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter flex items-center gap-1">
                                                        <AlertTriangle size={10} />
                                                        Atualizar
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </p>
                            )}
                            {currentTenantId === 'all' && (
                                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md mt-1.5 inline-block font-medium">
                                    {availableTenants.find(t => t.id === device.tenantId)?.name || device.tenantId}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Botão de Silenciar Alertas Offline */}
                            <button
                                onClick={handleTogglePause}
                                className={`p-2 rounded-xl border transition-all duration-300 z-30 cursor-pointer ${isOfflinePaused
                                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                                    : 'bg-[#0F110D] border-[#2A2E24] text-slate-500 hover:text-slate-300 hover:border-slate-700'
                                    }`}
                                title={isOfflinePaused ? "Alertas Offline Pausados" : "Pausar Alertas Offline"}
                            >
                                {isOfflinePaused ? (
                                    <div className="flex items-center gap-2 px-1">
                                        <BellOff size={18} />
                                        <span className="text-[9px] font-bold uppercase tracking-tight">Silenciado</span>
                                    </div>
                                ) : (
                                    <Bell size={18} />
                                )}
                            </button>
                        </div>
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

            <div className={`${isOffline ? 'grayscale opacity-60' : ''} transition-all duration-500`}>
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

                {/* OTA Progress Overlay in Card */}
                {otaStatus && otaStatus.phase !== 'idle' && (
                    <div className="mb-4 z-10">
                        <OtaProgressBadge
                            status={otaStatus}
                            onDismiss={() => onClearOtaProgress?.(device.id)}
                        />
                    </div>
                )}

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

            <div className="mt-auto flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-slate-600' : 'bg-primary shadow-[0_0_8px_rgba(151,215,0,0.6)]'}`}></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isOffline ? 'Desconectado' : 'Operacional'}</span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Botão: Silenciar Alarmes Gerais (Modo Manutenção via MQTT) */}
                    {mqttClient && (
                        <button
                            onClick={handleToggleModoManutencao}
                            disabled={isManualToggling}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${isModoManual
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                : 'bg-[#0F110D] border-[#2A2E24] text-slate-400 hover:text-white hover:border-slate-600'
                                }`}
                            title={isModoManual ? 'Modo Manutenção ativo — alertas suspensos. Clique para reativar.' : 'Silenciar todos os alarmes (Modo Manutenção)'}
                        >
                            {isModoManual ? (
                                <>
                                    <VolumeX size={14} className="shrink-0" />
                                    <span className="text-[9px] font-bold uppercase tracking-tighter">Em Manutenção</span>
                                </>
                            ) : (
                                <>
                                    <Volume2 size={14} className="shrink-0" />
                                    <span className="text-[9px] font-bold uppercase tracking-tighter">Alarmes</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Botão: Silenciar 2 Minutos (Disponível para Usuário Comum) */}
                    {mqttClient && (
                        <button
                            onClick={handleSilenciar2Min}
                            disabled={isSilencing2Min}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${isSilencing2Min
                                ? 'bg-primary/20 border-primary/40 text-primary'
                                : 'bg-[#0F110D] border-[#2A2E24] text-slate-400 hover:text-white hover:border-slate-600'
                                }`}
                            title="Silenciar alertas por 2 minutos"
                        >
                            <Clock size={14} className={isSilencing2Min ? 'animate-pulse' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">
                                {isSilencing2Min ? 'Silenciando...' : '2 min'}
                            </span>
                        </button>
                    )}

                    {/* Botão de Reset WiFi (Apenas se MQTT disponível e for gestor) */}
                    {mqttClient && currentUserRole === 'gestor' && (
                        <button
                            onClick={handleWifiReset}
                            disabled={wifiResetting}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${wifiResetting
                                ? 'bg-slate-800 border-slate-700 text-slate-500'
                                : 'bg-[#0F110D] border-[#2A2E24] text-slate-400 hover:text-white hover:border-slate-600'
                                }`}
                            title="Reiniciar Módulo WiFi"
                        >
                            <RotateCcw size={14} className={wifiResetting ? 'animate-spin' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">{wifiResetting ? 'Resetando...' : 'Reset WiFi'}</span>
                        </button>
                    )}

                    <div className="flex items-center gap-1.5 bg-[#0F110D] px-2.5 py-1.5 rounded-lg border border-[#2A2E24]">
                        <Wifi size={14} className={!isOffline ? 'text-primary' : 'text-slate-600'} />
                        <span className="text-[9px] font-bold text-white uppercase tracking-tighter">{!isOffline ? getSignalQuality(device.telemetry.signal) : '---'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviceCard;
