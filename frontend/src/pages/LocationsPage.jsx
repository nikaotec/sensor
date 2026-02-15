import React, { useState, useEffect } from 'react';
import { api, useAuth } from '../contexts/AuthContext';

export default function LocationsPage() {
    const { isAdmin } = useAuth();
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', address: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const res = await api.get('/locations');
            setLocations(res.data);
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
            await api.post('/locations', form);
            setForm({ name: '', address: '' });
            setShowForm(false);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao criar local');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Remover este local?')) return;
        try {
            await api.delete(`/locations/${id}`);
            fetchLocations();
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao remover');
        }
    };

    return (
        <div>
            {/* Top Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-xl shadow-primary/20">
                        <span className="material-icons-round text-white text-3xl">map</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Locais</h1>
                        <p className="text-slate-400 font-medium">Gerencie os pontos de monitoramento de temperatura</p>
                    </div>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/25 active:scale-95"
                    >
                        <span className="material-icons-round">add</span>
                        Novo Local
                    </button>
                )}
            </header>

            {/* Form Section */}
            {showForm && (
                <div className="mb-8 bg-surface p-6 rounded-xl border border-primary/20 animate-fade-in-down">
                    <h2 className="text-xl font-bold text-white mb-4">Novo Local</h2>
                    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome do Local</label>
                            <input
                                type="text"
                                placeholder="Ex: Galpão Principal"
                                className="w-full bg-background-dark border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="flex-[2] w-full">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Endereço Completo</label>
                            <input
                                type="text"
                                placeholder="Rua, Número, Bairro, Cidade - UF"
                                className="w-full bg-background-dark border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition-all"
                        >
                            Salvar
                        </button>
                    </form>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-surface p-4 rounded-xl border border-primary/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-icons-round">apartment</span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Locais</p>
                        <p className="text-xl font-bold text-white">{locations.length}</p>
                    </div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-primary/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                        <span className="material-icons-round">check_circle</span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ativos</p>
                        <p className="text-xl font-bold text-white">{locations.length}</p>
                    </div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-primary/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <span className="material-icons-round">warning</span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Alertas</p>
                        <p className="text-xl font-bold text-white">2</p>
                    </div>
                </div>
                <div className="bg-surface p-4 rounded-xl border border-primary/10 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <span className="material-icons-round">device_thermostat</span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sensores</p>
                        <p className="text-xl font-bold text-white">48</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            {/* Grid of Location Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="bg-surface rounded-xl border border-primary/10 p-6">
                            <div className="skeleton h-32 w-full"></div>
                        </div>
                    ))
                ) : (
                    <>
                        {locations.map((location) => (
                            <div
                                key={location.id}
                                className="location-card relative group bg-surface rounded-xl border border-primary/10 p-6 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <span className="material-icons-round text-primary text-2xl">location_on</span>
                                    </div>
                                    {isAdmin && (
                                        <div className="card-hover-actions flex gap-2">
                                            <button className="w-9 h-9 rounded-lg bg-background-dark text-slate-300 hover:bg-primary hover:text-white transition-all flex items-center justify-center">
                                                <span className="material-icons-round text-lg">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(location.id)}
                                                className="w-9 h-9 rounded-lg bg-background-dark text-slate-300 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                            >
                                                <span className="material-icons-round text-lg">delete</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{location.name}</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2 text-slate-400">
                                        <span className="material-icons-round text-sm mt-0.5">place</span>
                                        <p className="text-sm">{location.address || 'Endereço não informado'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <span className="material-icons-round text-sm">calendar_today</span>
                                        <p className="text-xs font-medium">
                                            Criado em: {new Date(location.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-primary/5 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        <div className="w-8 h-8 rounded-full border-2 border-surface bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                                            +3
                                        </div>
                                    </div>
                                    <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full font-bold">
                                        {location.device_count || 0} Sensores
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Empty State / Add New Card */}
                        {isAdmin && (
                            <div
                                onClick={() => setShowForm(true)}
                                className="border-2 border-dashed border-primary/20 rounded-xl flex flex-col items-center justify-center p-8 hover:border-primary transition-all cursor-pointer bg-primary/5 min-h-[280px]"
                            >
                                <div className="w-16 h-16 rounded-full bg-background-dark border border-primary/10 flex items-center justify-center text-primary mb-4">
                                    <span className="material-icons-round text-3xl">add_location_alt</span>
                                </div>
                                <h4 className="text-lg font-bold text-white mb-1">Novo Local</h4>
                                <p className="text-slate-400 text-sm text-center">
                                    Clique aqui para adicionar uma nova unidade de monitoramento
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Pagination / Footer info */}
            <footer className="mt-12 flex flex-col md:flex-row items-center justify-between text-slate-400 text-sm">
                <p>Mostrando {locations.length} de {locations.length} locais cadastrados</p>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <button className="w-10 h-10 rounded-lg bg-surface border border-primary/10 flex items-center justify-center hover:bg-primary/10 transition-all">
                        <span className="material-icons-round">chevron_left</span>
                    </button>
                    <button className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold">1</button>
                    <button className="w-10 h-10 rounded-lg bg-surface border border-primary/10 flex items-center justify-center hover:bg-primary/10 transition-all">
                        2
                    </button>
                    <button className="w-10 h-10 rounded-lg bg-surface border border-primary/10 flex items-center justify-center hover:bg-primary/10 transition-all">
                        3
                    </button>
                    <button className="w-10 h-10 rounded-lg bg-surface border border-primary/10 flex items-center justify-center hover:bg-primary/10 transition-all">
                        <span className="material-icons-round">chevron_right</span>
                    </button>
                </div>
            </footer>
        </div>
    );
}
