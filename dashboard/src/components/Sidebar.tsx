import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import {
    Bell,
    FileBarChart,
    Settings,
    Moon,
    Cpu,
    LayoutDashboard,
    Shield,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';

interface SidebarProps {
    activeItem: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel';
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel') => void;
    isCollapsed?: boolean;
    onToggleCollapse?: (collapsed: boolean) => void;
}

// Map screen to Lucide icon components
const iconMap = {
    dashboard: LayoutDashboard,
    'device-list': Cpu,
    alerts: Bell,
    reports: FileBarChart,
    settings: Settings,
    'device-details': Cpu,
    'manager-panel': Shield
};

const Sidebar: React.FC<SidebarProps> = ({ activeItem, onNavigate, isCollapsed: externalCollapsed, onToggleCollapse }) => {
    const { currentTenant } = useTenant();
    const { currentUser } = useAuth();
    const { hasAlerts } = useNotifications();
    const [internalCollapsed, setInternalCollapsed] = useState(false);
    
    const isCollapsed = externalCollapsed ?? internalCollapsed;
    const setCollapsed = (collapsed: boolean) => {
        if (onToggleCollapse) {
            onToggleCollapse(collapsed);
        } else {
            setInternalCollapsed(collapsed);
        }
    };
    
    const getLinkClass = (item: string) => {
        const baseClass = "flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all cursor-pointer w-full text-left group";
        if (activeItem === item) {
            return `${baseClass} bg-primary/10 text-primary font-semibold`;
        }
        return `${baseClass} text-text-primary hover:bg-white/5 hover:text-white transition-all duration-300`;
    };

    const renderIcon = (item: keyof typeof iconMap) => {
        const IconComponent = iconMap[item];
        return <IconComponent size={22} className={activeItem === item ? "text-primary" : "text-[#A5A4AB] group-hover:text-white transition-colors"} />;
    };

    const menuItems = (['dashboard', 'device-list', 'alerts', 'reports', 'settings', ...(currentUser?.role === 'manager' || currentUser?.role === 'gestor' ? ['manager-panel'] : [])] as const);

    return (
        <aside className={`${isCollapsed ? 'w-16' : 'w-20 lg:w-64'} flex-shrink-0 bg-background-dark border-r border-[#2A2E24] flex flex-col hidden sm:flex transition-all duration-300`}>
            <div className={`p-3 lg:p-6 flex items-center justify-center lg:justify-start gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="bg-primary/20 p-2 rounded-xl flex items-center justify-center text-primary border border-primary/30">
                    <Moon size={24} strokeWidth={2} />
                </div>
                {!isCollapsed && (
                    <div className="hidden lg:flex flex-col">
                        <h1 className="text-white text-sm font-bold tracking-tight">{currentTenant?.name || "Monitoramento"}</h1>
                        <p className="text-[#A5A4AB] text-[10px] uppercase font-bold tracking-widest mt-0.5">Vacinas</p>
                    </div>
                )}
            </div>

            <nav className="flex-1 px-2 lg:px-3 space-y-2 mt-2 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => (
                    <button key={item} onClick={() => onNavigate(item as any)} className={getLinkClass(item)} title={item}>
                        <div className="relative">
                            {renderIcon(item as keyof typeof iconMap)}
                            {item === 'alerts' && hasAlerts && (
                                <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full border border-background-dark animate-pulse"></span>
                            )}
                        </div>
                        {!isCollapsed && (
                            <span className="hidden lg:inline text-sm font-medium capitalize">
                                {item === 'device-list' ? 'Dispositivos' :
                                    item === 'reports' ? 'Relatórios' :
                                        item === 'alerts' ? 'Alertas' :
                                            item === 'settings' ? 'Configurações' :
                                                item === 'manager-panel' ? 'Administração' : item}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            <div className="mt-auto p-3 lg:p-4 border-t border-[#2A2E24]">
                <button 
                    onClick={() => setCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-[#2A2E24]/60 hover:bg-[#3A3E34] text-slate-400 hover:text-primary border border-[#2A2E24] hover:border-primary/30 transition-all duration-200 group"
                    title={isCollapsed ? "Expandir menu" : "Recolher menu"}
                >
                    {isCollapsed ? (
                        <PanelLeftOpen size={18} className="group-hover:text-primary transition-colors" />
                    ) : (
                        <PanelLeftClose size={18} className="group-hover:text-primary transition-colors" />
                    )}
                    {!isCollapsed && <span className="text-xs font-medium">Recolher Menu</span>}
                </button>
                
                {!isCollapsed && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-900/50 border border-slate-border/50">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistema Ativo</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            Sincronizado com n8n Cloud via ngrok tunnel.
                        </p>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
