import React from 'react';
import { RefreshCw } from 'lucide-react';

interface HysteresisControlProps {
    hysteresisOnInput: string;
    setHysteresisOnInput: (value: string) => void;
    hysteresisOffInput: string;
    setHysteresisOffInput: (value: string) => void;
    handleSaveHysteresis: () => void;
    isUpdating: boolean;
    isConnected: boolean;
    setRemoteSync: (value: boolean) => void;
}

const HysteresisControl: React.FC<HysteresisControlProps> = ({
    hysteresisOnInput,
    setHysteresisOnInput,
    hysteresisOffInput,
    setHysteresisOffInput,
    handleSaveHysteresis,
    isUpdating,
    isConnected,
    setRemoteSync
}) => {
    return (
        <div className="bg-[#0A0D08] p-4 rounded-xl border border-blue-500/20 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
            <div className="flex items-center gap-2 mb-3">
                <div className="size-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[11px] font-bold text-white uppercase tracking-widest">Histerese (Relé Automático)</span>
            </div>
            <p className="text-[9px] text-slate-500 mb-3">Temp &gt;= ON Liga | Temp &lt;= OFF Desliga</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 uppercase font-bold tracking-widest px-1">Ligar Máx (°C)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={hysteresisOnInput}
                        onChange={(e) => { setHysteresisOnInput(e.target.value); setRemoteSync(false); }}
                        className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500/50 focus:outline-none transition-colors"
                        placeholder="0.0"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-400 uppercase font-bold tracking-widest px-1">Desligar Mín (°C)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={hysteresisOffInput}
                        onChange={(e) => { setHysteresisOffInput(e.target.value); setRemoteSync(false); }}
                        className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500/50 focus:outline-none transition-colors"
                        placeholder="0.0"
                    />
                </div>
            </div>
            <button
                onClick={handleSaveHysteresis}
                disabled={isUpdating || !isConnected}
                className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]
                    ${isUpdating ? 'bg-slate-700 text-slate-400 cursor-wait' : isConnected ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed opacity-50'}`}
            >
                {isUpdating ? (
                    <span className="flex items-center justify-center gap-2">
                        <RefreshCw size={12} className="animate-spin" />
                        ENVIANDO...
                    </span>
                ) : (isConnected ? 'ATUALIZAR HISTERESE' : 'SEM CONEXÃO')}
            </button>
        </div>
    );
};

export default HysteresisControl;
