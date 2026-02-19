
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { alerts as allAlerts } from '../data/mockData';

interface AlertsProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details') => void;
}

const Alerts: React.FC<AlertsProps> = ({ onNavigate }) => {
    const { currentTenant } = useTenant();
    const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');

    // Filter by tenant and severity
    const tenantAlerts = allAlerts.filter(a => a.tenantId === currentTenant.id);
    const filteredAlerts = filter === 'all' ? tenantAlerts : tenantAlerts.filter(a => a.severity === filter);

    const criticalCount = tenantAlerts.filter(a => a.severity === 'critical').length;
    const warningCount = tenantAlerts.filter(a => a.severity === 'warning').length;

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical': return <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded text-xs font-bold uppercase">Critical</span>;
            case 'warning': return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded text-xs font-bold uppercase">Warning</span>;
            case 'info': return <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-1 rounded text-xs font-bold uppercase">Info</span>;
            default: return <span className="bg-slate-700 text-slate-400 px-2 py-1 rounded text-xs font-bold uppercase">Unknown</span>;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeItem="alerts" onNavigate={onNavigate} />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Top Bar */}
                <header className="h-16 flex items-center justify-between px-8 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-border">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Alertas de {currentTenant.name}</h2>
                    <div className="flex items-center gap-3">
                        <button className="text-sm text-slate-500 hover:text-primary transition-colors font-medium">Marcar todos como lidos</button>
                        <div className="h-4 w-px bg-slate-700 mx-2"></div>
                        <div className="flex bg-slate-800 rounded-lg p-1">
                            <button onClick={() => setFilter('all')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Todos</button>
                            <button onClick={() => setFilter('critical')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === 'critical' ? 'bg-red-500/20 text-red-500' : 'text-slate-400 hover:text-slate-200'}`}>Críticos</button>
                            <button onClick={() => setFilter('warning')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${filter === 'warning' ? 'bg-amber-500/20 text-amber-500' : 'text-slate-400 hover:text-slate-200'}`}>Avisos</button>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Alertas Ativos</p>
                                    <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{tenantAlerts.length}</h3>
                                </div>
                                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary">notifications_active</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Críticos</p>
                                    <h3 className="text-3xl font-bold text-red-500 mt-1">{criticalCount}</h3>
                                </div>
                                <div className="size-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-500">dangerous</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Avisos</p>
                                    <h3 className="text-3xl font-bold text-amber-500 mt-1">{warningCount}</h3>
                                </div>
                                <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-amber-500">warning</span>
                                </div>
                            </div>
                        </div>

                        {/* Alerts List */}
                        <div className="bg-white dark:bg-slate-card rounded-xl border border-slate-200 dark:border-slate-border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Severidade</th>
                                            <th className="px-6 py-4 font-medium">Dispositivo</th>
                                            <th className="px-6 py-4 font-medium">Mensagem</th>
                                            <th className="px-6 py-4 font-medium">Tempo</th>
                                            <th className="px-6 py-4 font-medium text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {filteredAlerts.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                    Nenhum alerta encontrado para este filtro.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAlerts.map((alert) => (
                                                <tr key={alert.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getSeverityBadge(alert.severity)}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300 font-medium">
                                                        {alert.device}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400">
                                                        {alert.message}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                                        {alert.time}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button className="p-1.5 text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Confirmar">
                                                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                                            </button>
                                                            <button className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Ver Detalhes">
                                                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
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
