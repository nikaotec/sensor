import React from 'react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    ReferenceLine
} from 'recharts';

interface DeviceHistoryChartProps {
    history: any[];
    deviceStatus: string;
    tempMinInput: string;
    tempMaxInput: string;
}

const DeviceHistoryChart: React.FC<DeviceHistoryChartProps> = ({
    history,
    deviceStatus,
    tempMinInput,
    tempMaxInput
}) => {
    return (
        <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-white">Histórico de Temperatura (24h)</h3>
                <div className="flex gap-2">
                    {deviceStatus === 'online' && <span className="text-[10px] font-bold px-3 py-1.5 bg-primary text-background-dark rounded-lg uppercase tracking-widest shadow-lg shadow-primary/20">Ao Vivo</span>}
                </div>
            </div>
            <div className="h-[400px] relative w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history && history.length > 0 ? history : []}>
                        <defs>
                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2E24" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dx={-10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0F110D', border: '1px solid #2A2E24', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }} />
                        {tempMinInput && (
                            <ReferenceLine y={parseFloat(tempMinInput)} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideBottomRight', value: 'Mín', fill: '#ef4444', fontSize: 9 }} />
                        )}
                        {tempMaxInput && (
                            <ReferenceLine y={parseFloat(tempMaxInput)} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'Máx', fill: '#ef4444', fontSize: 9 }} />
                        )}
                        <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                    </AreaChart>
                </ResponsiveContainer>
                {(!history || history.length === 0) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-slate-500 text-sm">Aguardando dados históricos do dispositivo...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeviceHistoryChart;
