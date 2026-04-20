import React from 'react';
import {
    Activity,
    LogOut,
    LayoutDashboard,
    AlertCircle,
    FileText,
    Database,
    Zap
} from 'lucide-react';

interface SidebarProps {
    currentScreen: any;
    onNavigate: (screen: any) => void;
    onLogout: () => void;
    currentTenant: any;
}

const Sidebar: React.FC<SidebarProps> = ({
    currentScreen,
    onNavigate,
    onLogout,
    currentTenant
}) => {
    const menuItems = [
        { id: 'dashboard', label: 'Monitoramento', icon: LayoutDashboard },
        { id: 'alerts', label: 'Alertas', icon: AlertCircle },
        { id: 'reports', label: 'Histórico', icon: FileText },
        { id: 'database', label: 'Dados Brutos', icon: Database },
    ];

    return (
        <aside className="w-20 lg:w-72 bg-[#1A1D17] border-r border-[#2A2E24] flex flex-col transition-all duration-300 relative z-40">
            <div className="p-6 lg:p-8 flex items-center gap-3">
                <div className="size-10 lg:size-12 rounded-2xl bg-gradient-to-br from-primary to-[#004299] flex items-center justify-center text-white shadow-xl shadow-primary/20 rotate-3">
                    <Zap size={24} fill="currentColor" />
                </div>
                <div className="hidden lg:block overflow-hidden transition-all">
                    <h1 className="text-xl font-black text-white tracking-tighter leading-none">NIKAO<span className="text-primary">TEC</span></h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Smart Sensors</p>
                </div>
            </div>

            <nav className="flex-1 px-4 lg:px-6 py-6 space-y-2">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative ${currentScreen === item.id
                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <item.icon size={22} className={currentScreen === item.id ? '' : 'group-hover:scale-110 transition-transform'} />
                        <span className="hidden lg:block font-bold text-sm tracking-tight">{item.label}</span>
                        {currentScreen === item.id && (
                            <div className="absolute right-4 hidden lg:block">
                                <Activity size={12} className="animate-pulse opacity-50" />
                            </div>
                        )}
                    </button>
                ))}
            </nav>

            <div className="p-4 lg:p-6 mt-auto">
                {currentTenant && (
                    <div className="hidden lg:block mb-6 p-4 rounded-2xl bg-gradient-to-br from-[#2A2E24] to-[#1A1D16] border border-white/5">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Ambiente Ativo</p>
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                                {currentTenant.name?.charAt(0) || 'T'}
                            </div>
                            <p className="text-sm font-bold text-white truncate">{currentTenant.name || 'Geral'}</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-500 transition-all font-bold text-sm tracking-tight group"
                >
                    <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden lg:block">Finalizar Sessão</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
