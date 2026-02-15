import React, { useState, useEffect } from 'react';
import { api, useAuth } from '../contexts/AuthContext';

export default function SettingsPage() {
    const { user, isAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [mqtt, setMqtt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, mqttRes] = await Promise.all([api.get('/users'), api.get('/mqtt/credentials')]);
            setUsers(usersRes.data);
            setMqtt(mqttRes.data);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        // Show toast notification
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/users', form);
            setForm({ name: '', email: '', password: '', role: 'viewer' });
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao convidar usuário');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Remover este usuário?')) return;
        try {
            await api.delete(`/users/${id}`);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao remover');
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <header className="flex items-center gap-4 mb-12">
                <div className="orange-gradient p-3 rounded-xl shadow-lg shadow-orange-500/20">
                    <span className="material-icons-round text-white text-3xl">settings</span>
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Configurações</h1>
                    <p className="text-white/50 text-sm">Gerencie sua infraestrutura MQTT e permissões de equipe.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-12">
                {/* Section 1: MQTT Credentials */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                            <span className="material-icons-round text-primary">hub</span>
                            Credenciais de Conexão MQTT
                        </h2>
                        <span className="text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">
                            Servidor Online
                        </span>
                    </div>
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="skeleton h-20 w-full rounded-xl"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Topic Card */}
                            <div className="bg-surface border border-border-muted p-5 rounded-xl hover:border-primary/50 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Tópico Base</span>
                                    <button
                                        onClick={() => handleCopy(mqtt?.topic || '')}
                                        className="text-white/30 hover:text-primary transition-colors"
                                    >
                                        <span className="material-icons-round text-sm">content_copy</span>
                                    </button>
                                </div>
                                <p className="mono-text text-primary text-lg font-medium">{mqtt?.topic || '—'}</p>
                            </div>
                            {/* User Card */}
                            <div className="bg-surface border border-border-muted p-5 rounded-xl hover:border-primary/50 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Usuário MQTT</span>
                                    <button
                                        onClick={() => handleCopy(mqtt?.user || '')}
                                        className="text-white/30 hover:text-primary transition-colors"
                                    >
                                        <span className="material-icons-round text-sm">content_copy</span>
                                    </button>
                                </div>
                                <p className="mono-text text-primary text-lg font-medium">{mqtt?.user || '—'}</p>
                            </div>
                            {/* Password Card */}
                            <div className="bg-surface border border-border-muted p-5 rounded-xl hover:border-primary/50 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Senha</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-white/30 hover:text-white transition-colors"
                                        >
                                            <span className="material-icons-round text-sm">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => handleCopy(mqtt?.password || '')}
                                            className="text-white/30 hover:text-primary transition-colors"
                                        >
                                            <span className="material-icons-round text-sm">content_copy</span>
                                        </button>
                                    </div>
                                </div>
                                <p className="mono-text text-primary text-lg font-medium">
                                    {showPassword ? mqtt?.password : '••••••••••••••••'}
                                </p>
                            </div>
                            {/* Slug Card */}
                            <div className="bg-surface border border-border-muted p-5 rounded-xl hover:border-primary/50 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Client Slug</span>
                                    <button
                                        onClick={() => handleCopy(mqtt?.slug || '')}
                                        className="text-white/30 hover:text-primary transition-colors"
                                    >
                                        <span className="material-icons-round text-sm">content_copy</span>
                                    </button>
                                </div>
                                <p className="mono-text text-primary text-lg font-medium">{mqtt?.slug || '—'}</p>
                            </div>
                        </div>
                    )}
                </section>

                {/* Section 2: User Management */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                            <span className="material-icons-round text-primary">group</span>
                            Gerenciamento de Usuários
                        </h2>
                        <span className="text-white/40 text-sm">{users.length} usuários ativos</span>
                    </div>

                    {/* Invite Form */}
                    {isAdmin && (
                        <div className="bg-surface/30 border border-dashed border-border-muted p-6 rounded-xl mb-8">
                            <h3 className="text-sm font-semibold mb-4 text-white/80">Convidar Novo Membro</h3>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Nome Completo</label>
                                    <input
                                        className="w-full bg-surface border border-border-muted rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-white/20 text-white"
                                        placeholder="Ex: Roberto Silva"
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-white/40 ml-1">E-mail</label>
                                    <input
                                        className="w-full bg-surface border border-border-muted rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-white/20 text-white"
                                        placeholder="roberto@empresa.com"
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Senha Provisória</label>
                                    <input
                                        className="w-full bg-surface border border-border-muted rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-white/20 text-white"
                                        placeholder="••••••••"
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-white/40 ml-1">Cargo</label>
                                    <select
                                        className="w-full bg-surface border border-border-muted rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-white/80"
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    >
                                        <option value="viewer">Visualizador</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                                <button
                                    className="bg-primary hover:bg-primary/80 text-white py-2 px-6 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                                    type="submit"
                                >
                                    <span className="material-icons-round text-sm">person_add</span>
                                    Convidar
                                </button>
                            </form>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Users Table */}
                    <div className="bg-surface border border-border-muted rounded-xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-bottom border-border-muted">
                                    <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-white/40 font-bold">Membro</th>
                                    <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-white/40 font-bold">E-mail</th>
                                    <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-white/40 font-bold">Cargo</th>
                                    {isAdmin && (
                                        <th className="px-6 py-4 text-[11px] uppercase tracking-wider text-white/40 font-bold text-right">Ações</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-muted">
                                {loading ? (
                                    [...Array(4)].map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4" colSpan="4">
                                                <div className="skeleton h-12 w-full"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    users.map((u) => (
                                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center font-bold text-white shadow-inner">
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{u.name}</p>
                                                    {u.id === user?.id && (
                                                        <p className="text-[10px] text-emerald-500 uppercase font-bold">Você</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-white/60 text-sm mono-text">{u.email}</td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`text-xs px-3 py-1 rounded-full ${u.role === 'admin'
                                                        ? 'bg-primary/10 text-primary border border-primary/20'
                                                        : 'bg-white/5 text-white/60 border border-white/10'
                                                        }`}
                                                >
                                                    {u.role === 'admin' ? 'Administrador' : 'Visualizador'}
                                                </span>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button className="p-2 text-white/20 hover:text-white transition-colors">
                                                            <span className="material-icons-round">edit</span>
                                                        </button>
                                                        {u.id !== user?.id && (
                                                            <button
                                                                onClick={() => handleDelete(u.id)}
                                                                className="p-2 text-white/20 hover:text-red-400 transition-colors"
                                                            >
                                                                <span className="material-icons-round">delete_outline</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* Footer Help */}
            <footer className="mt-16 pt-8 border-t border-border-muted flex flex-col md:flex-row justify-between items-center gap-4 text-white/30 text-sm">
                <div className="flex items-center gap-2">
                    <span className="material-icons-round text-sm">auto_awesome</span>
                    <p>
                        Precisa de ajuda com a integração MQTT?{' '}
                        <a className="text-primary hover:underline" href="#">
                            Veja a documentação
                        </a>
                    </p>
                </div>
                <div className="flex gap-6">
                    <a className="hover:text-white transition-colors" href="#">
                        Termos de Uso
                    </a>
                    <a className="hover:text-white transition-colors" href="#">
                        API Status
                    </a>
                    <a className="hover:text-white transition-colors" href="#">
                        Suporte
                    </a>
                </div>
            </footer>
        </div>
    );
}
