import React, { useState, useEffect } from 'react';
import { api } from '../contexts/AuthContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
    Calendar,
    Radio,
    MapPin,
    Bell,
    RefreshCw,
    Thermometer,
    BatteryCharging,
    Activity,
    Clock,
    ArrowUpRight
} from 'lucide-react';

export default function DashboardPage() {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDevices();
    }, []);

    useEffect(() => {
        if (selectedDevice) {
            fetchReadings(selectedDevice.id);
        }
    }, [selectedDevice]);

    const fetchDevices = async () => {
        try {
            const res = await api.get('/devices');
            setDevices(res.data);
            if (res.data.length > 0) {
                setSelectedDevice(res.data[0]);
            }
        } catch (err) {
            console.error('Error fetching devices:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchReadings = async (deviceId) => {
        try {
            const res = await api.get(`/devices/${deviceId}/readings?limit=50`);
            setReadings(res.data);
        } catch (err) {
            console.error('Error fetching readings:', err);
        }
    };

    const chartData = readings.map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        temperature: parseFloat(r.temperature),
    })).reverse();

    const stats = {
        totalDevices: devices.length,
        activeAlarms: devices.filter((d) => d.is_alarm).length,
        avgLatency: 42,
        lastSync: '2s ago',
    };

    const minTemp = readings.length > 0 ? Math.min(...readings.map((r) => parseFloat(r.temperature))) : 0;
    const maxTemp = readings.length > 0 ? Math.max(...readings.map((r) => parseFloat(r.temperature))) : 0;
    const avgTemp = readings.length > 0 ? (readings.reduce((sum, r) => sum + parseFloat(r.temperature), 0) / readings.length).toFixed(1) : 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard</h2>
                        <div className="flex items-center gap-2 px-3 py-1 bg-accent-green/10 rounded-full border border-accent-green/20">
                            <span className="w-2 h-2 bg-accent-green rounded-full pulse-green"></span>
                            <span className="text-[10px] uppercase font-bold text-accent-green tracking-widest">Live</span>
                        </div>
                    </div>
                    <p className="text-slate-400">Monitoramento em tempo real do sistema</p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-card-dark border border-white/10 px-4 py-2 rounded-lg flex items-center gap-2 text-sm text-slate-300 hover:bg-white/5 transition-colors">
                        <Calendar className="w-4 h-4" />
                        Hoje, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </button>
                </div>
            </header>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-card-dark p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Radio className="w-16 h-16 text-primary" />
                    </div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-primary/20 rounded-lg">
                            <Radio className="w-6 h-6 text-primary" />
                        </div>
                        <span className="flex items-center text-accent-green text-xs font-bold gap-1 bg-accent-green/10 px-2 py-1 rounded">
                            <ArrowUpRight className="w-3 h-3" /> 12%
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Total Dispositivos</p>
                    <h3 className="text-3xl font-bold text-white mt-1">{stats.totalDevices}</h3>
                </div>

                <div className="bg-card-dark p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <MapPin className="w-16 h-16 text-accent-purple" />
                    </div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-accent-purple/20 rounded-lg">
                            <MapPin className="w-6 h-6 text-accent-purple" />
                        </div>
                        <span className="text-slate-500 text-xs font-bold bg-white/5 px-2 py-1 rounded">Ativo</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Locais</p>
                    <h3 className="text-3xl font-bold text-white mt-1">24</h3>
                </div>

                <div className="bg-card-dark p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Bell className="w-16 h-16 text-accent-red" />
                    </div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-accent-red/20 rounded-lg">
                            <Bell className="w-6 h-6 text-accent-red" />
                        </div>
                        <span className="text-accent-red text-xs font-bold bg-accent-red/10 px-2 py-1 rounded">Atenção</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Alarmes Ativos</p>
                    <h3 className="text-3xl font-bold text-white mt-1">{stats.activeAlarms.toString().padStart(2, '0')}</h3>
                </div>

                <div className="bg-card-dark p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <RefreshCw className="w-16 h-16 text-accent-cyan" />
                    </div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-accent-cyan/20 rounded-lg">
                            <RefreshCw className="w-6 h-6 text-accent-cyan" />
                        </div>
                        <span className="text-accent-cyan text-xs font-bold bg-accent-cyan/10 px-2 py-1 rounded">{stats.lastSync}</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Última Atualização</p>
                    <h3 className="text-3xl font-bold text-white mt-1">Sincronizado</h3>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-8">
                {/* Device List Column */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                    <h4 className="text-white font-semibold text-lg flex items-center gap-2">
                        Dispositivos
                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-400 font-normal border border-white/5">
                            {devices.length} online
                        </span>
                    </h4>
                    <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 h-[600px]">
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="bg-card-dark p-4 rounded-xl border border-white/5">
                                    <div className="skeleton h-16 w-full"></div>
                                </div>
                            ))
                        ) : (
                            devices.map((device) => (
                                <div
                                    key={device.id}
                                    onClick={() => setSelectedDevice(device)}
                                    className={`bg-card-dark p-4 rounded-xl border relative overflow-hidden group cursor-pointer transition-all duration-200 ${selectedDevice?.id === device.id
                                        ? 'selected-glow border-primary/50 bg-primary/5'
                                        : 'border-white/5 hover:border-white/10 hover:bg-white/5'
                                        }`}
                                >
                                    {selectedDevice?.id === device.id && (
                                        <div className="absolute top-3 right-3">
                                            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(60,60,246,0.5)]"></span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${selectedDevice?.id === device.id ? 'bg-primary/20 text-primary' : 'bg-white/5 text-slate-400 group-hover:text-slate-300'
                                            }`}>
                                            <Thermometer className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-semibold transition-colors ${selectedDevice?.id === device.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                {device.name}
                                            </p>
                                            <p className="text-xs text-slate-500 font-mono">ID: {device.device_key}</p>
                                        </div>
                                        <div className="text-right mr-4">
                                            <p className={`text-xl font-bold font-mono ${selectedDevice?.id === device.id ? 'text-white' : 'text-slate-300'}`}>
                                                {device.last_temperature ? `${device.last_temperature}°` : '--'}
                                            </p>
                                            <p className={`text-[10px] font-bold uppercase ${device.is_alarm ? 'text-accent-red' : 'text-accent-green'}`}>
                                                {device.is_alarm ? 'Crítico' : 'Estável'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {!loading && devices.length === 0 && (
                            <div className="text-center py-10 bg-card-dark rounded-xl border border-white/5 border-dashed">
                                <Radio className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                                <p className="text-slate-400 text-sm">Nenhum dispositivo encontrado</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chart Column */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                    {/* Main Area Chart */}
                    <div className="bg-card-dark rounded-xl border border-white/5 p-6 flex flex-col h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h4 className="text-white font-semibold flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" />
                                    Histórico de Temperatura
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Últimas 50 leituras {selectedDevice ? `de ${selectedDevice.name}` : ''}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 bg-white/5 text-xs font-medium rounded hover:bg-white/10 text-slate-300 transition-colors">1h</button>
                                <button className="px-3 py-1 bg-primary text-xs font-medium rounded text-white shadow-lg shadow-primary/25">6h</button>
                                <button className="px-3 py-1 bg-white/5 text-xs font-medium rounded hover:bg-white/10 text-slate-300 transition-colors">24h</button>
                            </div>
                        </div>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3c3cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3c3cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis
                                        dataKey="time"
                                        stroke="#475569"
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        stroke="#475569"
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            color: '#e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                        }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '0.25rem' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="temperature"
                                        stroke="#3c3cf6"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorTemp)"
                                        activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Mini Info Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-card-dark p-4 rounded-xl border border-white/5">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                                <ArrowUpRight className="w-3 h-3 rotate-180 text-accent-cyan" /> Mínima (24h)
                            </p>
                            <p className="text-xl font-bold text-white font-mono">{minTemp.toFixed(1)}°C</p>
                        </div>
                        <div className="bg-card-dark p-4 rounded-xl border border-white/5">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                                <ArrowUpRight className="w-3 h-3 text-accent-red" /> Máxima (24h)
                            </p>
                            <p className="text-xl font-bold text-white font-mono">{maxTemp.toFixed(1)}°C</p>
                        </div>
                        <div className="bg-card-dark p-4 rounded-xl border border-white/5">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Activity className="w-3 h-3 text-primary" /> Média
                            </p>
                            <p className="text-xl font-bold text-white font-mono">{avgTemp}°C</p>
                        </div>
                        <div className="bg-card-dark p-4 rounded-xl border border-white/5">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                                <BatteryCharging className="w-3 h-3 text-accent-green" /> Bateria
                            </p>
                            <div className="flex items-center gap-2">
                                <p className="text-xl font-bold text-accent-green font-mono">94%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Table/Log Section */}
            <div className="bg-card-dark rounded-xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <h4 className="text-white font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        Log de Eventos Recentes
                    </h4>
                    <button className="text-primary text-xs font-bold hover:text-primary-light transition-colors flex items-center gap-1">
                        Ver todos <ArrowUpRight className="w-3 h-3" />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-500 text-xs uppercase font-bold border-b border-white/5 bg-white/[0.01]">
                                <th className="px-6 py-4">Evento</th>
                                <th className="px-6 py-4">Dispositivo</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Valor</th>
                                <th className="px-6 py-4">Horário</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {readings.slice(0, 5).map((reading, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 text-white font-medium flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${reading.is_alarm ? 'bg-accent-red' : 'bg-primary'}`}></div>
                                        Variação Térmica
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{selectedDevice?.name || 'Sensor'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase border ${reading.is_alarm
                                            ? 'bg-accent-red/10 text-accent-red border-accent-red/20'
                                            : 'bg-accent-green/10 text-accent-green border-accent-green/20'
                                            }`}>
                                            {reading.is_alarm ? 'Crítico' : 'Informativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300 font-mono">{reading.temperature}°C</td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">
                                        {new Date(reading.timestamp).toLocaleString('pt-BR')}
                                    </td>
                                </tr>
                            ))}
                            {readings.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500 text-sm italic">
                                        Nenhum evento registrado recentemente.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
