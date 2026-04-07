import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useReports, useSupabaseData } from '../hooks/useSupabaseData';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import {
    CalendarRange, Download, Zap, TrendingUp, Timer,
    AlertOctagon, Lightbulb, Plus, Edit2, Trash2,
    Clock, Smartphone, Mail, Check, X
} from 'lucide-react';

interface ReportsProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel') => void;
}

const Reports: React.FC<ReportsProps> = ({ onNavigate }) => {
    const { currentTenant, availableTenants } = useTenant();
    const { currentUser } = useAuth();
    const { reportConfigs, saveReportConfig, deleteReportConfig, isLoading } = useReports(currentTenant?.id || 'all');
    const { devices, events } = useSupabaseData(currentTenant?.id || 'all', undefined, currentUser?.role);

    const [showModal, setShowModal] = useState(false);
    const [editingReport, setEditingReport] = useState<any>(null);

    if (!currentTenant) return <div className="flex h-screen items-center justify-center bg-background-dark text-white">Carregando dados...</div>;

    // --- CALCULATE REAL METRICS ---
    const devicesOnline = devices.filter(d => d.status === 'online').length;
    const devicesTotal = devices.length;
    const availabilityRate = devicesTotal > 0 ? Math.round((devicesOnline / devicesTotal) * 100) : 0;

    const devsWithTemp = devices.filter(d => d.telemetry?.temp !== undefined);
    const avgTemp = devsWithTemp.length > 0
        ? (devsWithTemp.reduce((acc, d) => acc + (d.telemetry.temp || 0), 0) / devsWithTemp.length).toFixed(1)
        : '--';

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentAlerts = events.filter(e => e.type.startsWith('ALERTA_') && e.timestamp >= last24h).length;

    const batteryCritical = devices.filter(d => d.telemetry?.batteryVoltage !== undefined && d.telemetry.batteryVoltage < 3.4).length;

    // Status Pie Data
    const statusPieData = [
        { name: 'Online', value: devicesOnline, color: '#10b981' },
        { name: 'Offline', value: devicesTotal - devicesOnline, color: '#ef4444' }
    ].filter(d => d.value > 0);

    // Alertas por Dispositivo (Bar Chart)
    const deviceAlertMap: Record<string, number> = {};
    events.filter(e => e.type.startsWith('ALERTA_')).forEach(e => {
        const dName = devices.find(d => d.id === e.deviceId)?.name || e.deviceId.substring(0, 8);
        deviceAlertMap[dName] = (deviceAlertMap[dName] || 0) + 1;
    });

    const alertsPerDeviceData = Object.entries(deviceAlertMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 devices

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const selectedTenantId = currentTenant.id === 'all' ? formData.get('tenant_id') : currentTenant.id;

        if (!selectedTenantId || selectedTenantId === 'all') {
            alert("Por favor, selecione uma empresa específica para agendar um relatório.");
            return;
        }

        const config = {
            id: editingReport?.id,
            tenant_id: selectedTenantId as string,
            name: formData.get('name'),
            type: formData.get('type'),
            device_id: formData.get('device_id') || null,
            schedule_type: formData.get('schedule_type'),
            schedule_time: formData.get('schedule_time'),
            schedule_day: parseInt(formData.get('schedule_day') as string) || null,
            channels: formData.getAll('channels'),
            recipients: {
                emails: (formData.get('emails') as string).split(',').map(s => s.trim()).filter(s => s),
                phones: (formData.get('phones') as string).split(',').map(s => s.trim()).filter(s => s)
            },
            enabled: editingReport ? editingReport.enabled : true
        };

        try {
            await saveReportConfig(config);
            setShowModal(false);
            setEditingReport(null);
        } catch (err: any) {
            console.error("Erro ao salvar relatório:", err);
            alert("Erro ao salvar: " + (err.message || "Verifique os dados."));
        }
    };

    const handleToggle = async (config: any) => {
        await saveReportConfig({ ...config, enabled: !config.enabled });
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir este agendamento?")) {
            await deleteReportConfig(id);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeItem="reports" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative bg-background-light text-text-dark">
                {/* HEADER */}
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-text-dark tracking-tight">Relatórios e Insights</h2>
                        <p className="text-slate-500 text-xs font-normal">Ecossistema {currentTenant.name}</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-4 py-2.5 bg-[#0F110D] border border-[#2A2E24] rounded-xl text-sm font-bold text-white flex items-center gap-2 hover:bg-[#2A2E24]/50 transition-colors">
                            <CalendarRange size={16} className="text-slate-400" />
                            Últimos 30 Dias
                        </button>
                        <button className="px-4 py-2.5 bg-primary text-background-dark rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]">
                            <Download size={16} />
                            Exportar PDF
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-10 py-6 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[
                            { label: 'Disponibilidade', value: `${availabilityRate}%`, icon: <Zap size={22} />, colorClass: 'text-primary bg-primary/10 border-primary/20', iconColor: 'text-primary' },
                            { label: 'Temp. Média', value: `${avgTemp}°C`, icon: <TrendingUp size={22} />, colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20', iconColor: 'text-amber-500' },
                            { label: 'Dispositivos', value: `${devicesOnline}/${devicesTotal}`, icon: <Timer size={22} />, colorClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', iconColor: 'text-emerald-400' },
                            { label: 'Alertas (24h)', value: String(recentAlerts), icon: <AlertOctagon size={22} />, colorClass: 'text-[#E63946] bg-[#E63946]/10 border-[#E63946]/20', iconColor: 'text-[#E63946]' },
                        ].map((stat, i) => (
                            <div key={i} className="flex gap-4 rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-5 items-center hover:border-[#DFDFDF]/30 transition-all shadow-lg">
                                <div className={`${stat.colorClass} p-3 rounded-xl border`}>
                                    {stat.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider font-heading">{stat.label}</h3>
                                    <p className="text-2xl font-bold text-white tracking-tight mt-1">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                        <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                            <h3 className="text-lg font-bold leading-tight tracking-tight text-white/90 font-heading mb-6">Alertas Recentes por Sensor</h3>
                            <div className="h-[300px] min-h-[300px] w-full">
                                {alertsPerDeviceData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={alertsPerDeviceData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2E24" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dx={-10} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0F110D', border: '1px solid #2A2E24', borderRadius: '12px' }}
                                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                                cursor={{ fill: '#2A2E24', opacity: 0.4 }}
                                            />
                                            <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum alerta registrado.</div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                            <h3 className="text-lg font-bold leading-tight tracking-tight text-white/90 font-heading mb-6">Status da Frota em Tempo Real</h3>
                            <div className="h-[300px] min-h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusPieData}
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {statusPieData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0F110D', border: '1px solid #2A2E24', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8 overflow-hidden rounded-2xl border border-[#2A2E24] bg-[#1A1D17] shadow-lg">
                        <div className="flex items-center justify-between border-b border-[#2A2E24] bg-[#0F110D]/50 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Relatórios Automáticos</h3>
                                    <p className="text-xs text-slate-400">Agendamentos via WhatsApp e E-mail</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setEditingReport(null); setShowModal(true); }}
                                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-background-dark hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                            >
                                <Plus size={16} />
                                Novo Agendamento
                            </button>
                        </div>

                        <div className="p-0">
                            {isLoading ? (
                                <div className="p-10 text-center text-slate-400">Carregando agendamentos...</div>
                            ) : reportConfigs.length === 0 ? (
                                <div className="p-10 text-center text-slate-400">Nenhum agendamento configurado.</div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-[#0F110D]/30 text-xs font-bold uppercase text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4">Nome / Tipo</th>
                                            <th className="px-6 py-4">Frequência</th>
                                            <th className="px-6 py-4">Canais</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#2A2E24]">
                                        {reportConfigs.map((config) => (
                                            <tr key={config.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-white">{config.name}</div>
                                                    <div className="text-xs text-slate-400">{config.type === 'company' ? 'Empresa Inteira' : `Dispositivo: ${config.device_id}`}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-slate-300">
                                                        {config.schedule_type === 'daily' && `Todo dia às ${config.schedule_time}`}
                                                        {config.schedule_type === 'weekly' && `Toda ${['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][config.schedule_day || 0]} às ${config.schedule_time}`}
                                                        {config.schedule_type === 'monthly' && `Todo dia ${config.schedule_day} às ${config.schedule_time}`}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        {config.channels?.includes('whatsapp') && (
                                                            <span title="WhatsApp"><Smartphone size={14} className="text-emerald-400" /></span>
                                                        )}
                                                        {config.channels?.includes('email') && (
                                                            <span title="E-mail"><Mail size={14} className="text-blue-400" /></span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleToggle(config)}
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all ${config.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}
                                                    >
                                                        {config.enabled ? <Check size={12} /> : <X size={12} />}
                                                        {config.enabled ? 'Ativo' : 'Pausado'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm("Deseja gerar e enviar este relatório agora?")) {
                                                                try {
                                                                    // URL do Webhook do n8n (será preenchido pelo usuário ou via config)
                                                                    await fetch('https://n8n.nikaotech.com/webhook/generate-report', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ config_id: config.id, type: config.type, tenant_id: config.tenant_id })
                                                                    });
                                                                    alert("Solicitação enviada com sucesso!");
                                                                } catch (err) {
                                                                    alert("Erro ao solicitar relatório.");
                                                                }
                                                            }
                                                        }}
                                                        className="p-2 text-primary hover:text-white transition-colors"
                                                        title="Gerar Agora"
                                                    >
                                                        <Plus size={16} className="rotate-45" /> {/* Simulating a play icon or just use Plus for now */}
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingReport(config); setShowModal(true); }}
                                                        className="p-2 text-slate-400 hover:text-white transition-colors"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(config.id)}
                                                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-primary/10 border border-primary/20 p-8 rounded-2xl text-center shadow-lg relative overflow-hidden group hover:border-primary/40 transition-all">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="size-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary shadow-[0_0_30px_rgba(56,189,248,0.3)]">
                            <Lightbulb size={32} className="animate-pulse" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold mb-3 text-white tracking-tight">Insight de Inteligência Artificial</h3>
                        <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
                            {recentAlerts > 5 ? (
                                <>Detectamos uma alta incidência de alertas (<strong className="text-primary">{recentAlerts}</strong> nas últimas 24h) na unidade <strong className="text-white">{currentTenant.name}</strong>. Recomendamos uma revisão preventiva nos equipamentos com maior frequência de incidentes.</>
                            ) : batteryCritical > 0 ? (
                                <>Atenção! Identificamos <strong className="text-primary">{batteryCritical}</strong> dispositivo(s) com nível de bateria crítico na empresa <strong className="text-white">{currentTenant.name}</strong>. Agende a troca para evitar perda de dados.</>
                            ) : (
                                <>A operação na unidade <strong className="text-white">{currentTenant.name}</strong> apresenta estabilidade térmica ideal. Mantendo este padrão, a vida útil dos compressores pode ser estendida em até <strong className="text-primary">15%</strong>.</>
                            )}
                        </p>
                        <button className="mt-6 px-6 py-2.5 bg-primary text-background-dark rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]">
                            DETALHAR OPERAÇÃO
                        </button>
                    </div>
                </div>
            </main>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-[#1A1D17] border border-[#2A2E24] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between border-b border-[#2A2E24] p-6">
                            <h3 className="text-xl font-bold text-white">{editingReport ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nome do Agendamento</label>
                                <input name="name" defaultValue={editingReport?.name} placeholder="Ex: Relatório Manhã Diário" required className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors" />
                            </div>
                            {currentTenant.id === 'all' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Empresa</label>
                                    <select
                                        name="tenant_id"
                                        defaultValue={editingReport?.tenant_id}
                                        required
                                        className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors"
                                    >
                                        <option value="">Selecione uma empresa</option>
                                        {availableTenants.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Tipo</label>
                                    <select
                                        name="type"
                                        defaultValue={editingReport?.type || 'company'}
                                        required
                                        className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors"
                                        onChange={(e) => setEditingReport({ ...editingReport, type: e.target.value })}
                                    >
                                        <option value="company">Empresa Inteira</option>
                                        <option value="device">Por Dispositivo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Frequência</label>
                                    <select name="schedule_type" defaultValue={editingReport?.schedule_type || 'daily'} required className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors">
                                        <option value="daily">Diário</option>
                                        <option value="weekly">Semanal</option>
                                        <option value="monthly">Mensal</option>
                                    </select>
                                </div>
                            </div>

                            {(editingReport?.type === 'device' || (!editingReport && false)) && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Dispositivo</label>
                                    <select name="device_id" defaultValue={editingReport?.device_id} required className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors">
                                        <option value="">Selecione um dispositivo</option>
                                        {devices.map(d => (
                                            <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Horário</label>
                                    <input name="schedule_time" type="time" defaultValue={editingReport?.schedule_time || '08:00'} required className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Dia (Se Semanal/Mensal)</label>
                                    <input name="schedule_day" type="number" min="0" max="31" defaultValue={editingReport?.schedule_day || 0} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Canais de Envio</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                        <input type="checkbox" name="channels" value="whatsapp" defaultChecked={editingReport?.channels?.includes('whatsapp')} className="accent-primary" />
                                        WhatsApp
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                        <input type="checkbox" name="channels" value="email" defaultChecked={editingReport?.channels?.includes('email')} className="accent-primary" />
                                        E-mail
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">E-mails (separados por vírgula)</label>
                                <textarea name="emails" defaultValue={editingReport?.recipients?.emails?.join(', ')} placeholder="email@exemplo.com, outro@exemplo.com" className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors h-20 resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Telefones (separados por vírgula)</label>
                                <input name="phones" defaultValue={editingReport?.recipients?.phones?.join(', ')} placeholder="5511999999999, 5511888888888" className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-[#2A2E24] rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-primary text-background-dark rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Salvar Agendamento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
