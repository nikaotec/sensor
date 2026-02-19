
import React from 'react';

interface SignUpProps {
    onLoginClick: () => void;
    onSignUp: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onLoginClick, onSignUp }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSignUp();
    };

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center p-4 font-display">
            <div className="w-full max-w-[440px] flex flex-col items-center">
                {/* Vertical Card */}
                <div className="w-full bg-white dark:bg-slate-card rounded-xl shadow-2xl border border-slate-200 dark:border-slate-border p-8 md:p-10">

                    {/* Header Section */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-primary rounded-lg p-2.5 mb-6 flex items-center justify-center shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined text-background-dark text-3xl font-bold">
                                settings_remote
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Create your account</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-center">Start monitoring your devices</p>
                    </div>

                    {/* Social Sign Up (Optional based on V2, but prioritizing clean V1 structure for consistency if needed, adding here as a nice touch from V2) */}
                    <button className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium py-3 rounded-lg border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 mb-6">
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        Sign up with Google
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-slate-card text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                placeholder="John Doe"
                                className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-input border border-slate-200 dark:border-slate-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>

                        {/* Email Field */}
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                placeholder="name@company.com"
                                required
                                className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-input border border-slate-200 dark:border-slate-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1.5">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                            <input
                                type="password"
                                id="password"
                                placeholder="••••••••"
                                required
                                className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-input border border-slate-200 dark:border-slate-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-1.5">
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                            <input
                                type="password"
                                id="confirm-password"
                                placeholder="••••••••"
                                required
                                className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-input border border-slate-200 dark:border-slate-border text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start py-1">
                            <div className="flex items-center h-5">
                                <input id="terms" type="checkbox" className="form-checkbox w-4 h-4 rounded border-slate-300 dark:border-slate-border bg-slate-100 dark:bg-slate-input text-primary focus:ring-primary/30 transition-all cursor-pointer" />
                            </div>
                            <div className="ml-2 text-sm">
                                <label htmlFor="terms" className="font-medium text-slate-700 dark:text-slate-300">I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a></label>
                            </div>
                        </div>

                        {/* Action Section */}
                        <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-lg shadow-lg shadow-primary/20 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">person_add</span>
                            Create Account
                        </button>
                    </form>

                    {/* Footer Section */}
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Already have an account?
                            <button onClick={onLoginClick} className="font-semibold text-primary hover:text-primary/80 transition-colors ml-1">Sign in</button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
