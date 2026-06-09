import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { BellRing, ShieldAlert, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface AlertsProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel' | 'admin-users' | 'ota-panel') => void;
    onDeviceClick?: (deviceId: string) => void;
}

const Alerts: React.FC<AlertsProps> = ({ onNavigate, onDeviceClick }) => {
    const { currentTenant } = useTenant();
    const { currentUser } = useAuth();

    // Gestores e não-gestores usam o tenant selecionado ou 'all' como padrão.
    // O hook useSupabaseData já se encarrega de restringir os eventos por tenant_id
    // para usuários não-gestores.
    const safeTenantId = currentTenant?.id || 'all';

    const { events, refreshEvents, devices } = useSupabaseData(safeTenantId, undefined, currentUser?.role, currentUser?.allowedDevices);
    const [pendingConfirmations, setPendingConfirmations] = useState<Set<string>>(new Set());
    const [confirmedAlerts, setConfirmedAlerts] = useState<Set<string>>(new Set());

    if (!currentTenant) return <div className="flex h-screen items-center justify-center bg-background-dark text-white">Carregando dados...</div>;

    const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');

    // Mapear eventos do Firestore para o formato da UI
    const tenantAlerts = events
        .filter(e => e.type.startsWith('ALERTA_') || e.type.includes('NORMALIZADA') || e.type.includes('RESTABELECIDA') || e.type.includes('FECHADA'))
        .filter(e => {
            if (confirmedAlerts.has(e.id)) return false;
            // O backend altera a severity para 'info' quando o alerta é confirmado
            if ((e as any).severity === 'info' && e.type.startsWith('ALERTA_')) return false;
            return true;
        })
        .map(e => {
            let dateStr = 'Recent';
            if (e.timestamp) {
                // Handle Firestore Timestamp or ISO string
                const timestamp = (e as any).timestamp;
                if (timestamp.seconds) {
                    dateStr = new Date(timestamp.seconds * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                } else {
                    dateStr = new Date(timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                }
            }
            const deviceObj = devices.find(d => d.id === e.deviceId);
            return {
                id: e.id,
                deviceId: e.deviceId,
                type: e.type,
                severity: (e as any).severity || (e.type.startsWith('ALERTA_') ? 'critical' : 'info'),
                device: deviceObj ? deviceObj.name : ((e as any).deviceName || e.deviceId),
                message: e.message || e.msg || 'Alerta detectado',
                time: dateStr,
                value: (e as any).value || 'N/A'
            };
        });

    const handleConfirmAlert = async (e: React.MouseEvent, alertId: string) => {
        e.stopPropagation();
        console.log('Confirming alert:', alertId);
        setPendingConfirmations(prev => new Set(prev).add(alertId));
        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nikaotech.com/api';
            const response = await fetch(`${API_BASE_URL}/events/${alertId}/confirm`, {
                method: 'PUT'
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Falha ao confirmar alerta na API: ${errText || response.statusText}`);
            }

            console.log('Alert confirmed in DB');
            setConfirmedAlerts(prev => new Set(prev).add(alertId));

            // Força atualização dos dados
            if (refreshEvents) {
                await refreshEvents();
            }
        } catch (err) {
            console.error('Error confirming alert:', err);
            alert('Erro ao confirmar alerta. Verifique o console.');
        } finally {
            setPendingConfirmations(prev => {
                const next = new Set(prev);
                next.delete(alertId);
                return next;
            });
        }
    };

    const filteredAlerts = filter === 'all' ? tenantAlerts : tenantAlerts.filter(a => a.severity === filter);

    const criticalCount = tenantAlerts.filter(a => a.severity === 'critical').length;
    const warningCount = tenantAlerts.filter(a => a.severity === 'warning').length;

    const getSeverityBadge = (alert: any) => {
        const text = `${alert.type} ${alert.message}`.toLowerCase();
        let colorClass = '';
        let label = '';
        
        if (text.includes('temperatura alta') || text.includes('temp_alta')) {
            colorClass = 'bg-red-500/10 text-red-500 border-red-500/30';
            label = 'Temp. Alta';
        } else if (text.includes('temperatura baixa') || text.includes('temp_baixa')) {
            colorClass = 'bg-blue-500/10 text-blue-500 border-blue-500/30';
            label = 'Temp. Baixa';
        } else if (text.includes('bateria') || text.includes('battery')) {
            colorClass = 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30';
            label = 'Bateria';
        } else if (text.includes('220v') || text.includes('tensão') || text.includes('energia')) {
            colorClass = 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30';
            label = 'Tensão 220V';
        } else if (text.includes('porta') || text.includes('door') || text.includes('aberta')) {
            colorClass = 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30';
            label = 'Porta Aberta';
        } else {
            switch (alert.severity) {
                case 'critical': 
                    colorClass = 'bg-[#E63946]/10 text-[#E63946] border-[#E63946]/30';
                    label = 'Crítico';
                    break;
                case 'warning': 
                    colorClass = 'bg-amber-500/10 text-amber-500 border-amber-500/30';
                    label = 'Aviso';
                    break;
                case 'info': 
                    colorClass = 'bg-primary/10 text-primary border-primary/30';
                    label = 'Info';
                    break;
                default: 
                    colorClass = 'bg-slate-800 text-slate-400 border-slate-700';
                    label = 'Desconhecido';
            }
        }
        
        return <span className={`${colorClass} border px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest`}>{label}</span>;
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-dark text-slate-100 font-display">
            <Sidebar activeItem="alerts" onNavigate={onNavigate} />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background-dark">

                {/* Top Bar */}
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-8 bg-[#1A1D17]/80 backdrop-blur-md border-b border-[#2A2E24] sticky top-0 z-30 shadow-sm">
                    <h2 className="text-xl font-bold text-white tracking-tight">Alertas de {currentTenant.name}</h2>
                    <div className="flex items-center gap-4">
                        <button className="text-xs text-slate-400 hover:text-primary transition-colors font-bold uppercase tracking-widest bg-[#0F110D] px-4 py-2 rounded-xl border border-[#2A2E24]">Marcar todos como lidos</button>
                        <div className="flex bg-[#0F110D] rounded-xl p-1 border border-[#2A2E24]">
                            <button onClick={() => setFilter('all')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all tracking-widest uppercase border ${filter === 'all' ? 'bg-primary/20 text-primary border-primary/30' : 'text-slate-400 hover:text-white border-transparent'}`}>Todos</button>
                            <button onClick={() => setFilter('critical')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all tracking-widest uppercase border ${filter === 'critical' ? 'bg-[#E63946]/20 text-[#E63946] border-[#E63946]/30' : 'text-slate-400 hover:text-white border-transparent'}`}>Críticos</button>
                            <button onClick={() => setFilter('warning')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all tracking-widest uppercase border ${filter === 'warning' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'text-slate-400 hover:text-white border-transparent'}`}>Avisos</button>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 pb-24 sm:pb-8 custom-scrollbar 2xl:max-w-[1600px] 2xl:mx-auto w-full">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[#1A1D17] p-6 rounded-2xl border border-[#2A2E24] shadow-lg flex items-center justify-between group hover:border-primary/50 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                    <BellRing size={64} className="text-primary" />
                                </div>
                                <div className="z-10">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 font-heading">Alertas Ativos</p>
                                    <h3 className="text-4xl font-bold text-white tracking-tight">{tenantAlerts.length}</h3>
                                </div>
                                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 z-10">
                                    <BellRing className="text-primary" size={24} />
                                </div>
                            </div>
                            <div className="bg-[#1A1D17] p-6 rounded-2xl border border-[#2A2E24] shadow-lg flex items-center justify-between group hover:border-[#E63946]/50 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                    <ShieldAlert size={64} className="text-[#E63946]" />
                                </div>
                                <div className="z-10">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 font-heading">Críticos</p>
                                    <h3 className="text-4xl font-bold text-[#E63946] tracking-tight">{criticalCount}</h3>
                                </div>
                                <div className="size-12 rounded-xl bg-[#E63946]/10 flex items-center justify-center border border-[#E63946]/20 z-10">
                                    <ShieldAlert className="text-[#E63946]" size={24} />
                                </div>
                            </div>
                            <div className="bg-[#1A1D17] p-6 rounded-2xl border border-[#2A2E24] shadow-lg flex items-center justify-between group hover:border-amber-500/50 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                    <AlertTriangle size={64} className="text-amber-500" />
                                </div>
                                <div className="z-10">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 font-heading">Avisos</p>
                                    <h3 className="text-4xl font-bold text-amber-500 tracking-tight">{warningCount}</h3>
                                </div>
                                <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 z-10">
                                    <AlertTriangle className="text-amber-500" size={24} />
                                </div>
                            </div>
                        </div>

                        {/* Alerts List */}
                        <div className="bg-[#1A1D17] rounded-2xl border border-[#2A2E24] shadow-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-[#0F110D] border-b border-[#2A2E24] font-heading">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">Severidade</th>
                                            <th className="px-6 py-4 font-bold">Dispositivo</th>
                                            <th className="px-6 py-4 font-bold">Mensagem</th>
                                            <th className="px-6 py-4 font-bold">Tempo</th>
                                            <th className="px-6 py-4 font-bold text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#2A2E24]">
                                        {filteredAlerts.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <CheckCircle2 size={40} className="text-primary/50 mb-3" />
                                                        <p>Nenhum alerta encontrado para este filtro.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAlerts.map((alert) => (
                                                <tr key={alert.id} className="hover:bg-[#2A2E24]/30 transition-colors group">
                                                    <td className="px-6 py-5 whitespace-nowrap">
                                                        {getSeverityBadge(alert)}
                                                    </td>
                                                    <td className="px-6 py-5 text-white font-medium">
                                                        {alert.device}
                                                    </td>
                                                    <td className="px-6 py-5 text-slate-400">
                                                        {alert.message}
                                                    </td>
                                                    <td className="px-6 py-5 text-slate-500 font-mono text-xs">
                                                        {alert.time}
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <button
                                                                onClick={(e) => handleConfirmAlert(e, alert.id)}
                                                                disabled={pendingConfirmations.has(alert.id) || confirmedAlerts.has(alert.id) || alert.severity === 'info'}
                                                                className={`p-2 rounded-lg transition-all shadow-sm relative z-10 border ${confirmedAlerts.has(alert.id) || alert.severity === 'info'
                                                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 cursor-default'
                                                                    : pendingConfirmations.has(alert.id)
                                                                        ? 'text-slate-500 bg-[#0F110D] border-[#2A2E24] opacity-50 cursor-wait'
                                                                        : 'text-slate-500 hover:text-emerald-400 bg-[#0F110D] hover:bg-emerald-500/10 border border-[#2A2E24] hover:border-emerald-500/30 cursor-pointer'
                                                                    }`}
                                                                title={confirmedAlerts.has(alert.id) || alert.severity === 'info' ? "Confirmado" : "Confirmar"}
                                                            >
                                                                <CheckCircle2 size={16} className={pendingConfirmations.has(alert.id) ? 'animate-pulse' : ''} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    console.log('Deep navigating to device:', alert.deviceId);
                                                                    if (onDeviceClick) onDeviceClick(alert.deviceId);
                                                                    else console.warn('onDeviceClick prop is missing!');
                                                                }}
                                                                className="text-slate-500 hover:text-primary bg-[#0F110D] hover:bg-primary/10 border border-[#2A2E24] hover:border-primary/30 p-2 rounded-lg transition-all shadow-sm relative z-10 cursor-pointer"
                                                                title="Ver Detalhes"
                                                            >
                                                                <ArrowRight size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default Alerts;
