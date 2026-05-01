import React from 'react';
import { X, Calendar, FileText, BarChart2, CheckCircle2, Clock, Building2, Cpu } from 'lucide-react';
import type { ReportForm } from '../../hooks/useReportGenerator';

// Tipo leve para dispositivos passados ao modal
interface DeviceOption {
    id: string;
    name: string;
    tenantId?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

const VARIABLES = [
    { id: 'temperature', label: 'Temperatura Interna (°C)' },
    { id: 'temp_max', label: 'Temperatura Máxima (°C)' },
    { id: 'temp_min', label: 'Temperatura Mínima (°C)' },
    { id: 'temp_ext', label: 'Temperatura Ambiente (°C)' },
    { id: 'humidity', label: 'Umidade (%)' },
    { id: 'voltage', label: 'Tensão Principal (V)' },
    { id: 'battery', label: 'Bateria (V)' },
    { id: 'door_open', label: 'Status da Porta' },
];

const REPORT_TYPES = [
    {
        id: 'daily',
        label: 'Diário',
        description: 'Usa os horários pré-configurados para esta empresa (ex: 08h e 16h).',
    },
    {
        id: 'monthly',
        label: 'Mensal',
        description: 'Consolida os registros diários do dia 01 até hoje.',
    },
    {
        id: 'custom',
        label: 'Personalizado',
        description: 'Selecione horários específicos para um relatório casual.',
    },
    {
        id: 'detailed',
        label: 'Detalhado',
        description: 'Relatório minuto a minuto para um intervalo de 1 hora.',
    },
];

// ─── Sub-componentes ────────────────────────────────────────────────────────

/** Quadro Rosa: seletores de datas/horas — comportamento varia por tipo */
const PeriodPanel: React.FC<{
    form: ReportForm;
    setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
    onSaveDailyHours: (hours: string[]) => void;
}> = ({ form, setForm, onSaveDailyHours }) => (
    <div className="bg-[#2A0000] p-5 rounded-2xl border-2 border-[#FF0000] space-y-4 shadow-lg shadow-red-500/10">
        <label className="flex items-center gap-2 text-[10px] font-black text-red-100 uppercase tracking-[0.2em] mb-2">
            <Calendar size={13} className="text-red-400" />
            Período do Relatório
        </label>

        {/* Datas — sempre visíveis para Personalizado e Detalhado; ocultas para Diário/Mensal */}
        {(form.report_type === 'custom' || form.report_type === 'detailed') && (
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[9px] font-bold text-slate-300 uppercase mb-1.5 block">Data Início</label>
                        <input
                            type="date"
                            value={form.start_date}
                            onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                            className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500/50 transition-all"
                        />
                    </div>
                    {/* Detalhado usa apenas 1 dia; Personalizado aceita intervalo */}
                    {form.report_type === 'custom' && (
                        <div>
                            <label className="text-[9px] font-bold text-slate-300 uppercase mb-1.5 block">Data Fim</label>
                            <input
                                type="date"
                                value={form.end_date}
                                onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                                className="w-full bg-[#0F110D] border border-red-700/50 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-400 transition-all"
                            />
                        </div>
                    )}
                </div>

                {/* Horários de início/fim — apenas modo Personalizado */}
                {form.report_type === 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] font-bold text-slate-300 uppercase mb-1.5 block">Hora Início</label>
                            <input
                                type="time"
                                value={form.start_time}
                                onChange={(e) => setForm(prev => ({ ...prev, start_time: e.target.value }))}
                                className="w-full bg-[#0F110D] border border-red-700/50 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-400 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-slate-300 uppercase mb-1.5 block">Hora Fim</label>
                            <input
                                type="time"
                                value={form.end_time}
                                onChange={(e) => setForm(prev => ({ ...prev, end_time: e.target.value }))}
                                className="w-full bg-[#0F110D] border border-red-700/50 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-400 transition-all"
                            />
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* DIÁRIO: grade editável de horários pré-definidos */}
        {form.report_type === 'daily' && (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-red-100 uppercase tracking-widest">
                        Horários do Relatório Diário
                    </label>
                    <span className="text-[8px] text-slate-300 font-bold">{form.selected_hours?.length || 0} selecionados</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 border border-red-700/50 p-3 rounded-2xl bg-[#0F110D] max-h-36 overflow-y-auto custom-scrollbar">
                    {HOURS.map(hour => (
                        <button
                            key={hour}
                            onClick={() => {
                                const current = form.selected_hours || [];
                                const next = current.includes(hour)
                                    ? current.filter(h => h !== hour)
                                    : [...current, hour].sort();
                                // Persiste no localStorage e atualiza o estado
                                onSaveDailyHours(next);
                            }}
                            className={`py-1.5 rounded-lg text-[9px] font-bold transition-all border ${form.selected_hours?.includes(hour)
                                ? 'bg-red-600/40 text-red-200 border-red-500'
                                : 'bg-[#1A1D17] text-slate-400 border-[#2A2E24] hover:border-red-600/60'
                                }`}
                        >
                            {hour}
                        </button>
                    ))}
                </div>
                <p className="text-[9px] text-slate-600 italic px-1 leading-relaxed">
                    Esses horários definem quando a coleta diária é registrada. O Mensal usa os mesmos.
                </p>
            </div>
        )}

        {/* MENSAL: informativo — herda horários do Diário */}
        {form.report_type === 'monthly' && (
            <div className="bg-red-500/20 border border-[#FF0000] rounded-xl p-3">
                <p className="text-[9px] font-bold text-red-100 uppercase tracking-widest mb-1">Período Automático: Mês Atual</p>
                <p className="text-[10px] text-slate-200 font-medium leading-relaxed">
                    Utiliza os mesmos horários configurados no Diário, do 1º dia do mês até hoje.
                </p>
            </div>
        )}
    </div>
);

/** Quadro Verde: painéis dinâmicos — só abre para Personalizado e Detalhado */
const ReportTypePanel: React.FC<{ form: ReportForm; setForm: React.Dispatch<React.SetStateAction<ReportForm>> }> = ({ form, setForm }) => {
    const showExpandedPanel = form.report_type === 'custom' || form.report_type === 'detailed';

    return (
        <div className="bg-[#001A06] p-5 rounded-2xl border-2 border-[#00FF41] space-y-4 shadow-lg shadow-emerald-500/10">
            <label className="flex items-center gap-2 text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em] mb-2">
                <FileText size={13} className="text-[#00FF41]" />
                Tipo de Relatório
            </label>

            {/* Botões de seleção de tipo — sempre visíveis */}
            <div className="grid grid-cols-2 gap-2">
                {REPORT_TYPES.map(type => (
                    <button
                        key={type.id}
                        onClick={() => setForm(prev => ({ ...prev, report_type: type.id as ReportForm['report_type'] }))}
                        className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border text-left ${form.report_type === type.id
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
                            : 'bg-[#1A1D17] text-slate-300 border-[#2A2E24] hover:border-emerald-500/60'
                            }`}
                    >
                        {type.label}
                    </button>
                ))}
            </div>

            {/* Descrição do tipo selecionado — sempre visível */}
            <p className="text-[10px] text-slate-200 font-medium leading-relaxed px-1">
                {REPORT_TYPES.find(t => t.id === form.report_type)?.description}
            </p>

            {/* Painel expandido — só para Personalizado e Detalhado */}
            {showExpandedPanel && (
                <div className="pt-2 border-t border-[#2A2E24] space-y-3">
                    {form.report_type === 'custom' && (
                        <>
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black text-slate-200 uppercase tracking-widest">
                                    Selecionar Horários
                                </label>
                                <button
                                    onClick={() => setForm(prev => ({ ...prev, selected_hours: [], use_all_hours: true }))}
                                    className="text-[8px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-colors"
                                >
                                    Limpar
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 border border-emerald-700/50 p-3 rounded-2xl bg-[#0F110D] max-h-36 overflow-y-auto custom-scrollbar">
                                {HOURS.map(hour => (
                                    <button
                                        key={hour}
                                        onClick={() => {
                                            const current = form.selected_hours || [];
                                            const next = current.includes(hour)
                                                ? current.filter(h => h !== hour)
                                                : [...current, hour];
                                            setForm(prev => ({ ...prev, selected_hours: next, use_all_hours: next.length === 0 }));
                                        }}
                                        className={`py-1.5 rounded-lg text-[9px] font-bold transition-all border ${form.selected_hours?.includes(hour)
                                            ? 'bg-emerald-600/40 text-emerald-200 border-emerald-500'
                                            : 'bg-[#1A1D17] text-slate-400 border-[#2A2E24] hover:border-emerald-600/60'
                                            }`}
                                    >
                                        {hour}
                                    </button>
                                ))}
                            </div>
                            {form.selected_hours?.length === 0 && (
                                <p className="text-[9px] text-slate-600 italic px-1">Nenhum horário selecionado — todos os registros serão incluídos.</p>
                            )}
                        </>
                    )}

                    {form.report_type === 'detailed' && (
                        <>
                            <div className="bg-amber-600/15 border border-amber-500/40 p-3 rounded-xl">
                                <p className="text-[9px] font-bold text-amber-300 leading-relaxed">
                                    Selecione o dia (no quadro vermelho) e o horário de início abaixo. O relatório cobrirá 1 hora de registros minuto a minuto.
                                </p>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-slate-300 uppercase mb-1.5 block flex items-center gap-1.5">
                                    <Clock size={10} />
                                    Horário de Início (janela de 1h)
                                </label>
                                <select
                                    value={form.detailed_hour_start}
                                    onChange={(e) => setForm(prev => ({ ...prev, detailed_hour_start: e.target.value }))}
                                    className="w-full bg-[#0F110D] border border-emerald-700/50 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-400 transition-all"
                                >
                                    {HOURS.map(h => (
                                        <option key={h} value={h}>
                                            {h} — {(parseInt(h) + 1).toString().padStart(2, '0')}:00
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

/** Quadro Azul: seleção de variáveis de telemetria */
const VariablesPanel: React.FC<{
    form: ReportForm;
    setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
}> = ({ form, setForm }) => {
    const toggleAll = () => {
        const allIds = VARIABLES.map(v => v.id);
        const allSelected = allIds.every(id => form.selected_variables?.includes(id));
        setForm(prev => ({ ...prev, selected_variables: allSelected ? [] : allIds }));
    };

    return (
        <div className="bg-[#000A1A] p-5 rounded-2xl border-2 border-[#0066FF] space-y-4 shadow-lg shadow-blue-500/10">
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[10px] font-black text-blue-100 uppercase tracking-[0.2em]">
                    <BarChart2 size={13} className="text-[#0066FF]" />
                    Variáveis do PDF
                </label>
                <button
                    onClick={toggleAll}
                    className="text-[8px] font-black text-blue-300/80 hover:text-blue-300 uppercase tracking-widest transition-colors"
                >
                    {VARIABLES.every(v => form.selected_variables?.includes(v.id)) ? 'Desmarcar Todas' : 'Marcar Todas'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
                {VARIABLES.map(v => {
                    const selected = form.selected_variables?.includes(v.id);
                    return (
                        <button
                            key={v.id}
                            onClick={() => {
                                const current = form.selected_variables || [];
                                const next = current.includes(v.id)
                                    ? current.filter(id => id !== v.id)
                                    : [...current, v.id];
                                setForm(prev => ({ ...prev, selected_variables: next }));
                            }}
                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${selected
                                ? 'bg-blue-600 text-white border-blue-400'
                                : 'bg-[#1A1D17] text-slate-300 border-[#2A2E24] hover:border-blue-600/60'
                                }`}
                        >
                            <span>{v.label}</span>
                            {selected ? (
                                <CheckCircle2 size={13} className="text-blue-300 shrink-0" />
                            ) : (
                                <div className="size-3 rounded-full border border-slate-700 shrink-0" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Linha divisória + filtro de empresa REMOVIDO — agora está na SelectorBar acima dos cards */}
        </div>
    );
};

// ─── SelectorBar: empresa e dispositivo acima dos 3 quadros ─────────────────
/** Barra com dropdowns de Empresa e Dispositivo, exibida para admin/manager */
const SelectorBar: React.FC<{
    form: ReportForm;
    setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
    availableTenants: any[];
    devices: DeviceOption[];
    currentUser: any;
}> = ({ form, setForm, availableTenants, devices, currentUser }) => {
    const isPrivileged =
        currentUser?.role === 'admin' ||
        currentUser?.role === 'manager' ||
        currentUser?.role === 'gestor';

    // Dispositivos filtrados pela empresa selecionada
    const filteredDevices = form.tenant_id
        ? devices.filter(d => d.tenantId === form.tenant_id)
        : devices;

    if (!isPrivileged) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5 p-4 bg-[#0F110D]/40 rounded-2xl border border-[#2A2E24]">
            {/* Empresa */}
            <div>
                <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    <Building2 size={10} />
                    Empresa
                </label>
                <select
                    value={form.tenant_id}
                    onChange={(e) => setForm(prev => ({ ...prev, tenant_id: e.target.value, device_id: '' }))}
                    className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/50 transition-all"
                >
                    <option value="">Todas as Empresas</option>
                    {availableTenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

            {/* Dispositivo */}
            <div>
                <label className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    <Cpu size={10} />
                    Dispositivo
                </label>
                <select
                    value={form.device_id}
                    onChange={(e) => setForm(prev => ({ ...prev, device_id: e.target.value }))}
                    className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/50 transition-all"
                >
                    <option value="">Geral (Todos os Dispositivos)</option>
                    {filteredDevices.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

// ─── Interface pública ────────────────────────────────────────────────────────
interface ReportModalProps {
    show: boolean;
    onClose: () => void;
    reportForm: ReportForm;
    setReportForm: React.Dispatch<React.SetStateAction<ReportForm>>;
    saveDailyHours: (hours: string[]) => void;
    generatingReport: boolean;
    onGenerate: () => Promise<void>;
    availableTenants: any[];
    supabaseDevices: DeviceOption[]; // Lista completa de dispositivos para filtrar
    currentUser: any;
}

// ─── Componente principal ─────────────────────────────────────────────────────
const ReportModal: React.FC<ReportModalProps> = ({
    show,
    onClose,
    reportForm,
    setReportForm,
    saveDailyHours,
    generatingReport,
    onGenerate,
    availableTenants,
    supabaseDevices,
    currentUser,
}) => {
    if (!show) return null;

    const canGenerate = !generatingReport && (reportForm.selected_variables?.length ?? 0) > 0;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#1A1D17] rounded-3xl w-full max-w-5xl border border-[#2A2E24] shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="px-8 py-5 border-b border-[#2A2E24] flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Gerar Relatório de Monitoramento</h3>
                            <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-widest font-bold">Configuração da Exportação PDF</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                {/* Corpo */}
                <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {/* Seletor de Empresa + Dispositivo — apenas para admin/manager */}
                    <SelectorBar
                        form={reportForm}
                        setForm={setReportForm}
                        availableTenants={availableTenants}
                        devices={supabaseDevices}
                        currentUser={currentUser}
                    />

                    {/* 3 quadros: Rosa, Verde, Azul */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <PeriodPanel form={reportForm} setForm={setReportForm} onSaveDailyHours={saveDailyHours} />
                        <ReportTypePanel form={reportForm} setForm={setReportForm} />
                        <VariablesPanel form={reportForm} setForm={setReportForm} />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-black/40 border-t border-[#2A2E24] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <div className={`size-2 rounded-full ${generatingReport ? 'bg-primary animate-ping' : 'bg-emerald-500'}`} />
                        {generatingReport ? 'Buscando dados...' : 'Tudo pronto para exportação'}
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 text-xs font-black text-slate-500 hover:text-slate-300 uppercase tracking-[0.2em] transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onGenerate}
                            disabled={!canGenerate}
                            className="px-8 py-3 bg-gradient-to-br from-primary to-[#004299] text-white rounded-2xl text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-2.5 disabled:opacity-40 uppercase tracking-[0.15em]"
                        >
                            {generatingReport ? (
                                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <FileText size={16} />
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
