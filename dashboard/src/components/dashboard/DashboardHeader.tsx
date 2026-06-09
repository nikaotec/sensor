import React from 'react';
import {
    Search,
    Bell,
    Wifi,
    CalendarRange,
    KeyRound,
    Mail
} from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import DailyReportPreferencesModal from './DailyReportPreferencesModal';
import { AnimatePresence } from 'framer-motion';

interface DashboardHeaderProps {
    currentUser: any;
    mqttConnected: boolean;
    onOpenReport: () => void;
    onLogout: () => void;
    onNavigate: (screen: any) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    currentUser,
    mqttConnected,
    onOpenReport,
    onLogout,
    onNavigate
}) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);
    const [isDailyReportPreferencesOpen, setIsDailyReportPreferencesOpen] = React.useState(false);

    return (
        <React.Fragment>
            <header className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-8 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-text-dark tracking-tight">Monitoramento <span className="text-text-primary text-sm font-normal ml-2">Câmeras Frias de Vacinas</span></h2>
                    {mqttConnected && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                            <Wifi size={10} /> MQTT Live
                        </span>
                    )}
                    <div className="h-6 w-px bg-gray-300 mx-2"></div>
                    <div className="hidden lg:flex items-center bg-gray-100 px-4 py-2 rounded-xl border border-gray-200 w-96 group focus-within:border-primary/50 transition-all">
                        <Search size={18} className="text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input type="text" placeholder="Procurar dispositivos ou registros..." className="bg-transparent border-none outline-none text-sm px-3 w-full text-text-dark placeholder:text-gray-400" />
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button className="relative p-2 text-gray-400 hover:text-primary transition-colors">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-1.5 size-2 bg-danger rounded-full border-2 border-white"></span>
                    </button>
                    <button
                        onClick={onOpenReport}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-primary to-[#004299] text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all shadow-[0_0_15px_rgba(19,109,236,0.3)]"
                    >
                        <CalendarRange size={16} />
                        <span className="hidden sm:inline">Gerar Relatório</span>
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="flex items-center gap-3 pl-6 border-l border-gray-200 group focus:outline-none"
                        >
                            <div className="flex flex-col items-end hidden sm:flex text-right">
                                <p className="text-sm font-bold text-text-dark leading-none group-hover:text-primary transition-colors">{currentUser.name}</p>
                                <p className="text-[10px] text-text-primary mt-1 uppercase font-semibold">
                                    {currentUser.role === 'manager' ? 'Gestor' : currentUser.role === 'admin' ? 'Admin' : 'Usuário'}
                                </p>
                            </div>
                            <img
                                className="size-10 rounded-full border-2 border-primary/20 group-hover:border-primary transition-all"
                                src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser.name}`}
                                alt="Profile"
                            />
                        </button>

                        {isProfileMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#12150F] rounded-xl border border-gray-200 dark:border-[#2A2E24] shadow-lg py-1 z-50">
                                {currentUser?.role === 'manager' || currentUser?.role === 'gestor' ? (
                                    <button
                                        onClick={() => {
                                            setIsProfileMenuOpen(false);
                                            onNavigate('settings');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1D16] transition-colors"
                                    >
                                        Configurações
                                    </button>
                                ) : null}
                                <button
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        setIsDailyReportPreferencesOpen(true);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1D16] transition-colors border-b border-gray-100 dark:border-[#2A2E24]/50"
                                >
                                    <Mail size={14} /> Preferências de Relatório
                                </button>
                                <button
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        setIsChangePasswordOpen(true);
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1D16] transition-colors"
                                >
                                    <KeyRound size={14} /> Trocar Senha
                                </button>
                                <button
                                    onClick={() => {
                                        setIsProfileMenuOpen(false);
                                        onLogout();
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors border-t border-gray-100 dark:border-[#2A2E24]"
                                >
                                    Fazer Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
            <AnimatePresence>
                {isDailyReportPreferencesOpen && (
                    <DailyReportPreferencesModal isOpen={isDailyReportPreferencesOpen} onClose={() => setIsDailyReportPreferencesOpen(false)} />
                )}
            </AnimatePresence>
        </React.Fragment>
    );
};

export default DashboardHeader;
