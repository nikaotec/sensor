import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { Device } from '../../domain/entities/Device';

interface ActionControlsProps {
    device: Device | undefined;
    isConnected: boolean;
    isUpdating: boolean;
    onToggleRelay: (action: string, id: number, port: number) => Promise<void>;
    onAction: (topicSuffix: string, payload: any, logMsg: string) => Promise<void>;
}

const ActionControls: React.FC<ActionControlsProps> = ({
    device,
    isConnected,
    isUpdating,
    onToggleRelay,
    onAction
}) => {
    const relays = [
        { id: 0, port: 23 },
        { id: 1, port: 19 },
        { id: 2, port: 18 },
        { id: 3, port: 5 }
    ];

    const getRelayState = (relayId: number) => {
        if (!device?.telemetry) return undefined;
        const telemetry = device.telemetry as any;
        return telemetry[`rele${relayId}`] ?? (relayId === 0 ? telemetry.rele : undefined);
    };

    return (
        <div className="pt-3 border-t border-[#2A2E24] space-y-4">
            <div>
                <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1 block mb-2">
                    Controle de Saída (Relés)
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {relays.map((rele) => {
                        const currentState = getRelayState(rele.id);
                        return (
                            <div key={rele.id} className="flex flex-col gap-1 p-2 bg-[#1A1D17] border border-[#2A2E24] rounded-lg relative overflow-hidden">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        Relé {rele.id} <span className="text-[8px] opacity-40 uppercase tracking-widest ml-0.5">(P-{rele.port})</span>
                                    </span>
                                    <div className={`flex items-center gap-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded transition-all ${currentState === true ? 'bg-emerald-500/20 text-emerald-400' : currentState === false ? 'bg-red-500/20 text-red-400' : 'bg-[#0F110D] text-slate-600 border border-[#2A2E24]'}`}>
                                        <div className={`size-1.5 rounded-full ${currentState === true ? 'bg-emerald-400 animate-pulse' : currentState === false ? 'bg-red-500' : 'bg-slate-600'}`} />
                                        {currentState === true ? 'ON' : currentState === false ? 'OFF' : 'N/A'}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => onToggleRelay('ligar_rele', rele.id, rele.port)}
                                        disabled={isUpdating || !isConnected || currentState === true}
                                        className={`flex-1 py-1.5 rounded-lg text-[8px] font-bold uppercase transition-all ${currentState === true ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40' : 'bg-[#0F110D] border border-[#2A2E24] text-slate-400 hover:text-emerald-500'}`}
                                    >
                                        LIGAR
                                    </button>
                                    <button
                                        onClick={() => onToggleRelay('desligar_rele', rele.id, rele.port)}
                                        disabled={isUpdating || !isConnected || currentState === false}
                                        className={`flex-1 py-1.5 rounded-lg text-[8px] font-bold uppercase transition-all ${currentState === false ? 'bg-red-500/20 text-red-500 border border-red-500/40' : 'bg-[#0F110D] border border-[#2A2E24] text-slate-400 hover:text-red-500'}`}
                                    >
                                        DESLIGAR
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div>
                <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1 block mb-2">Comandos Rápidos</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onAction(
                            device?.telemetry?.modo === 'MANUAL' ? 'modo_operacional' : 'modo_manutencao',
                            {},
                            `Modo alterado para: ${device?.telemetry?.modo === 'MANUAL' ? 'OPERACIONAL' : 'MANUTENÇÃO'}`
                        )}
                        disabled={isUpdating || !isConnected}
                        className={`py-2 rounded-lg text-[9px] font-bold uppercase transition-all border ${device?.telemetry?.modo === 'MANUAL' ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' : 'bg-[#0F110D] border border-[#2A2E24] text-slate-400 hover:text-white'}`}
                    >
                        {device?.telemetry?.modo === 'MANUAL' ? 'SAIR MANUTENÇÃO' : 'ENTRAR MANUTENÇÃO'}
                    </button>
                    <button
                        onClick={() => onAction(
                            device?.telemetry?.silenced ? 'reativar_alarme' : 'silenciar_alarme',
                            {},
                            device?.telemetry?.silenced ? 'Alarme reativado via dashboard' : 'Alarme silenciado via dashboard'
                        )}
                        disabled={isUpdating || !isConnected}
                        className={`py-2 rounded-lg text-[9px] font-bold uppercase transition-all border ${device?.telemetry?.silenced ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' : 'bg-[#0F110D] border border-[#2A2E24] text-slate-400 hover:text-white'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            {device?.telemetry?.silenced ? <VolumeX size={14} /> : <Volume2 size={14} />}
                            {device?.telemetry?.silenced ? 'ALARMES SILENCIADOS' : 'SILENCIAR'}
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActionControls;
