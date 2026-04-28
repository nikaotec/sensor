
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ThermometerSnowflake, User, Mail, Lock, UserPlus } from 'lucide-react';

interface SignUpProps {
    onLoginClick: () => void;
    onSignUp: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onLoginClick, onSignUp }) => {
    const { signup, loginWithGoogle } = useAuth();

    // In a real app we would have state for the form fields
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirm-password') as string;

        if (password !== confirmPassword) {
            alert("As senhas não coincidem.");
            return;
        }

        try {
            await signup(email, password, name);
            onSignUp();
        } catch (error) {
            console.error("Erro ao cadastrar:", error);
            alert("Erro ao criar conta. Verifique os dados inseridos.");
        }
    };

    const handleGoogleSignUp = async () => {
        try {
            await loginWithGoogle();
            onSignUp();
        } catch (error) {
            console.error("Erro ao cadastar com Google", error);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center p-4 font-display">
            <div className="w-full max-w-[440px] flex flex-col items-center">
                {/* Vertical Card */}
                <div className="w-full bg-white dark:bg-slate-card rounded-xl shadow-2xl border border-slate-200 dark:border-slate-border p-8 md:p-10">

                    {/* Header Section */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-primary rounded-lg p-2.5 mb-6 flex items-center justify-center shadow-lg shadow-primary/20">
                            <ThermometerSnowflake className="h-8 w-8 text-background-dark" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Criar Conta</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-center">Comece a monitorar seus dispositivos</p>
                    </div>

                    {/* Social Sign Up */}
                    <button
                        type="button"
                        onClick={handleGoogleSignUp}
                        className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3 rounded-lg border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 mb-6"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        Cadastrar com Google
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-slate-card text-slate-500">Ou continue com</span>
                        </div>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome Completo</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    id="name"
                                    placeholder="João Silva"
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-input border border-slate-200 dark:border-slate-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Endereço de E-mail</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    placeholder="nome@empresa.com"
                                    required
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-input border border-slate-200 dark:border-slate-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1.5">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Senha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    id="password"
                                    placeholder="••••••••"
                                    required
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-input border border-slate-200 dark:border-slate-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-1.5">
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar Senha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    id="confirm-password"
                                    placeholder="••••••••"
                                    required
                                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-input border border-slate-200 dark:border-slate-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start py-1">
                            <div className="flex items-center h-5">
                                <input id="terms" type="checkbox" className="form-checkbox w-4 h-4 rounded border-slate-300 dark:border-slate-border bg-slate-100 dark:bg-slate-input text-primary focus:ring-primary/30 transition-all cursor-pointer" />
                            </div>
                            <div className="ml-2 text-sm">
                                <label htmlFor="terms" className="font-medium text-slate-700 dark:text-slate-300">Eu concordo com os <a href="#" className="text-primary hover:underline">Termos de Serviço</a> e <a href="#" className="text-primary hover:underline">Política de Privacidade</a></label>
                            </div>
                        </div>

                        {/* Action Section */}
                        <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-lg shadow-lg shadow-primary/20 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Criar Conta
                        </button>
                    </form>

                    {/* Footer Section */}
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Já tem uma conta?
                            <button onClick={onLoginClick} className="font-semibold text-primary hover:text-primary/80 transition-colors ml-1">Entrar</button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
