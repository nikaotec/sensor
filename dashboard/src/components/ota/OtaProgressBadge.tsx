import React from 'react';
import { CheckCircle2, XCircle, Download, Cpu, Clock } from 'lucide-react';
import type { OtaStatus } from '../../types/ota';

interface OtaProgressBadgeProps {
    status: OtaStatus;
    onDismiss?: () => void;
}

const PHASE_CONFIG = {
    idle: { label: 'Aguardando', color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700', icon: <Clock size={12} /> },
    pending: { label: 'Aguardando...', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: <Clock size={12} className="animate-pulse" /> },
    downloading: { label: 'Baixando', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30', icon: <Download size={12} className="animate-bounce" /> },
    installing: { label: 'Instalando', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', icon: <Cpu size={12} className="animate-pulse" /> },
    success: { label: 'Concluído ✓', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: <CheckCircle2 size={12} /> },
    error: { label: 'Erro', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <XCircle size={12} /> },
} as const;

const OtaProgressBadge: React.FC<OtaProgressBadgeProps> = ({ status, onDismiss }) => {
    const cfg = PHASE_CONFIG[status.phase] ?? PHASE_CONFIG.idle;
    const showBar = status.phase === 'downloading' || status.phase === 'installing';
    const isTerminal = status.phase === 'success' || status.phase === 'error';

    return (
        <div
            className={`rounded-xl border px-3 py-2 ${cfg.bg} ${cfg.border} flex flex-col gap-1.5 text-[11px] font-bold`}
            data-testid="ota-progress-badge"
        >
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 ${cfg.color}`}>
                    {cfg.icon}
                    <span className="uppercase tracking-widest">{cfg.label}</span>
                    {status.phase === 'downloading' && (
                        <span className="text-slate-400 font-normal">{status.progress}%</span>
                    )}
                </div>
                {isTerminal && onDismiss && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                        className="text-slate-500 hover:text-slate-300 transition-colors ml-2"
                        title="Fechar"
                    >
                        <XCircle size={13} />
                    </button>
                )}
            </div>

            {/* Progress bar */}
            {showBar && (
                <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${status.phase === 'installing' ? 'bg-violet-500 animate-pulse' : 'bg-sky-500'}`}
                        style={{ width: `${status.progress}%` }}
                    />
                </div>
            )}

            {/* Error message */}
            {status.phase === 'error' && status.errorMsg && (
                <p className="text-[10px] text-red-300 font-normal">{status.errorMsg}</p>
            )}

            {/* Version on success */}
            {status.phase === 'success' && status.version && (
                <p className="text-[10px] text-emerald-300 font-normal">v{status.version}</p>
            )}
        </div>
    );
};

export default OtaProgressBadge;
