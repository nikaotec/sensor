
import React from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { metrics } from '../data/mockData';
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

interface ReportsProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details') => void;
}

const Reports: React.FC<ReportsProps> = ({ onNavigate }) => {
    const { currentTenant } = useTenant();
    const tenantMetrics = metrics[currentTenant.id] || metrics['t1'];

    // Map consumptionData to Recharts format
    const barData = tenantMetrics.consumptionData.map((val, i) => ({
        name: `D${i + 1}`,
        value: val
    }));

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeItem="reports" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 flex items-center justify-between px-8 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-border">
                    <h2 className="text-xl font-bold">Relatórios e Insights - {currentTenant.name}</h2>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-slate-100 dark:bg-slate-card rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors">
                            <span className="material-symbols-outlined text-sm">calendar_month</span>
                            Últimos 30 Dias
                        </button>
                        <button className="px-4 py-2 bg-primary text-background-dark rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors">
                            <span className="material-symbols-outlined text-sm">download</span>
                            Exportar PDF
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[
                            { label: 'Energia Total', value: tenantMetrics.totalEnergy, icon: 'bolt', color: 'emerald' },
                            { label: 'Pico de Potência', value: tenantMetrics.peakPower, icon: 'show_chart', color: 'amber' },
                            { label: 'Tempo de Atividade', value: tenantMetrics.uptime, icon: 'timer', color: 'primary' },
                            { label: 'Incidentes', value: String(tenantMetrics.incidents), icon: 'error_outline', color: 'red' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-${stat.color}-500`}>
                                        <span className="material-symbols-outlined">{stat.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold">{stat.label}</p>
                                        <p className="text-xl font-bold">{stat.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm">
                            <h3 className="text-lg font-bold mb-6">Consumo Diário por Dispositivo</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                                        />
                                        <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-card p-6 rounded-xl border border-slate-200 dark:border-slate-border shadow-sm">
                            <h3 className="text-lg font-bold mb-6">Distribuição de Status da Frota</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={tenantMetrics.statusDistribution}
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {tenantMetrics.statusDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 p-8 rounded-xl text-center">
                        <span className="material-symbols-outlined text-4xl text-primary mb-4">insights</span>
                        <h3 className="text-xl font-bold mb-2">Insight de IA para {currentTenant.name}</h3>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            Com base nos padrões de consumo dos últimos 30 dias, detectamos uma oportunidade de economia de 12%
                            ao otimizar o ciclo de degelo dos equipamentos HVAC entre 02:00 e 05:00 da manhã.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Reports;
