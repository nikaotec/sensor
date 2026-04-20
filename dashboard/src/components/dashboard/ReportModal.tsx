import React from 'react';
import {
    X,
    Calendar,
    Clock,
    FileText,
    History,
    CheckCircle2
} from 'lucide-react';
import type { ReportForm } from '../../hooks/useReportGenerator';

interface ReportModalProps {
    show: boolean;
    onClose: () => void;
    reportForm: ReportForm;
    setReportForm: React.Dispatch<React.SetStateAction<ReportForm>>;
    generatingReport: boolean;
    applyPreset: (presetId: string) => void;
    onGenerate: () => Promise<void>;
    availableTenants: any[];
    supabaseDevices: any[];
    currentUser: any;
}

const ReportModal: React.FC<ReportModalProps> = ({
    show,
    onClose,
    reportForm,
    setReportForm,
    generatingReport,
    applyPreset,
    onGenerate,
    availableTenants,
    supabaseDevices,
    currentUser
}) => {
    if (!show) return null;

    const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1A1D16] rounded-3xl w-full max-w-2xl border border-gray-200 dark:border-[#2A2E24] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header do Modal */}
                <div className="px-8 py-6 border-b border-gray-100 dark:border-[#2A2E24] flex items-center justify-between bg-gray-50/50 dark:bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-text-dark dark:text-white">Gerar Relatório de Monitoramento</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-widest font-bold">Configuração da Exportação PDF</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Seção de Filtros */}
                        <div className="space-y-6">
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                                    <History size={14} className="text-primary" />
                                    Período do Relatório
                                </label>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="bg-gray-50 dark:bg-[#0F110D] p-3 rounded-2xl border border-gray-100 dark:border-[#2A2E24]">
                                        <p className="text-[9px] text-slate-500 uppercase font-black mb-2 opacity-60">Presets Rápidos</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'daily_8_16', label: 'Diário (8h/16h)' },
                                                { id: 'month_8_16', label: 'Mensal (8h/16h)' },
                                                { id: 'custom', label: 'Personalizado' }
                                            ].map(preset => (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => applyPreset(preset.id)}
                                                    className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${reportForm.report_preset === preset.id
                                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                        : 'bg-white dark:bg-[#1A1D16] text-slate-500 border-gray-200 dark:border-[#2A2E24] hover:border-primary/50'
                                                        }`}
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Data Início</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={reportForm.start_date}
                                            onChange={(e) => setReportForm({ ...reportForm, start_date: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-[#0F110D] border border-gray-100 dark:border-[#2A2E24] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                        />
                                        <Calendar size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Data Fim</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={reportForm.end_date}
                                            onChange={(e) => setReportForm({ ...reportForm, end_date: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-[#0F110D] border border-gray-100 dark:border-[#2A2E24] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                        />
                                        <Calendar size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Hora Início</label>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            value={reportForm.start_time}
                                            onChange={(e) => setReportForm({ ...reportForm, start_time: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-[#0F110D] border border-gray-100 dark:border-[#2A2E24] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                        />
                                        <Clock size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Hora Fim</label>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            value={reportForm.end_time}
                                            onChange={(e) => setReportForm({ ...reportForm, end_time: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-[#0F110D] border border-gray-100 dark:border-[#2A2E24] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                        />
                                        <Clock size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Coluna Direita: Seleção de Dispositivo e Horários */}
                        <div className="space-y-6">
                            {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Selecionar Empresa</label>
                                    <select
                                        value={reportForm.tenant_id}
                                        onChange={(e) => setReportForm({ ...reportForm, tenant_id: e.target.value, device_id: '' })}
                                        className="w-full bg-gray-50 dark:bg-[#0F110D] border border-gray-100 dark:border-[#2A2E24] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                    >
                                        <option value="">Todas as Empresas</option>
                                        {availableTenants.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Dispositivo Específico</label>
                                <select
                                    value={reportForm.device_id}
                                    onChange={(e) => setReportForm({ ...reportForm, device_id: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-[#0F110D] border border-gray-100 dark:border-[#2A2E24] rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all dark:text-white"
                                >
                                    <option value="">Geral (Todos os Dispositivos)</option>
                                    {supabaseDevices
                                        .filter(d => !reportForm.tenant_id || d.tenantId === reportForm.tenant_id)
                                        .map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                </select>
                            </div>

                            {/* Filtro de Horários */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Filtrar Horários</label>
                                    <button
                                        onClick={() => setReportForm({
                                            ...reportForm,
                                            use_all_hours: !reportForm.use_all_hours,
                                            selected_hours: !reportForm.use_all_hours ? [] : reportForm.selected_hours
                                        })}
                                        className={`text-[9px] font-black px-2 py-1 rounded transition-all uppercase tracking-tighter ${reportForm.use_all_hours ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                    >
                                        {reportForm.use_all_hours ? 'Todas as Leituras' : 'Selecionar Horários'}
                                    </button>
                                </div>

                                {!reportForm.use_all_hours && (
                                    <div className="grid grid-cols-4 gap-2 border border-gray-100 dark:border-[#2A2E24] p-3 rounded-2xl bg-gray-50/50 dark:bg-black/20 overflow-y-auto max-h-32 custom-scrollbar">
                                        {HOURS.map(hour => (
                                            <button
                                                key={hour}
                                                onClick={() => {
                                                    const current = reportForm.selected_hours || [];
                                                    const next = current.includes(hour)
                                                        ? current.filter(h => h !== hour)
                                                        : [...current, hour];
                                                    setReportForm({ ...reportForm, selected_hours: next });
                                                }}
                                                className={`px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all border ${reportForm.selected_hours?.includes(hour)
                                                    ? 'bg-primary/10 text-primary border-primary/30'
                                                    : 'bg-white dark:bg-[#1A1D16] text-slate-400 border-gray-200 dark:border-[#2A2E24]'
                                                    }`}
                                            >
                                                {hour}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer do Modal */}
                <div className="px-8 py-6 bg-gray-50/80 dark:bg-black/40 border-t border-gray-100 dark:border-[#2A2E24] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-tight">
                        <CheckCircle2 size={14} className={generatingReport ? 'animate-pulse text-primary' : 'text-emerald-500'} />
                        {generatingReport ? 'Processando dados no servidor...' : 'Tudo pronto para exportação'}
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors uppercase tracking-widest underline decoration-2 decoration-transparent hover:decoration-slate-300 dark:hover:decoration-slate-500 underline-offset-4"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onGenerate}
                            disabled={generatingReport}
                            className="px-8 py-3 bg-gradient-to-br from-primary to-[#004299] text-white rounded-2xl text-sm font-black hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                        >
                            {generatingReport ? (
                                <>
                                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Gerando...</span>
                                </>
                            ) : (
                                <>
                                    <FileText size={18} />
                                    <span>Gerar PDF Agora</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;
