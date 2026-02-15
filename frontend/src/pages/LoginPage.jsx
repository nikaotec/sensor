import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background-dark text-slate-100 min-h-screen flex items-center justify-center overflow-hidden font-display relative">
            {/* Background Orbs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -left-[10%] top-[10%] w-[600px] h-[600px] bg-orb-blue blur-[100px] rounded-full"></div>
                <div className="absolute -right-[10%] bottom-[10%] w-[600px] h-[600px] bg-orb-purple blur-[100px] rounded-full"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6 py-12 flex flex-col items-center">
                {/* Brand Identity */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-400 rounded-xl flex items-center justify-center shadow-lg mb-6 ring-4 ring-primary/10">
                        <span className="material-icons-round text-white text-4xl">thermostat</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                        IoT Sensor <span className="text-primary">Health</span>
                    </h1>
                    <p className="text-slate-400 font-medium">Monitoramento de temperatura inteligente</p>
                </div>

                {/* Login Card */}
                <div className="w-full glass-card rounded-xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <span className="material-icons-round text-primary">login</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">Entrar</h2>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2 ml-1" htmlFor="email">
                                E-mail Corporativo
                            </label>
                            <div className="relative">
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-slate-500 transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 input-focus-glow"
                                    id="email"
                                    placeholder="seu@email.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2 ml-1">
                                <label className="text-sm font-semibold text-slate-300" htmlFor="password">
                                    Senha
                                </label>
                                <a className="text-xs font-medium text-primary/80 hover:text-primary transition-colors" href="#">
                                    Esqueceu a senha?
                                </a>
                            </div>
                            <div className="relative">
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-white placeholder-slate-500 transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 input-focus-glow"
                                    id="password"
                                    placeholder="••••••••"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center mb-6">
                            <input
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary/50 focus:ring-offset-0"
                                id="remember"
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                            />
                            <label className="ml-2 text-sm text-slate-400" htmlFor="remember">
                                Lembrar neste dispositivo
                            </label>
                        </div>

                        <button
                            className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] btn-glow disabled:opacity-50 disabled:cursor-not-allowed"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                            <span className="material-icons-round text-lg">arrow_forward</span>
                        </button>
                    </form>
                </div>

                {/* Footer Links */}
                <div className="mt-8 text-center">
                    <p className="text-slate-400 text-sm">Sua empresa ainda não possui conta?</p>
                    <Link className="mt-2 inline-block text-primary font-bold hover:underline transition-all" to="/register">
                        Registrar empresa
                    </Link>
                </div>

                {/* Decorative Bottom Pattern */}
                <div className="mt-12 opacity-20 flex gap-4">
                    <div className="h-1 w-8 rounded-full bg-primary"></div>
                    <div className="h-1 w-2 rounded-full bg-primary/40"></div>
                    <div className="h-1 w-2 rounded-full bg-primary/40"></div>
                </div>
            </div>
        </div>
    );
}
