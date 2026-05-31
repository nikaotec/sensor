import React from 'react';
import { RefreshCw } from 'lucide-react';

interface AlarmSettingsProps {
    tempMinInput: string;
    setTempMinInput: (value: string) => void;
    tempMaxInput: string;
    setTempMaxInput: (value: string) => void;
    voltMinInput: string;
    setVoltMinInput: (value: string) => void;
    voltMaxInput: string;
    setVoltMaxInput: (value: string) => void;
    batMinInput: string;
    setBatMinInput: (value: string) => void;
    doorTimeInput: string;
    setDoorTimeInput: (value: string) => void;
    voltReturnDelayInput: string;
    setVoltReturnDelayInput: (value: string) => void;
    setRemoteSync: (value: boolean) => void;
    handleSaveLimits: () => void;
    isUpdating: boolean;
    isConnected: boolean;
    /** Role do usuário: admin vê apenas temperatura máx/mín */
    userRole?: string;
}

const AlarmSettings: React.FC<AlarmSettingsProps> = ({
    tempMinInput, setTempMinInput,
    tempMaxInput, setTempMaxInput,
    voltMinInput, setVoltMinInput,
    voltMaxInput, setVoltMaxInput,
    batMinInput, setBatMinInput,
    doorTimeInput, setDoorTimeInput,
    voltReturnDelayInput, setVoltReturnDelayInput,
    setRemoteSync,
    handleSaveLimits,
    isUpdating,
    isConnected,
    userRole
}) => {
    // Admin só pode alterar temperatura; gestor/manager têm acesso total
    const isAdminRestricted = userRole === 'admin';
    return (
        <div className="space-y-4">
            {/* Temperatura */}
            <div className="space-y-2 pb-3 border-b border-[#2A2E24]/50">
                <div className="flex items-center gap-2 mb-1">
                    <div className="size-1.5 rounded-full bg-red-500"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alerta de Temperatura</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Mín (°C)</label>
                        <input type="number" step="0.1" value={tempMinInput} onChange={(e) => { setTempMinInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-red-500/50 focus:outline-none" placeholder="0.0" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Máx (°C)</label>
                        <input type="number" step="0.1" value={tempMaxInput} onChange={(e) => { setTempMaxInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-red-500/50 focus:outline-none" placeholder="0.0" />
                    </div>
                </div>
            </div>

            {/* Tensão — oculto para admin */}
            {!isAdminRestricted && (
                <div className="space-y-2 pb-3 border-b border-[#2A2E24]/50">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="size-1.5 rounded-full bg-amber-500"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alerta de Tensão</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Mín (V)</label>
                            <input type="number" step="1" value={voltMinInput} onChange={(e) => { setVoltMinInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500/50 focus:outline-none" placeholder="0" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Máx (V)</label>
                            <input type="number" step="1" value={voltMaxInput} onChange={(e) => { setVoltMaxInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500/50 focus:outline-none" placeholder="0" />
                        </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                        <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Atraso Pós-Estabilização (s)</label>
                        <input type="number" step="1" value={voltReturnDelayInput} onChange={(e) => { setVoltReturnDelayInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500/50 focus:outline-none" placeholder="0" />
                    </div>
                </div>
            )}

            {/* Bateria e Porta — ocultos para admin */}
            {!isAdminRestricted && (
                <div className="grid grid-cols-2 gap-3 pb-2">
                    <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Bat. Mín (V)</label>
                        <input type="number" step="0.1" value={batMinInput} onChange={(e) => { setBatMinInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-primary/50 focus:outline-none" placeholder="0.0" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Porta (s)</label>
                        <input type="number" step="1" value={doorTimeInput} onChange={(e) => { setDoorTimeInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-primary/50 focus:outline-none" placeholder="0" />
                    </div>
                </div>
            )}

            <button
                onClick={handleSaveLimits}
                disabled={isUpdating || !isConnected}
                className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98]
                    ${isUpdating ? 'bg-slate-700 text-slate-400 cursor-wait' : isConnected ? 'bg-primary text-background-dark hover:bg-primary-light shadow-primary/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed opacity-50'}`}
            >
                {isUpdating ? (
                    <span className="flex items-center justify-center gap-2">
                        <RefreshCw size={12} className="animate-spin" />
                        ENVIANDO...
                    </span>
                ) : (isConnected ? 'ATUALIZAR LIMITES' : 'SEM CONEXÃO')}
            </button>
        </div>
    );
};

export default AlarmSettings;
