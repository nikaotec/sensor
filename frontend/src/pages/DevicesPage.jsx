import React, { useState, useEffect } from 'react';
import { api, useAuth } from '../contexts/AuthContext';

export default function DevicesPage() {
    const { isAdmin } = useAuth();
    const [devices, setDevices] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ device_key: '', name: '', location_id: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [devRes, locRes] = await Promise.all([api.get('/devices'), api.get('/locations')]);
            setDevices(devRes.data);
            setLocations(locRes.data);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/devices', { ...form, location_id: form.location_id || null });
            setForm({ device_key: '', name: '', location_id: '' });
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao criar dispositivo');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Remover este dispositivo?')) return;
        try {
            await api.delete(`/devices/${id}`);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao remover');
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="p-8 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-cyan to-primary flex items-center justify-center">
                        <span className="material-icons-round text-white text-2xl">memory</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Dispositivos</h1>
                        <p className="text-slate-400 text-sm">Gerencie sua rede de sensores de temperatura</p>
                    </div>
                </div>
                {isAdmin && (
                    <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-primary/30">
                        <span className="material-icons-round">add</span>
                        Novo Dispositivo
                    </button>
                )}
            </header>

            <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
                {/* Quick Add Form */}
                {isAdmin && (
                    <section className="bg-surface border border-primary/10 rounded-xl p-1 shadow-sm">
                        <form className="flex flex-col md:flex-row items-center gap-4 p-4" onSubmit={handleSubmit}>
                            <div className="flex-1 w-full">
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 ml-1">Device Key</label>
                                <input
                                    className="w-full bg-background-dark border-none rounded-lg py-2.5 px-4 monospace-font text-primary placeholder:text-slate-700 focus:ring-1 focus:ring-primary"
                                    placeholder="TX-102-445"
                                    type="text"
                                    value={form.device_key}
                                    onChange={(e) => setForm({ ...form, device_key: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex-[1.5] w-full">
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 ml-1">Device Name</label>
                                <input
                                    className="w-full bg-background-dark border-none rounded-lg py-2.5 px-4 text-white placeholder:text-slate-400 focus:ring-1 focus:ring-primary"
                                    placeholder="Sensor Freezer 01"
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 ml-1">Location</label>
                                <select
                                    className="w-full bg-background-dark border-none rounded-lg py-2.5 px-4 text-white focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                                    value={form.location_id}
                                    onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                                >
                                    <option value="">Sem local</option>
                                    {locations.map((loc) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-5">
                                <button
                                    className="bg-primary/20 hover:bg-primary text-primary hover:text-white transition-all w-12 h-10 rounded-lg flex items-center justify-center"
                                    type="submit"
                                >
                                    <span className="material-icons-round">arrow_forward</span>
                                </button>
                            </div>
                        </form>
                    </section>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
                        {error}
                    </div>
                )}

                {/* Devices Table */}
                <section className="bg-surface border border-primary/10 rounded-xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-primary/5">
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Device Key</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Name</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Local</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Last Activity</th>
                                {isAdmin && (
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Ações</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/5">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-5" colSpan="5">
                                            <div className="skeleton h-12 w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : devices.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-12 text-center text-slate-500" colSpan="5">
                                        Nenhum dispositivo cadastrado
                                    </td>
                                </tr>
                            ) : (
                                devices.map((device) => (
                                    <tr key={device.id} className="group hover:bg-row-hover transition-colors">
                                        <td className="px-6 py-5">
                                            <span className="monospace-font text-primary text-sm font-medium">{device.device_key}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${device.is_alarm ? 'bg-amber-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'}`}></div>
                                                <span className="font-bold text-white">{device.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-slate-400 text-sm">{device.location_name || '—'}</td>
                                        <td className="px-6 py-5 text-slate-400 text-sm">
                                            {device.last_seen ? new Date(device.last_seen).toLocaleString('pt-BR') : 'Inativo'}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex justify-end gap-2">
                                                    <button className="p-2 rounded-md hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors">
                                                        <span className="material-icons-round text-lg">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(device.id)}
                                                        className="p-2 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <span className="material-icons-round text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination / Footer */}
                    <div className="px-6 py-4 border-t border-primary/5 flex items-center justify-between bg-background-dark/30">
                        <span className="text-xs text-slate-500">Exibindo {devices.length} de {devices.length} dispositivos</span>
                        <div className="flex items-center gap-1">
                            <button className="p-1.5 rounded hover:bg-primary/10 text-slate-400">
                                <span className="material-icons-round text-sm">chevron_left</span>
                            </button>
                            <button className="w-7 h-7 rounded bg-primary text-white text-xs font-bold">1</button>
                            <button className="w-7 h-7 rounded hover:bg-primary/10 text-slate-500 text-xs">2</button>
                            <button className="w-7 h-7 rounded hover:bg-primary/10 text-slate-500 text-xs">3</button>
                            <button className="p-1.5 rounded hover:bg-primary/10 text-slate-400">
                                <span className="material-icons-round text-sm">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Status Cards Section */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-surface border border-primary/10 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 text-sm font-medium">Ativos agora</span>
                            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                <span className="material-icons-round text-lg">bolt</span>
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white">{devices.length}</div>
                        <p className="text-xs text-green-500 mt-2 flex items-center gap-1 font-medium">
                            <span className="material-icons-round text-xs">arrow_upward</span>
                            +2 dispositivos hoje
                        </p>
                    </div>
                    <div className="p-6 bg-surface border border-primary/10 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 text-sm font-medium">Alertas Pendentes</span>
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                <span className="material-icons-round text-lg">warning_amber</span>
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white">{devices.filter((d) => d.is_alarm).length.toString().padStart(2, '0')}</div>
                        <p className="text-xs text-amber-500 mt-2 font-medium">Monitoramento Crítico</p>
                    </div>
                    <div className="p-6 bg-surface border border-primary/10 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 text-sm font-medium">Média de Latência</span>
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <span className="material-icons-round text-lg">speed</span>
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-white">42ms</div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Excelente estabilidade</p>
                    </div>
                </section>
            </div>
        </div>
    );
}
