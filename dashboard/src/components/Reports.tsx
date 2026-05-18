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
    Download, Zap, TrendingUp,
    AlertOctagon, Lightbulb, Plus, Edit2, Trash2,
    Clock, Smartphone, Mail, Check, X
} from 'lucide-react';

interface ReportsProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel' | 'admin-users' | 'ota-panel') => void;
}

const REPORT_WEBHOOK_URL = '/api/n8n/webhook/generate-report';

const Reports: React.FC<ReportsProps> = ({ onNavigate }) => {
    const { currentTenant, availableTenants } = useTenant();
    const { currentUser } = useAuth();
    const { reportConfigs, saveReportConfig, deleteReportConfig, isLoading } = useReports(currentTenant?.id || 'all');
    const { devices, events } = useSupabaseData(currentTenant?.id || 'all', undefined, currentUser?.role);

    const [showModal, setShowModal] = useState(false);
    const [editingReport, setEditingReport] = useState<any>(null);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
        `${i.toString().padStart(2, '0')}:00`
    );

    const getDefaultDates = () => {
        const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        const start = new Date();
        start.setDate(start.getDate() - 7);
        const startSP = start.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

        return {
            start_date: startSP,
            end_date: todaySP,
            start_time: '00:00',
            end_time: '23:59',
            selected_hours: [],
            use_all_hours: true
        };
    };
    const [generateForm, setGenerateForm] = useState<{
        type: string;
        tenant_id: string;
        device_id: string;
        start_date: string;
        end_date: string;
        start_time: string;
        end_time: string;
        selected_hours: string[];
        use_all_hours: boolean;
        report_preset: 'custom' | 'daily_8_16' | 'month_8_16';
    }>({
        type: 'device',
        tenant_id: currentTenant?.id === 'all' ? '' : currentTenant?.id || '',
        device_id: '',
        start_date: getDefaultDates().start_date,
        end_date: getDefaultDates().end_date,
        start_time: '00:00',
        end_time: '23:59',
        selected_hours: [] as string[],
        use_all_hours: true,
        report_preset: 'custom'
    });
    const [generating, setGenerating] = useState(false);

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

    const handleGenerateNow = async () => {

        // Get selected tenant details
        const selectedTenant = availableTenants.find(t => t.id === generateForm.tenant_id) || (currentTenant.id !== 'all' ? currentTenant : null);
        const tenantId = selectedTenant?.id;
        const companyName = selectedTenant?.name || 'Geral';

        // Converter datas + horas para formato ISO completo com offset de SP
        const formatDateTime = (dateStr: string, timeStr: string) => {
            const [hours, minutes] = timeStr.split(':');
            return dateStr + `T${hours || '00'}:${minutes || '00'}:00.000-03:00`;
        };

        // Aplica preset de horários
        let effectiveForm = { ...generateForm };
        const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

        if (generateForm.report_preset === 'daily_8_16') {
            // Relatório com leituras de 8h e 16h do dia ATUAL (ou selecionado)
            // Se o usuário não mudou a data, força hoje
            if (effectiveForm.end_date === getDefaultDates().end_date) {
                effectiveForm.start_date = todaySP;
                effectiveForm.end_date = todaySP;
            }
            effectiveForm.start_time = '08:00';
            effectiveForm.end_time = '16:00';
            effectiveForm.use_all_hours = false;
            effectiveForm.selected_hours = ['08:00', '16:00'];
        } else if (generateForm.report_preset === 'month_8_16') {
            // Mês todo: do dia 1 ao último dia do mês atual (Fuso SP)
            const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
            const firstDay = new Date(nowSP.getFullYear(), nowSP.getMonth(), 1);
            const lastDay = new Date(nowSP.getFullYear(), nowSP.getMonth() + 1, 0);

            effectiveForm.start_date = firstDay.toLocaleDateString('en-CA');
            effectiveForm.end_date = lastDay.toLocaleDateString('en-CA');
            effectiveForm.start_time = '08:00';
            effectiveForm.end_time = '16:00';
            effectiveForm.use_all_hours = false;
            effectiveForm.selected_hours = ['08:00', '16:00'];
        }

        const effectiveType = generateForm.device_id ? 'device' : 'company';

        setGenerating(true);
        try {
            const payload: any = {
                type: effectiveType,
                start_date: formatDateTime(effectiveForm.start_date, effectiveForm.start_time),
                end_date: formatDateTime(effectiveForm.end_date, effectiveForm.end_time),
                company_name: companyName,
                selected_hours: effectiveForm.use_all_hours ? [] : effectiveForm.selected_hours,
                use_all_hours: effectiveForm.use_all_hours,
                report_preset: effectiveForm.report_preset
            };

            if (tenantId) {
                payload.tenant_id = tenantId;
            }

            if (effectiveType === 'device') {
                const device = devices.find(d => d.id === generateForm.device_id);
                payload.device_id = generateForm.device_id;
                payload.device_name = device?.name || generateForm.device_id;
                payload.device_code = device?.id || generateForm.device_id;
                payload.ala = device?.location || 'Não informada';
            } else {
                // Para relatório de empresa: envia TODOS os device_ids daquela empresa
                const companyDevices = tenantId ? devices.filter(d => d.tenantId === tenantId) : [];
                payload.device_ids = companyDevices.map(d => d.id);
                payload.device_name = 'Todos os dispositivos';
                payload.ala = 'Geral';
            }

            console.log('Gerando relatório:', payload);

            const response = await fetch(REPORT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('Response data:', result);

                if (result.pdf_base64) {
                    const linkSource = `data:application/pdf;base64,${result.pdf_base64}`;
                    const downloadLink = document.createElement("a");
                    const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
                    const fileName = `relatorio_${payload.device_id || 'geral'}_${todaySP}.pdf`;

                    downloadLink.href = linkSource;
                    downloadLink.download = fileName;
                    downloadLink.click();
                    alert("Relatório gerado e baixado com sucesso!");
                } else {
                    alert("Relatório gerado com sucesso! Verifique seu WhatsApp.");
                }
            } else {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                alert("Erro ao gerar relatório. Verifique o console para detalhes.");
            }
            setShowGenerateModal(false);
        } catch (err) {
            console.error('Fetch error:', err);
            alert("Erro ao gerar relatório: " + (err instanceof Error ? err.message : 'Verifique sua conexão'));
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#0a1323] text-slate-100 font-display">
            <Sidebar activeItem="reports" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative bg-[#0a1323]">
                {/* HEADER */}
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-8 bg-[#0a1323]/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-white font-heading">Relatórios <span className="text-primary">&</span> Insights</h2>
                        <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.1em]">Ecossistema {currentTenant?.name}</p>
                    </div>

                </header>

                <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-10 py-8 pb-24 sm:pb-8 custom-scrollbar 2xl:max-w-[1600px] 2xl:mx-auto w-full">
                    {/* AI INSIGHTS PULSE CARD */}
                    <div className="mb-10 group relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-purple-500/50 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                        <div className="relative bg-[#172030]/60 backdrop-blur-2xl border border-white/5 p-8 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-8">
                            <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center shrink-0 shadow-[0_0_40px_rgba(19,109,236,0.2)] border border-primary/20">
                                <Lightbulb size={40} className="text-primary animate-pulse" />
                            </div>
                            <div className="flex-1 text-center md:text-left text-white">
                                <h3 className="text-2xl font-bold mb-2 tracking-tight">Análise Preditiva da IA</h3>
                                <div className="text-slate-300 text-lg leading-relaxed font-body">
                                    {recentAlerts > 5 ? (
                                        <p>Detectamos uma alta incidência de alertas (<strong className="text-primary">{recentAlerts}</strong> nas últimas 24h) na unidade <strong className="text-white">{currentTenant?.name}</strong>. Recomendamos uma revisão preventiva nos equipamentos com maior frequência de incidentes.</p>
                                    ) : batteryCritical > 0 ? (
                                        <p>Atenção! Identificamos <strong className="text-primary">{batteryCritical}</strong> dispositivo(s) com nível de bateria crítico na empresa <strong className="text-white">{currentTenant?.name}</strong>. Agende a troca para evitar perda de dados.</p>
                                    ) : (
                                        <p>A operação na unidade <strong className="text-white">{currentTenant?.name}</strong> apresenta estabilidade térmica ideal. Mantendo este padrão, a vida útil dos compressores pode ser estendida em até <strong className="text-primary">15%</strong>.</p>
                                    )}
                                </div>
                            </div>
                            <button className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/10 transition-all backdrop-blur-md shrink-0">
                                DETALHAR OPERAÇÃO
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        {[
                            { label: 'Disponibilidade', value: `${availabilityRate}%`, icon: <Zap size={22} />, colorClass: 'text-primary bg-primary/5 border-primary/10' },
                            { label: 'Temp. Média', value: `${avgTemp}°C`, icon: <TrendingUp size={22} />, colorClass: 'text-amber-400 bg-amber-400/5 border-amber-400/10' },
                            { label: 'Dispositivos', value: `${devicesOnline}/${devicesTotal}`, icon: <Smartphone size={22} />, colorClass: 'text-emerald-400 bg-emerald-400/5 border-emerald-400/10' },
                            { label: 'Alertas (24h)', value: String(recentAlerts), icon: <AlertOctagon size={22} />, colorClass: 'text-rose-400 bg-rose-400/5 border-rose-400/10' },
                        ].map((stat, i) => (
                            <div key={i} className="flex gap-4 rounded-2xl border border-white/5 bg-[#172030]/40 backdrop-blur-lg p-6 items-center hover:bg-[#172030]/60 transition-all group">
                                <div className={`${stat.colorClass} p-3 rounded-xl border transition-colors group-hover:brightness-125`}>
                                    {stat.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] font-heading">{stat.label}</h3>
                                    <p className="text-2xl font-bold text-white tracking-tight mt-0.5">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
                        <div className="rounded-2xl border border-white/5 bg-[#172030]/40 p-8 backdrop-blur-lg shadow-xl">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-bold text-white/90 tracking-tight font-heading">Alertas por Sensor</h3>
                                <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-slate-400 font-bold uppercase tracking-wider border border-white/5">Últimos 10 sensores</div>
                            </div>
                            <div className="h-[300px] min-h-[300px] w-full">
                                {alertsPerDeviceData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={alertsPerDeviceData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} dx={-10} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#131c2c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                            />
                                            <Bar dataKey="value" fill="#136dec" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">Nenhum alerta registrado.</div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/5 bg-[#172030]/40 p-8 backdrop-blur-lg shadow-xl">
                            <h3 className="text-lg font-bold text-white/90 tracking-tight font-heading mb-8">Status Geral da Frota</h3>
                            <div className="h-[300px] min-h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusPieData}
                                            innerRadius={85}
                                            outerRadius={115}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {statusPieData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#131c2c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, paddingTop: '20px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="mb-10 overflow-hidden rounded-2xl border border-white/5 bg-[#172030]/40 backdrop-blur-lg shadow-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 bg-white/5 px-8 py-6 gap-4">
                            <div className="flex items-center gap-4">
                                <div className="rounded-xl bg-primary/10 p-3 text-primary border border-primary/20">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white tracking-tight leading-tight">Relatórios Automáticos</h3>
                                    <p className="text-xs text-slate-400 font-medium">Cronograma de envios ativos</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setEditingReport(null); setShowModal(true); }}
                                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:brightness-110 transition-all shadow-[0_0_15px_rgba(19,109,236,0.2)] active:scale-95"
                            >
                                <Plus size={18} />
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
                                    <thead className="bg-[#0a1323]/50 text-[10px] font-bold uppercase text-slate-500 tracking-[0.15em]">
                                        <tr>
                                            <th className="px-8 py-5">Nome / Tipo</th>
                                            <th className="px-8 py-5">Frequência</th>
                                            <th className="px-8 py-5">Canais</th>
                                            <th className="px-8 py-5">Status</th>
                                            <th className="px-8 py-5 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {reportConfigs.map((config) => (
                                            <tr key={config.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="font-bold text-white">{config.name}</div>
                                                    <div className="text-[10px] text-slate-500 font-medium">{config.type === 'company' ? 'FROTA TOTAL' : `ID: ${config.device_id}`}</div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="text-sm text-slate-300">
                                                        {config.schedule_type === 'daily' && `Todo dia às ${config.schedule_time}`}
                                                        {config.schedule_type === 'weekly' && `Toda ${['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][config.schedule_day || 0]} às ${config.schedule_time}`}
                                                        {config.schedule_type === 'monthly' && `Dia ${config.schedule_day} às ${config.schedule_time}`}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex gap-2">
                                                        {config.channels?.includes('whatsapp') && (
                                                            <div className="p-1.5 bg-emerald-500/10 rounded-lg" title="WhatsApp"><Smartphone size={14} className="text-emerald-400" /></div>
                                                        )}
                                                        {config.channels?.includes('email') && (
                                                            <div className="p-1.5 bg-blue-500/10 rounded-lg" title="E-mail"><Mail size={14} className="text-blue-400" /></div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <button
                                                        onClick={() => handleToggle(config)}
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${config.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}
                                                    >
                                                        {config.enabled ? <Check size={10} /> : <X size={10} />}
                                                        {config.enabled ? 'ATIVO' : 'PAUSADO'}
                                                    </button>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm("Deseja gerar e enviar este relatório agora?")) {
                                                                    try {
                                                                        await fetch(REPORT_WEBHOOK_URL, {
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
                                                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                            title="Gerar Agora"
                                                        >
                                                            <Plus size={16} className="rotate-45" />
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingReport(config); setShowModal(true); }}
                                                            className="p-2 text-slate-400 hover:bg-white/5 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(config.id)}
                                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* MODALS */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-[#172030] border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex-shrink-0 flex items-center justify-between border-b border-white/5 p-6 shadow-sm z-10 bg-[#172030]">
                            <h3 className="text-xl font-bold text-white">{editingReport ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Agendamento</label>
                                <input name="name" defaultValue={editingReport?.name} placeholder="Ex: Relatório Mensal" required className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors" />
                            </div>

                            {currentTenant?.id === 'all' && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Empresa</label>
                                    <select
                                        name="tenant_id"
                                        defaultValue={editingReport?.tenant_id}
                                        required
                                        className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors"
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
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tipo</label>
                                    <select
                                        name="type"
                                        defaultValue={editingReport?.type || 'company'}
                                        required
                                        className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors"
                                        onChange={(e) => setEditingReport({ ...editingReport, type: e.target.value })}
                                    >
                                        <option value="company">Empresa Inteira</option>
                                        <option value="device">Por Dispositivo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Frequência</label>
                                    <select name="schedule_type" defaultValue={editingReport?.schedule_type || 'daily'} required className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors">
                                        <option value="daily">Diário</option>
                                        <option value="weekly">Semanal</option>
                                        <option value="monthly">Mensal</option>
                                    </select>
                                </div>
                            </div>

                            {editingReport?.type === 'device' && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dispositivo</label>
                                    <select name="device_id" defaultValue={editingReport?.device_id} required className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors">
                                        <option value="">Selecione um dispositivo</option>
                                        {devices.map(d => (
                                            <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Horário</label>
                                    <input name="schedule_time" type="time" defaultValue={editingReport?.schedule_time || '08:00'} required className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors" />
                                </div>

                                {/* Linha Divisória Vertical */}
                                <div className="flex flex-col items-center justify-center pt-6 pb-2">
                                    <div className="w-px h-full bg-white/10"></div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dia do Envio</label>
                                    <input name="schedule_day" type="number" min="0" max="31" defaultValue={editingReport?.schedule_day || 0} className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-primary outline-none transition-colors" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Canais de Envio</label>
                                <div className="flex gap-6 mt-2">
                                    <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer group">
                                        <input type="checkbox" name="channels" value="whatsapp" defaultChecked={editingReport?.channels?.includes('whatsapp')} className="w-4 h-4 rounded border-white/10 bg-[#0a1323] text-primary focus:ring-primary accent-primary" />
                                        <span className="group-hover:text-white transition-colors">WhatsApp</span>
                                    </label>
                                    <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer group">
                                        <input type="checkbox" name="channels" value="email" defaultChecked={editingReport?.channels?.includes('email')} className="w-4 h-4 rounded border-white/10 bg-[#0a1323] text-primary focus:ring-primary accent-primary" />
                                        <span className="group-hover:text-white transition-colors">E-mail</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-br from-primary to-blue-700 text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20">Salvar Configuração</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showGenerateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-[#172030] border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex-shrink-0 flex items-center justify-between border-b border-white/5 p-6 shadow-sm z-10 bg-[#172030]">
                            <h3 className="text-xl font-bold text-white">Gerar Relatório Instantâneo</h3>
                            <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                            {/* Role-based Company Selector */}
                            {(currentUser?.role === 'manager' || currentUser?.role === 'gestor' || availableTenants.length > 1) && (
                                <div className="animate-in slide-in-from-top-2 duration-300">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Empresa</label>
                                    <select
                                        value={generateForm.tenant_id}
                                        onChange={(e) => setGenerateForm({ ...generateForm, tenant_id: e.target.value, device_id: '' })}
                                        className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                                    >
                                        <option value="">Selecione a empresa...</option>
                                        {availableTenants.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="animate-in slide-in-from-top-2 duration-300">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dispositivo</label>
                                <select
                                    value={generateForm.device_id}
                                    onChange={(e) => setGenerateForm({ ...generateForm, device_id: e.target.value })}
                                    className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                                >
                                    <option value="">Todos os dispositivos</option>
                                    {devices
                                        .filter(d => !generateForm.tenant_id || d.tenantId === generateForm.tenant_id)
                                        .map(d => (
                                            <option key={d.id} value={d.id}>{d.name} ({d.location || 'Sem ala'})</option>
                                        ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-[1fr_auto_1fr] gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data Inicial</label>
                                    <label className="block cursor-pointer">
                                        <input
                                            type="date"
                                            value={generateForm.start_date}
                                            onChange={(e) => setGenerateForm({ ...generateForm, start_date: e.target.value })}
                                            className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors cursor-pointer"
                                        />
                                    </label>
                                    <input
                                        type="time"
                                        value={generateForm.start_time}
                                        onChange={(e) => setGenerateForm({ ...generateForm, start_time: e.target.value })}
                                        className="w-full mt-2 bg-[#0a1323] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                                    />
                                </div>

                                {/* Linha Divisória Vertical */}
                                <div className="flex flex-col items-center justify-center pt-6 pb-2">
                                    <div className="w-px h-full bg-white/10"></div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data Final</label>
                                    <label className="block cursor-pointer">
                                        <input
                                            type="date"
                                            value={generateForm.end_date}
                                            onChange={(e) => setGenerateForm({ ...generateForm, end_date: e.target.value })}
                                            className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors cursor-pointer"
                                        />
                                    </label>
                                    <input
                                        type="time"
                                        value={generateForm.end_time}
                                        onChange={(e) => setGenerateForm({ ...generateForm, end_time: e.target.value })}
                                        className="w-full mt-2 bg-[#0a1323] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Horários Específicos */}
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Atalhos de Horário</label>

                                {/* PRESETS DE HORÁRIO FIXO - 8h e 16h */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setGenerateForm(prev => ({
                                            ...prev,
                                            report_preset: prev.report_preset === 'daily_8_16' ? 'custom' : 'daily_8_16',
                                            use_all_hours: false,
                                            selected_hours: ['08:00', '16:00']
                                        }))}
                                        className={`relative p-3 rounded-xl border text-left transition-all ${generateForm.report_preset === 'daily_8_16'
                                            ? 'bg-primary/10 border-primary/60 shadow-lg shadow-primary/10'
                                            : 'bg-[#0d1b2a] border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        {generateForm.report_preset === 'daily_8_16' && (
                                            <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                                <Check size={10} className="text-white" />
                                            </div>
                                        )}
                                        <p className={`text-[11px] font-bold ${generateForm.report_preset === 'daily_8_16' ? 'text-primary' : 'text-slate-300'}`}>📅 Diário</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">08h e 16h do período selecionado</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setGenerateForm(prev => ({
                                            ...prev,
                                            report_preset: prev.report_preset === 'month_8_16' ? 'custom' : 'month_8_16',
                                            use_all_hours: false,
                                            selected_hours: ['08:00', '16:00']
                                        }))}
                                        className={`relative p-3 rounded-xl border text-left transition-all ${generateForm.report_preset === 'month_8_16'
                                            ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                                            : 'bg-[#0d1b2a] border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        {generateForm.report_preset === 'month_8_16' && (
                                            <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                                <Check size={10} className="text-white" />
                                            </div>
                                        )}
                                        <p className={`text-[11px] font-bold ${generateForm.report_preset === 'month_8_16' ? 'text-emerald-400' : 'text-slate-300'}`}>🗓️ Mensal</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">08h e 16h do mês atual</p>
                                    </button>
                                </div>

                                {/* Aviso quando preset está ativo */}
                                {(generateForm.report_preset === 'daily_8_16' || generateForm.report_preset === 'month_8_16') && (
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium ${generateForm.report_preset === 'month_8_16'
                                        ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400'
                                        : 'bg-primary/5 border border-primary/20 text-primary'
                                        }`}>
                                        <Clock size={12} className="shrink-0" />
                                        {generateForm.report_preset === 'month_8_16'
                                            ? `Datas ajustadas para o mês atual. Horários: 08:00 e 16:00.`
                                            : `Apenas leituras de 08:00 e 16:00 no período selecionado.`}
                                    </div>
                                )}

                                {/* Seletor avançado - apenas no modo custom */}
                                {generateForm.report_preset === 'custom' && (
                                    <div className="space-y-2">
                                        <div
                                            className={`p-3 border rounded-xl cursor-pointer transition-all ${generateForm.use_all_hours
                                                ? 'bg-[#1a2332] border-white/10'
                                                : 'bg-[#1a2332] border-primary/30'
                                                }`}
                                            onClick={() => setGenerateForm(prev => ({ ...prev, use_all_hours: !prev.use_all_hours }))}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-300">
                                                    {generateForm.use_all_hours ? 'Todos os horários' : 'Horários específicos'}
                                                </span>
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${generateForm.use_all_hours ? 'border-slate-600 bg-transparent' : 'border-primary bg-primary'
                                                    }`}>
                                                    {!generateForm.use_all_hours && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                            </div>
                                        </div>

                                        {!generateForm.use_all_hours && (
                                            <div className="bg-[#0a1323] border border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto">
                                                <div className="grid grid-cols-4 gap-2">
                                                    {HOUR_OPTIONS.map(hour => {
                                                        const isSelected = generateForm.selected_hours.includes(hour);
                                                        return (
                                                            <button
                                                                key={hour}
                                                                type="button"
                                                                onClick={() => {
                                                                    const newHours = isSelected
                                                                        ? generateForm.selected_hours.filter(h => h !== hour)
                                                                        : [...generateForm.selected_hours, hour].sort();
                                                                    setGenerateForm(prev => ({ ...prev, selected_hours: newHours }));
                                                                }}
                                                                className={`px-2 py-1.5 text-xs rounded-lg border transition-all ${isSelected
                                                                    ? 'bg-primary/20 border-primary text-primary'
                                                                    : 'bg-transparent border-white/10 text-slate-400 hover:border-white/30'
                                                                    }`}
                                                            >
                                                                {hour}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {generateForm.selected_hours.length === 0 && (
                                                    <p className="text-xs text-orange-400 mt-2">Selecione pelo menos um horário</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                                <p className="text-[11px] text-primary font-medium leading-relaxed">
                                    O PDF será processado agora e enviado para os canais configurados na conta corporativa.
                                </p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowGenerateModal(false)}
                                    className="flex-1 px-4 py-3 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGenerateNow}
                                    disabled={generating || (generateForm.type === 'device' && !generateForm.device_id)}
                                    className="flex-1 px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {generating ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={16} />
                                            Gerar Relatório
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Reports;
