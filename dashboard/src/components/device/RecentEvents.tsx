import React from 'react';
import { Download } from 'lucide-react';
import { getEventIcon, getEventColor, formatEventTime } from '../../utils/statusUtils';

interface RecentEventsProps {
    events: any[];
}

const RecentEvents: React.FC<RecentEventsProps> = ({ events }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-5 font-heading">Eventos Recentes</h4>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {events && events.length > 0 ? (
                        events.map((e: any, i) => {
                            const colors = getEventColor(e.type);
                            return (
                                <div key={i} className={`flex gap-4 p-4 rounded-xl border ${colors.border} ${colors.bg} hover:brightness-110 transition-all group`}>
                                    <div className={`${colors.icon} mt-0.5 transition-colors`}>
                                        {getEventIcon(e.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`${colors.text} text-sm font-medium leading-snug break-words`}>{e.msg || e.message || 'Evento'}</p>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                            <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">{formatEventTime(e.timestamp)}</span>
                                            {(e.userName || e.userEmail) && (
                                                <span className="text-primary/70 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                    • Por: {e.userName || 'Sistema'}
                                                    <span className="text-slate-500 lowercase opacity-60">({e.userEmail})</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-4 text-center text-slate-500 text-xs italic">Nenhum evento registrado recentemente.</div>
                    )}
                </div>
            </div>
            <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg flex flex-col justify-center items-center text-center">
                <div className="size-16 bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center text-primary mb-5">
                    <Download size={28} />
                </div>
                <h4 className="text-base font-bold mb-2 text-white">Exportação de Dados</h4>
                <p className="text-xs text-slate-400 mb-6 max-w-[200px]">Gere um relatório detalhado em CSV com todo o histórico deste sensor.</p>
                <button className="w-full py-3 bg-[#0F110D] border border-[#2A2E24] rounded-xl text-xs font-bold text-white uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-colors">
                    EXPORTAR HISTÓRICO
                </button>
            </div>
        </div>
    );
};

export default RecentEvents;
