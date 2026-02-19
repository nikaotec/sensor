
import React from 'react';
import { useTenant } from '../contexts/TenantContext';

interface LoginProps {
    onLogin: () => void;
    onSignUpClick: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onSignUpClick }) => {
    const { availableTenants, setTenantId, currentTenant } = useTenant();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin();
    };

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center p-4 font-display">
            <div className="w-full max-w-[440px] flex flex-col items-center">
                {/* Vertical Card */}
                <div className="w-full bg-white dark:bg-slate-card rounded-xl shadow-2xl border border-slate-200 dark:border-slate-border p-8 md:p-10">

                    {/* Header Section */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="bg-primary rounded-lg p-2.5 mb-6 flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-background-dark text-3xl font-bold">
                                settings_remote
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Bem-vindo</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-center">Acesse sua conta no {currentTenant.name}</p>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Tenant Selection Field (Added for Multi-tenancy Demo) */}
                        <div className="space-y-2">
                            <label htmlFor="tenant" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Selecione o Cliente / Tenant</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">business</span>
                                </div>
                                <select
                                    id="tenant"
                                    value={currentTenant.id}
                                    onChange={(e) => setTenantId(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-input border border-slate-200 dark:border-slate-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                >
                                    {availableTenants.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Endereço de E-mail</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">alternate_email</span>
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    placeholder="nome@empresa.com"
                                    required
                                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-input border border-slate-200 dark:border-slate-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">lock</span>
                                </div>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    placeholder="••••••••"
                                    required
                                    className="block w-full pl-11 pr-12 py-3.5 bg-slate-50 dark:bg-slate-input border border-slate-200 dark:border-slate-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                                <button type="button" className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-200 transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                                </button>
                            </div>
                        </div>

                        {/* Utility Row */}
                        <div className="flex items-center justify-between py-1">
                            <label className="flex items-center cursor-pointer group">
                                <input type="checkbox" className="form-checkbox w-4 h-4 rounded border-slate-300 dark:border-slate-border bg-slate-100 dark:bg-slate-input text-primary focus:ring-primary/30 transition-all cursor-pointer" />
                                <span className="ml-2 text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Lembrar-me</span>
                            </label>
                            <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">Esqueceu a senha?</a>
                        </div>

                        {/* Action Section */}
                        <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-lg shadow-lg shadow-primary/20 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">login</span>
                            Entrar
                        </button>
                    </form>

                    {/* Footer Section */}
                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Não tem uma conta?
                            <button onClick={onSignUpClick} className="font-semibold text-primary hover:text-primary/80 transition-colors ml-1">Cadastrar</button>
                        </p>
                    </div>
                </div>

                {/* Security Badge */}
                <div className="mt-8 flex items-center gap-2 text-slate-500 dark:text-slate-500 text-xs uppercase tracking-widest font-medium">
                    <span className="material-symbols-outlined text-[14px]">verified_user</span>
                    <span>Criptografia de 256 bits segura</span>
                </div>
            </div>
        </div>
    );
};

export default Login;
