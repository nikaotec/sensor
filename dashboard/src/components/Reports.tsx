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
import { CalendarRange, Download, Zap, TrendingUp, Timer, AlertOctagon, Lightbulb } from 'lucide-react';

interface ReportsProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details') => void;
}

const Reports: React.FC<ReportsProps> = ({ onNavigate }) => {
    const { currentTenant } = useTenant();
    if (!currentTenant) return <div className="flex h-screen items-center justify-center bg-background-dark text-white">Carregando dados...</div>;
    const tenantMetrics = metrics[currentTenant.id] || metrics['t1'];

    // Map consumptionData to Recharts format
    const barData = tenantMetrics.consumptionData.map((val, i) => ({
        name: `D${i + 1}`,
        value: val
    }));

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
                            { label: 'Energia Total', value: tenantMetrics.totalEnergy, icon: <Zap size={22} />, colorClass: 'text-primary bg-primary/10 border-primary/20', iconColor: 'text-primary' },
                            { label: 'Pico de Potência', value: tenantMetrics.peakPower, icon: <TrendingUp size={22} />, colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20', iconColor: 'text-amber-500' },
                            { label: 'Tempo de Atividade', value: tenantMetrics.uptime, icon: <Timer size={22} />, colorClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', iconColor: 'text-emerald-400' },
                            { label: 'Incidentes', value: String(tenantMetrics.incidents), icon: <AlertOctagon size={22} />, colorClass: 'text-[#E63946] bg-[#E63946]/10 border-[#E63946]/20', iconColor: 'text-[#E63946]' },
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
                            <h3 className="text-lg font-bold leading-tight tracking-tight text-white/90 font-heading mb-6">Consumo Diário por Dispositivo</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData}>
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
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                            <h3 className="text-lg font-bold leading-tight tracking-tight text-white/90 font-heading mb-6">Distribuição de Status da Frota</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={tenantMetrics.statusDistribution}
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {tenantMetrics.statusDistribution.map((entry, index) => (
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

                    <div className="bg-primary/10 border border-primary/20 p-8 rounded-2xl text-center shadow-lg relative overflow-hidden group hover:border-primary/40 transition-all">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="size-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary shadow-[0_0_30px_rgba(56,189,248,0.3)]">
                                <Lightbulb size={32} className="animate-pulse" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-bold mb-3 text-white tracking-tight">Insight de Inteligência Artificial</h3>
                            <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
                                Com base nos padrões de consumo dos últimos 30 dias na empresa <strong className="text-white">{currentTenant.name}</strong>, detectamos uma oportunidade de economia de <strong className="text-primary">12%</strong> ao otimizar o ciclo de degelo dos equipamentos de refrigeração entre 02:00 e 05:00 da manhã.
                            </p>
                            <button className="mt-6 px-6 py-2.5 bg-primary text-background-dark rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]">
                                APLICAR OTIMIZAÇÃO
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Reports;
