import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../contexts/AuthContext';

export default function RegisterPage() {
    const [companyName, setCompanyName] = useState('');
    const [slug, setSlug] = useState('');
    const [adminName, setAdminName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Auto-generate slug from company name
    const handleCompanyNameChange = (value) => {
        setCompanyName(value);
        const generatedSlug = value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        setSlug(generatedSlug);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/register', {
                company_name: companyName,
                slug,
                admin_name: adminName,
                email,
                password,
            });
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao registrar empresa');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#000000] text-gray-200 font-display min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Gradient Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Main Container */}
            <main className="relative z-10 w-full max-w-[600px] px-6 py-12">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(60,60,246,0.4)]">
                        <span className="material-icons text-white text-4xl">sensors</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Nova Empresa</h1>
                    <p className="text-primary/70 text-sm mt-1">Configure sua infraestrutura IoT de monitoramento</p>
                </div>

                {/* Registration Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 shadow-2xl">
                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Section: Empresa */}
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-icons text-primary text-xl">business</span>
                                <h2 className="text-lg font-semibold text-white">Dados da Empresa</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Nome da Empresa
                                    </label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        placeholder="Ex: Tech Solutions Indústria"
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => handleCompanyNameChange(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Slug da URL
                                    </label>
                                    <div className="flex items-center">
                                        <span className="bg-white/5 border border-r-0 border-white/10 rounded-l-lg px-3 py-3 text-gray-500 text-sm">
                                            iot.monitor/
                                        </span>
                                        <input
                                            className="w-full bg-white/[0.02] border border-white/10 rounded-r-lg px-4 py-3 text-gray-400 cursor-not-allowed"
                                            disabled
                                            type="text"
                                            value={slug}
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Visualização MQTT
                                    </label>
                                    <div className="bg-[#0a0a0a] border border-primary/20 rounded-lg p-3 font-mono text-[13px] flex items-center gap-3">
                                        <span className="text-primary/60">TOPIC:</span>
                                        <span className="text-primary">v1/devices/</span>
                                        <span className="text-white">{slug || 'sua-empresa'}</span>
                                        <span className="text-primary">/telemetry</span>
                                        <span className="material-icons text-primary/40 text-sm ml-auto">info</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                        {/* Section: Administrador */}
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-icons text-primary text-xl">admin_panel_settings</span>
                                <h2 className="text-lg font-semibold text-white">Administrador</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Nome Completo
                                    </label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        placeholder="Seu nome completo"
                                        type="text"
                                        value={adminName}
                                        onChange={(e) => setAdminName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        E-mail Corporativo
                                    </label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        placeholder="admin@empresa.com"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                        Senha
                                    </label>
                                    <div className="relative">
                                        <input
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                            placeholder="••••••••"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            <span className="material-icons text-xl">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Action Section */}
                        <div className="pt-4 space-y-4">
                            <button
                                className="w-full bg-gradient-to-r from-primary to-[#5a5af8] hover:to-primary text-white font-semibold py-4 rounded-lg shadow-[0_4px_20px_rgba(60,60,246,0.3)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? 'Registrando...' : 'Registrar Empresa'}
                                <span className="material-icons">arrow_forward</span>
                            </button>
                            <p className="text-center text-sm text-gray-500">
                                Já possui uma conta?{' '}
                                <Link
                                    className="text-primary hover:text-primary/80 font-medium transition-colors underline-offset-4 hover:underline"
                                    to="/login"
                                >
                                    Fazer login
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>

                {/* Features/Trust Footer */}
                <div className="mt-12 flex justify-center gap-8 opacity-40 grayscale pointer-events-none">
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-sm">lock</span>
                        <span className="text-xs font-medium uppercase tracking-widest">AES-256 SSL</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-sm">bolt</span>
                        <span className="text-xs font-medium uppercase tracking-widest">MQTT v5.0</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-sm">cloud</span>
                        <span className="text-xs font-medium uppercase tracking-widest">SLA 99.9%</span>
                    </div>
                </div>
            </main>

            {/* Footer Decorative */}
            <footer className="absolute bottom-6 text-[10px] text-gray-600 uppercase tracking-[0.2em]">
                © 2024 OLED IoT Solutions — Premium Monitoring System
            </footer>
        </div>
    );
}
