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
    PanelLeftOpen,
    Users
} from 'lucide-react';

interface SidebarProps {
    activeItem: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel' | 'admin-users';
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel' | 'admin-users') => void;
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
    'manager-panel': Shield,
    'admin-users': Users
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

    const isAdmin = currentUser?.role === 'admin';
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'gestor';

    const menuItems = (['dashboard', 'device-list', 'alerts', 'reports', 'settings'] as const).filter(item => {
        // Apenas Gestores e Admins podem ver Dispositivos
        if (item === 'device-list') return isManager || isAdmin;
        // Apenas Gestores podem ver Relatórios
        if (item === 'reports') return isManager;
        return true;
    });

    let finalMenuItems: ('dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'manager-panel' | 'admin-users')[] = [...menuItems];

    if (isManager) {
        finalMenuItems.push('manager-panel');
    }

    if (isAdmin) {
        finalMenuItems.push('admin-users');
    }

    return (
        <>
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
                    {finalMenuItems.map((item) => (
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
                                                    item === 'manager-panel' ? 'Administração' :
                                                        item === 'dashboard' ? 'Dashboard' : item}
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

            {/* Mobile Bottom Tab Bar */}
            <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-background-dark border-t border-[#2A2E24] z-[100] flex justify-around items-center px-1 pb-6 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                {finalMenuItems.map((item) => (
                    <button
                        key={`mobile-${item}`}
                        onClick={() => onNavigate(item as any)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 ${activeItem === item
                            ? "text-primary bg-primary/10"
                            : "text-slate-400 hover:text-white"
                            }`}
                        title={item}
                    >
                        <div className="relative">
                            {(() => {
                                const IconComponent = iconMap[item as keyof typeof iconMap];
                                return <IconComponent size={22} className={activeItem === item ? "text-primary" : ""} />;
                            })()}
                            {item === 'alerts' && hasAlerts && (
                                <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full border border-background-dark animate-pulse"></span>
                            )}
                        </div>
                    </button>
                ))}
            </nav>
        </>
    );
};

export default Sidebar;
