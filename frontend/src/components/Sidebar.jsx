import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, MapPin, Radio, Settings, LogOut, RadioTower } from 'lucide-react';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/locations', icon: MapPin, label: 'Locais' },
        { to: '/devices', icon: Radio, label: 'Dispositivos' },
        { to: '/settings', icon: Settings, label: 'Configurações' },
    ];

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-card-dark border-r border-white/5 flex flex-col z-50">
            {/* Logo */}
            <div className="p-8 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <RadioTower className="text-white w-5 h-5" />
                </div>
                <h1 className="font-bold text-xl tracking-tight text-white">
                    OLED<span className="text-primary">IoT</span>
                </h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* User Profile */}
            <div className="p-6 border-t border-white/5">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center font-bold text-white shadow-inner">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className="text-sm font-semibold text-white truncate">{user?.name || 'Usuário'}</p>
                        <p className="text-xs text-slate-500 truncate">
                            {user?.role === 'admin' ? 'Admin Premium' : 'Visualizador'}
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Sair"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
