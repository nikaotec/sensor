
import React from 'react';

interface SidebarProps {
    activeItem: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details';
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, onNavigate }) => {
    const getLinkClass = (item: string) => {
        const baseClass = "flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer w-full text-left";
        if (activeItem === item) {
            return `${baseClass} bg-primary/10 text-primary border border-primary/20 font-semibold`;
        }
        return `${baseClass} text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100`;
    };

    const getIconClass = (item: string) => {
        if (activeItem === item) return "material-symbols-outlined fill-1";
        return "material-symbols-outlined";
    };

    return (
        <aside className="w-64 flex-shrink-0 bg-background-light dark:bg-background-dark border-r border-slate-200 dark:border-white/5 flex flex-col hidden lg:flex">
            <div className="p-6 flex items-center gap-3">
                <div className="bg-primary size-10 rounded-lg flex items-center justify-center text-background-dark">
                    <span className="material-symbols-outlined font-bold">nights_stay</span>
                </div>
                <div className="flex flex-col">
                    <h1 className="text-slate-900 dark:text-white text-base font-bold leading-tight">Midnight IoT</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Dashboard V1.0</p>
                </div>
            </div>
            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
                <button onClick={() => onNavigate('dashboard')} className={getLinkClass('dashboard')}>
                    <span className={getIconClass('dashboard')}>dashboard</span>
                    <span className="text-sm font-medium">Dashboard</span>
                </button>
                <button onClick={() => onNavigate('device-list')} className={getLinkClass('device-list')}>
                    <span className={getIconClass('device-list')}>sensors</span>
                    <span className="text-sm font-medium">Dispositivos</span>
                </button>
                <button onClick={() => onNavigate('alerts')} className={getLinkClass('alerts')}>
                    <span className={getIconClass('alerts')}>notifications</span>
                    <span className="text-sm font-medium">Alertas</span>
                </button>
                <button onClick={() => onNavigate('reports')} className={getLinkClass('reports')}>
                    <span className={getIconClass('reports')}>assessment</span>
                    <span className="text-sm font-medium">Relatórios</span>
                </button>
                <button onClick={() => onNavigate('settings')} className={getLinkClass('settings')}>
                    <span className={getIconClass('settings')}>settings</span>
                    <span className="text-sm font-medium">Configurações</span>
                </button>
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-3 p-2">
                    <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
                    <div className="flex flex-col">
                        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-1"></div>
                        <div className="h-2 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
