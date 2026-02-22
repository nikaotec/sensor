import React from 'react';
import { useTenant } from '../contexts/TenantContext';
import {
    Bell,
    FileBarChart,
    Settings,
    Moon,
    Cpu,
    LayoutDashboard
} from 'lucide-react';

interface SidebarProps {
    activeItem: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details';
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details') => void;
}

// Map screen to Lucide icon components
const iconMap = {
    dashboard: LayoutDashboard,
    'device-list': Cpu,
    alerts: Bell,
    reports: FileBarChart,
    settings: Settings,
    'device-details': Cpu
};

const Sidebar: React.FC<SidebarProps> = ({ activeItem, onNavigate }) => {
    const { currentTenant } = useTenant();
    const getLinkClass = (item: string) => {
        const baseClass = "flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer w-full text-left group";
        if (activeItem === item) {
            return `${baseClass} bg-primary/10 text-primary border border-primary/20 font-semibold`;
        }
        return `${baseClass} text-slate-500 hover:bg-slate-100 dark:hover:bg-primary/5 hover:text-primary transition-all duration-300`;
    };

    const renderIcon = (item: keyof typeof iconMap) => {
        const IconComponent = iconMap[item];
        return <IconComponent size={20} className={activeItem === item ? "text-primary" : "text-slate-400 group-hover:text-primary transition-colors"} />;
    };

    return (
        <aside className="w-64 flex-shrink-0 bg-background-light dark:bg-background-dark border-r border-slate-200 dark:border-slate-border flex flex-col hidden lg:flex">
            <div className="p-8 flex items-center gap-3">
                <div className="bg-primary shadow-lg shadow-primary/20 size-10 rounded-xl flex items-center justify-center text-white">
                    <Moon size={22} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <h1 className="text-slate-900 dark:text-white text-base font-bold tracking-tight">{currentTenant.name}</h1>
                    <p className="text-primary text-[10px] uppercase font-bold tracking-widest mt-0.5">Nikaotec Sensor</p>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
                {(['dashboard', 'device-list', 'alerts', 'reports', 'settings'] as const).map((item) => (
                    <button key={item} onClick={() => onNavigate(item)} className={getLinkClass(item)}>
                        {renderIcon(item)}
                        <span className="text-sm font-medium capitalize">
                            {item === 'device-list' ? 'Dispositivos' :
                                item === 'reports' ? 'Relatórios' :
                                    item === 'alerts' ? 'Alertas' :
                                        item === 'settings' ? 'Configurações' : item}
                        </span>
                    </button>
                ))}
            </nav>

            <div className="p-6 mt-auto">
                <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-border/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistema Ativo</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                        Sincronizado com n8n Cloud via ngrok tunnel.
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
