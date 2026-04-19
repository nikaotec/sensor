import React from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useMqttData } from '../hooks/useMqttData';
import { supabase } from '../supabase/config';
import {
    Search,
    Bell,
    Zap,
    BatteryCharging,
    Wifi,
    ServerCrash,
    AlertTriangle,
    ArrowUp,
    ArrowDown,
    Thermometer,
    Droplets,
    CalendarRange,
    Download,
    X,
    Check,
    Clock,
    Activity,
    Shield
} from 'lucide-react';

const REPORT_WEBHOOK_URL = '/api/n8n/webhook-test/generate-report';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
    `${i.toString().padStart(2, '0')}:00`
);

interface DashboardProps {
    onDeviceClick: (deviceId: string) => void;
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel' | 'admin-users') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onDeviceClick, onNavigate }) => {
    const { currentTenant, availableTenants, setTenantId } = useTenant();
    const { currentUser, logout } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'gestor';
    const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
    const [showReportModal, setShowReportModal] = React.useState(false);
    const getDefaultDates = () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);

        // Usar data local de São Paulo para evitar virada de dia UTC precoce
        const formatSP = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

        return {
            start_date: formatSP(start),
            end_date: formatSP(end),
            start_time: '00:00',
            end_time: '23:59',
            selected_hours: [],
            use_all_hours: true
        };
    };
    const [reportForm, setReportForm] = React.useState<{
        type: string;
        tenant_id: string;
        device_id: string;
        start_date: string;
        end_date: string;
        start_time: string;
        end_time: string;
        report_preset: string;
        selected_hours: string[];
        use_all_hours: boolean;
    }>({
        type: 'company',
        tenant_id: '',
        device_id: '',
        start_date: getDefaultDates().start_date,
        end_date: getDefaultDates().end_date,
        start_time: '00:00',
        end_time: '23:59',
        report_preset: 'custom',
        selected_hours: [],
        use_all_hours: true
    });
    const [generatingReport, setGeneratingReport] = React.useState(false);

    // Abre modal com empresa atual já selecionada
    const openReportModal = () => {
        const dates = getDefaultDates();
        setReportForm({
            type: 'company',
            tenant_id: currentTenant?.id && currentTenant.id !== 'all' ? currentTenant.id : '',
            device_id: '',
            start_date: dates.start_date,
            end_date: dates.end_date,
            start_time: dates.start_time,
            end_time: dates.end_time,
            report_preset: 'custom',
            selected_hours: [],
            use_all_hours: true
        });
        setShowReportModal(true);
    };

    // Fetch initial devices from Firebase and update with live MQTT stream
    const { devices: supabaseDevices } = useSupabaseData(currentTenant?.id || '', undefined, currentUser?.role);
    const { devices: tenantDevices, isConnected: mqttConnected } = useMqttData('all', currentUser?.role, supabaseDevices);



    // Filtro refinado para respeitar a aba selecionada e permissões de role
    const displayDevices = React.useMemo(() => {
        // Se não há dispositivos, retorna vazio
        if (!tenantDevices || tenantDevices.length === 0) return [];

        // Filtra dispositivos não vinculados SEMPRE
        const assignedDevices = tenantDevices.filter(d => {
            if (!d || !d.tenantId) return false;
            const t = String(d.tenantId).trim().toLowerCase();
            return t !== "" && t !== "unknown" && t !== "empresa_default" && t !== "nikaotec" && t !== "null" && t !== "undefined";
        });

        // Se está em uma aba de empresa específica (não "all"), filtra apenas por ela
        if (currentTenant && currentTenant.id !== 'all') {
            return assignedDevices.filter(d => d.tenantId === currentTenant.id || d.tenantId === currentTenant.name);
        }

        // Se é gestor e está na aba "Todos", mostra todos os dispositivos ATRIBUÍDOS
        if (isManager) {
            return assignedDevices;
        }

        // Usuário normal: mostra apenas dispositivos das empresas vinculadas
        const allowedTenantIds = availableTenants.map(t => t.id);
        const allowedTenantNames = availableTenants.map(t => t.name);

        // Filtra dispositivos que são de empresas vinculadas ao usuário
        return assignedDevices.filter(d => {
            return allowedTenantIds.includes(d.tenantId) || allowedTenantNames.includes(d.tenantId);
        });
    }, [tenantDevices, currentTenant, availableTenants, isManager]);

    // No longer needing primaryDevice or mocks

    if (!currentTenant || !currentUser) {
        return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Carregando dados da Empresa...</div>;
    }

    const handleGenerateReport = async () => {

        const selectedTenant = availableTenants.find(t => t.id === reportForm.tenant_id) || (currentTenant.id !== 'all' ? currentTenant : null);
        const tenantId = selectedTenant?.id;
        const companyName = selectedTenant?.name || 'Geral';

        // Converter datas + horas para fuso horário local e retornar ISO sem sufixo 'Z'
        // Isso evita que o backend (n8n/Postgres) faça uma nova conversão para UTC
        const formatDateTime = (dateStr: string, timeStr: string) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const [year, month, day] = dateStr.split('-').map(Number);

            // Força o fuso horário de Brasília (-03:00) explicitamente na string ISO
            // Isso evita que o n8n ou Supabase interpretem como UTC se o 'Z' for removido ou ausente
            const pad = (num: number) => num.toString().padStart(2, '0');
            const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hours || 0)}:${pad(minutes || 0)}:00-03:00`;
            return iso;
        };

        // Aplica preset de horários
        let effectiveForm = { ...reportForm };
        if (reportForm.report_preset === 'daily_8_16') {
            effectiveForm.use_all_hours = false;
            effectiveForm.selected_hours = ['08:00', '16:00'];
        } else if (reportForm.report_preset === 'month_8_16') {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            effectiveForm.start_date = firstDay.toISOString().split('T')[0];
            effectiveForm.end_date = lastDay.toISOString().split('T')[0];
            effectiveForm.start_time = '00:00';
            effectiveForm.end_time = '23:59';
            effectiveForm.use_all_hours = false;
            effectiveForm.selected_hours = ['08:00', '16:00'];
        }

        const effectiveType = reportForm.device_id ? 'device' : 'company';

        setGeneratingReport(true);
        try {
            const startISO = formatDateTime(effectiveForm.start_date, effectiveForm.start_time);
            const endISO = formatDateTime(effectiveForm.end_date, effectiveForm.end_time);

            // Determinar IDs dos dispositivos envolvidos para checagem de dados
            let targetDeviceIds: string[] = [];
            const targetTenantId = reportForm.tenant_id || (currentTenant.id !== 'all' ? currentTenant.id : '');

            if (effectiveType === 'device') {
                targetDeviceIds = reportForm.device_id ? [reportForm.device_id] : [];
            } else {
                const companyDevices = (targetTenantId && targetTenantId !== '')
                    ? supabaseDevices.filter(d => d.tenantId === targetTenantId)
                    : displayDevices; // Se "Todos", usa todos os visíveis
                targetDeviceIds = companyDevices.map(d => d.id);
            }

            // Validar se há dispositivos para o relatório
            if (targetDeviceIds.length === 0) {
                const selTenant = availableTenants.find(t => t.id === reportForm.tenant_id);
                const selectedTenantName = selTenant ? selTenant.name : (targetTenantId ? "da empresa selecionada" : "disponível");
                alert(`Nenhum dispositivo encontrado para ${selectedTenantName}. Adicione dispositivos ou escolha outra empresa.`);
                setGeneratingReport(false);
                return;
            }

            // 1. Checar se existem registros no Supabase para o período
            const { count, error: countError } = await supabase
                .from('telemetry')
                .select('*', { count: 'exact', head: true })
                .in('device_id', targetDeviceIds)
                .gte('timestamp', startISO)
                .lte('timestamp', endISO);

            if (countError) console.error('Erro ao checar registros:', countError);

            if (!count || count === 0) {
                alert(`Nenhum registro de telemetria encontrado para o período selecionado (${effectiveForm.start_date} a ${effectiveForm.end_date}). O relatório não pôde ser gerado.`);
                setGeneratingReport(false);
                return;
            }

            const payload: any = {
                type: effectiveType,
                start_date: startISO,
                end_date: endISO,
                company_name: companyName,
                selected_hours: effectiveForm.use_all_hours ? [] : effectiveForm.selected_hours,
                use_all_hours: effectiveForm.use_all_hours,
                report_preset: effectiveForm.report_preset
            };

            if (tenantId) {
                payload.tenant_id = tenantId;
            }

            if (effectiveType === 'device') {
                const device = supabaseDevices.find(d => d.id === reportForm.device_id);
                payload.device_id = reportForm.device_id;
                payload.device_name = device?.name || reportForm.device_id;
            } else {
                payload.device_ids = targetDeviceIds;
                payload.device_name = 'Todos os dispositivos';
                payload.ala = 'Geral';
            }

            const response = await fetch(REPORT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
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
                alert("Erro ao gerar relatório. Verifique os dados e tente novamente.");
            }
            setShowReportModal(false);
        } catch (err) {
            console.error('Error generating report:', err);
            alert("Erro ao gerar relatório.");
        } finally {
            setGeneratingReport(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeItem="dashboard" onNavigate={onNavigate} isCollapsed={sidebarCollapsed} onToggleCollapse={setSidebarCollapsed} />

            <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative bg-background-light text-text-dark">
                {/* HEADER */}
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-8 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-text-dark tracking-tight">Monitoramento <span className="text-text-primary text-sm font-normal ml-2">Câmeras Frias de Vacinas</span></h2>
                        {mqttConnected && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                                <Wifi size={10} /> MQTT Live
                            </span>
                        )}
                        <div className="h-6 w-px bg-gray-300 mx-2"></div>
                        <div className="hidden lg:flex items-center bg-gray-100 px-4 py-2 rounded-xl border border-gray-200 w-96 group focus-within:border-primary/50 transition-all">
                            <Search size={18} className="text-gray-400 group-focus-within:text-primary transition-colors" />
                            <input type="text" placeholder="Procurar dispositivos ou registros..." className="bg-transparent border-none outline-none text-sm px-3 w-full text-text-dark placeholder:text-gray-400" />
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <button className="relative p-2 text-gray-400 hover:text-primary transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 size-2 bg-danger rounded-full border-2 border-white"></span>
                        </button>
                        <button
                            onClick={openReportModal}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-primary to-[#004299] text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-[0_0_15px_rgba(19,109,236,0.3)]"
                        >
                            <CalendarRange size={16} />
                            <span className="hidden sm:inline">Gerar Relatório</span>
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="flex items-center gap-3 pl-6 border-l border-gray-200 group focus:outline-none"
                            >
                                <div className="flex flex-col items-end hidden sm:flex text-right">
                                    <p className="text-sm font-bold text-text-dark leading-none group-hover:text-primary transition-colors">{currentUser.name}</p>
                                    <p className="text-[10px] text-text-primary mt-1 uppercase font-semibold">
                                        {currentUser.role === 'manager' ? 'Gestor' : currentUser.role === 'admin' ? 'Admin' : 'Usuário'}
                                    </p>
                                </div>
                                <img
                                    className="size-10 rounded-full border-2 border-primary/20 group-hover:border-primary transition-all"
                                    src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser.name}`}
                                    alt="Profile"
                                />
                            </button>

                            {isProfileMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#12150F] rounded-xl border border-gray-200 dark:border-[#2A2E24] shadow-lg py-1 z-50">
                                    <button
                                        onClick={() => {
                                            setIsProfileMenuOpen(false);
                                            onNavigate('settings');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1D16] transition-colors"
                                    >
                                        Configurações
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsProfileMenuOpen(false);
                                            logout();
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors border-t border-gray-100 dark:border-[#2A2E24]"
                                    >
                                        Fazer Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-10 py-6 pb-24 sm:pb-6 custom-scrollbar 2xl:max-w-[1600px] 2xl:mx-auto w-full">
                    {/* TABS E STATUS */}
                    <div className="flex flex-col gap-6 mb-8">
                        {/* Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            <button
                                onClick={() => setTenantId('all')}
                                className={`px-4 py-2 whitespace-nowrap text-sm font-semibold transition-all border-b-2 ${currentTenant?.id === 'all' || !currentTenant ? 'border-primary text-text-dark' : 'border-transparent text-text-primary hover:text-text-dark'} `}
                            >
                                Todos
                            </button>
                            {availableTenants.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTenantId(t.id)}
                                    className={`px-4 py-2 whitespace-nowrap text-sm font-semibold transition-all border-b-2 ${currentTenant?.id === t.id ? 'border-primary text-text-dark' : 'border-transparent text-text-primary hover:text-text-dark'} `}
                                >
                                    {t.name}
                                </button>
                            ))}

                        </div>
                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {!(isAdmin || isManager) ? (
                            <div className="col-span-1 md:col-span-2 xl:col-span-3 py-12 flex flex-col items-center justify-center text-slate-500 bg-[#1A1D17] rounded-2xl border border-[#2A2E24]">
                                <Shield className="mb-4 opacity-50 text-amber-500" size={48} />
                                <p className="text-lg font-medium text-slate-300">Acesso Restrito</p>
                                <p className="text-sm">Você não tem permissão para visualizar os dispositivos.</p>
                            </div>
                        ) : displayDevices.length === 0 ? (
                            <div className="col-span-1 md:col-span-2 xl:col-span-3 py-12 flex flex-col items-center justify-center text-slate-500 bg-[#1A1D17] rounded-2xl border border-[#2A2E24]">
                                <ServerCrash size={48} className="mb-4 opacity-50" />
                                <p className="text-lg">Nenhum dispositivo encontrado para esta empresa.</p>
                            </div>
                        ) : (
                            displayDevices.map((device) => {


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
                                        key={device.id}
                                        onClick={() => onDeviceClick(device.id)}
                                        className={`bg-[#1A1D17] rounded-2xl border shadow-lg p-6 relative flex flex-col cursor-pointer transition-all group overflow-hidden ${isOffline
                                            ? 'border-red-400/30 opacity-80 grayscale-[0.5] hover:border-red-400/50'
                                            : 'border-[#2A2E24] hover:border-primary/50'
                                            }`}
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                            <ServerCrash size={80} className="text-primary" />
                                        </div>

                                        <div className="mb-4 flex flex-col z-10">
                                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-loose font-heading">Monitoramento em Tempo Real</h3>
                                            <div className="flex justify-between items-center mt-1">
                                                <div>
                                                    <h4 className="font-bold text-white text-lg group-hover:text-primary transition-colors">{device.name}</h4>
                                                    {device.location && (
                                                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                                            {device.location}
                                                        </p>
                                                    )}
                                                    {currentTenant?.id === 'all' && (
                                                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md mt-1.5 inline-block font-medium">
                                                            {availableTenants.find(t => t.id === device.tenantId)?.name || device.tenantId}
                                                        </span>
                                                    )}
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

                                        <div className="mt-auto pt-4 border-t border-[#2A2E24] flex items-center justify-between z-10">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Wifi size={14} className={device.telemetry.signal && device.telemetry.signal > -75 ? 'text-primary' : 'text-amber-500'} />
                                                <span className="text-xs font-medium">Sinal RSSI: {device.telemetry.signal !== undefined ? `${device.telemetry.signal} dBm` : '--'}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-[#0F110D] border border-[#2A2E24] ${device.telemetry.signal && device.telemetry.signal > -75 ? 'text-emerald-400' : 'text-amber-500'}`}>
                                                {getSignalQuality(device.telemetry.signal)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>

            {/* MODAL DE RELATÓRIOS */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-[#172030] border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex-shrink-0 flex items-center justify-between border-b border-white/5 p-6 shadow-sm z-10 bg-[#172030]">
                            <h3 className="text-xl font-bold text-white">Gerar Relatório</h3>
                            <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                            {/* Seleção de Empresa - só mostra se estiver na aba "Todos" E se for gestor */}
                            {currentTenant?.id === 'all' && (currentUser?.role === 'manager' || currentUser?.role === 'gestor') && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-primary rounded-full"></div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Empresa</label>
                                    </div>
                                    <select
                                        value={reportForm.tenant_id}
                                        onChange={(e) => setReportForm({ ...reportForm, tenant_id: e.target.value, device_id: '' })}
                                        className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                                    >
                                        <option value="">Selecione a empresa...</option>
                                        {availableTenants.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Mostrar empresa atual se não for "Todos" */}
                            {currentTenant?.id !== 'all' && (
                                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-1 h-3 bg-primary rounded-full"></div>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Empresa</p>
                                    </div>
                                    <p className="text-lg font-bold text-white">{currentTenant?.name}</p>
                                </div>
                            )}

                            {/* Seleção de Dispositivo - filtra pela empresa da aba atual ou selecionada */}
                            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Dispositivo</label>
                                </div>
                                <select
                                    value={reportForm.device_id}
                                    onChange={(e) => setReportForm({ ...reportForm, device_id: e.target.value })}
                                    className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors"
                                >
                                    <option value="">Todos os dispositivos</option>
                                    {supabaseDevices
                                        .filter(d => {
                                            // Se está em aba específica, filtra por ela
                                            if (currentTenant?.id && currentTenant.id !== 'all') {
                                                return d.tenantId === currentTenant.id;
                                            }
                                            // Senão, usa a empresa selecionada no modal
                                            return !reportForm.tenant_id || d.tenantId === reportForm.tenant_id;
                                        })
                                        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                                        .map(d => (
                                            <option key={d.id} value={d.id}>{d.name} ({d.location || 'Sem ala'})</option>
                                        ))}
                                </select>
                            </div>

                            {/* Período - Data + Hora */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Período</label>
                                </div>
                                <div className="grid grid-cols-[1fr_auto_1fr] gap-3">
                                    <div>
                                        <label className="block text-[10px] text-slate-500 mb-1.5">Data Início</label>
                                        <label className="block cursor-pointer">
                                            <input
                                                type="date"
                                                value={reportForm.start_date}
                                                onChange={(e) => setReportForm({ ...reportForm, start_date: e.target.value })}
                                                className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none transition-colors cursor-pointer"
                                            />
                                        </label>
                                        <input
                                            type="time"
                                            value={reportForm.start_time}
                                            onChange={(e) => setReportForm({ ...reportForm, start_time: e.target.value })}
                                            className="w-full mt-2 bg-[#0a1323] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none transition-colors"
                                        />
                                    </div>

                                    {/* Linha Divisória Vertical */}
                                    <div className="flex flex-col items-center justify-center pt-6 pb-2">
                                        <div className="w-px h-full bg-white/10"></div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] text-slate-500 mb-1.5">Data Fim</label>
                                        <label className="block cursor-pointer">
                                            <input
                                                type="date"
                                                value={reportForm.end_date}
                                                onChange={(e) => setReportForm({ ...reportForm, end_date: e.target.value })}
                                                className="w-full bg-[#0a1323] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none transition-colors cursor-pointer"
                                            />
                                        </label>
                                        <input
                                            type="time"
                                            value={reportForm.end_time}
                                            onChange={(e) => setReportForm({ ...reportForm, end_time: e.target.value })}
                                            className="w-full mt-2 bg-[#0a1323] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Horários Específicos */}
                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Atalhos de Horário</label>

                                {/* PRESETS DE HORÁRIO FIXO - 8h e 16h */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setReportForm(prev => ({
                                            ...prev,
                                            report_preset: prev.report_preset === 'daily_8_16' ? 'custom' : 'daily_8_16',
                                            use_all_hours: false,
                                            selected_hours: ['08:00', '16:00']
                                        }))}
                                        className={`relative p-3 rounded-xl border text-left transition-all ${reportForm.report_preset === 'daily_8_16'
                                            ? 'bg-primary/10 border-primary/60 shadow-lg shadow-primary/10'
                                            : 'bg-[#0d1b2a] border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        {reportForm.report_preset === 'daily_8_16' && (
                                            <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                                <Check size={10} className="text-white" />
                                            </div>
                                        )}
                                        <p className={`text-[11px] font-bold ${reportForm.report_preset === 'daily_8_16' ? 'text-primary' : 'text-slate-300'}`}>📅 Diário</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">08h e 16h do período selecionado</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setReportForm(prev => ({
                                            ...prev,
                                            report_preset: prev.report_preset === 'month_8_16' ? 'custom' : 'month_8_16',
                                            use_all_hours: false,
                                            selected_hours: ['08:00', '16:00']
                                        }))}
                                        className={`relative p-3 rounded-xl border text-left transition-all ${reportForm.report_preset === 'month_8_16'
                                            ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                                            : 'bg-[#0d1b2a] border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        {reportForm.report_preset === 'month_8_16' && (
                                            <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                                <Check size={10} className="text-white" />
                                            </div>
                                        )}
                                        <p className={`text-[11px] font-bold ${reportForm.report_preset === 'month_8_16' ? 'text-emerald-400' : 'text-slate-300'}`}>🗓️ Mensal</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">08h e 16h do mês atual</p>
                                    </button>
                                </div>

                                {/* Aviso quando preset está ativo */}
                                {(reportForm.report_preset === 'daily_8_16' || reportForm.report_preset === 'month_8_16') && (
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium ${reportForm.report_preset === 'month_8_16'
                                        ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400'
                                        : 'bg-primary/5 border border-primary/20 text-primary'
                                        }`}>
                                        <Clock size={12} className="shrink-0" />
                                        {reportForm.report_preset === 'month_8_16'
                                            ? `Datas ajustadas para o mês atual. Horários: 08:00 e 16:00.`
                                            : `Apenas leituras de 08:00 e 16:00 no período selecionado.`}
                                    </div>
                                )}

                                {/* Seletor avançado - apenas no modo custom */}
                                {reportForm.report_preset === 'custom' && (
                                    <div className="space-y-2">
                                        <div
                                            className={`p-3 border rounded-xl cursor-pointer transition-all ${reportForm.use_all_hours
                                                ? 'bg-[#1a2332] border-white/10'
                                                : 'bg-[#1a2332] border-primary/30'
                                                }`}
                                            onClick={() => setReportForm(prev => ({ ...prev, use_all_hours: !prev.use_all_hours }))}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-300">
                                                    {reportForm.use_all_hours ? 'Todos os horários' : 'Horários específicos'}
                                                </span>
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${reportForm.use_all_hours ? 'border-slate-600 bg-transparent' : 'border-primary bg-primary'
                                                    }`}>
                                                    {!reportForm.use_all_hours && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                            </div>
                                        </div>

                                        {!reportForm.use_all_hours && (
                                            <div className="bg-[#0a1323] border border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto">
                                                <div className="grid grid-cols-4 gap-2">
                                                    {HOUR_OPTIONS.map(hour => {
                                                        const isSelected = reportForm.selected_hours.includes(hour);
                                                        return (
                                                            <button
                                                                key={hour}
                                                                type="button"
                                                                onClick={() => {
                                                                    const newHours = isSelected
                                                                        ? reportForm.selected_hours.filter(h => h !== hour)
                                                                        : [...reportForm.selected_hours, hour].sort();
                                                                    setReportForm(prev => ({ ...prev, selected_hours: newHours }));
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
                                                {reportForm.selected_hours.length === 0 && (
                                                    <p className="text-xs text-orange-400 mt-2">Selecione pelo menos um horário</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                                <p className="text-[11px] text-primary font-medium leading-relaxed">
                                    O PDF será processado agora e enviado para os canais configurados.
                                </p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowReportModal(false)}
                                    className="flex-1 px-4 py-3 border border-white/10 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/5 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGenerateReport}
                                    disabled={generatingReport}
                                    className="flex-1 px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {generatingReport ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={16} />
                                            Gerar PDF
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

export default Dashboard;
