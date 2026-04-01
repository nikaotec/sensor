import React from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useMqttData } from '../hooks/useMqttData';
import {
    Search,
    Bell,
    Zap,
    BatteryCharging,
    Wifi,
    ServerCrash,
    AlertTriangle,
    ArrowUp,
    ArrowDown,
    Thermometer,
    Droplets
} from 'lucide-react';

interface DashboardProps {
    onDeviceClick: () => void;
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onDeviceClick, onNavigate }) => {
    const { currentTenant, availableTenants, setTenantId } = useTenant();
    const { currentUser, logout } = useAuth();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);

    // Fetch initial devices from Firebase and update with live MQTT stream
    const { devices: supabaseDevices } = useSupabaseData(currentTenant?.id || '', undefined, currentUser?.role);
    const { devices: tenantDevices, isConnected: mqttConnected } = useMqttData('all', currentUser?.role, supabaseDevices);

    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'gestor';

    // Filtro refinado para respeitar a aba selecionada e permissões de role
    const displayDevices = React.useMemo(() => {
        // Se não há dispositivos, retorna vazio
        if (!tenantDevices || tenantDevices.length === 0) return [];

        // Filtra dispositivos não vinculados SEMPRE
        const assignedDevices = tenantDevices.filter(d =>
            d && d.tenantId &&
            d.tenantId.trim() !== "" &&
            d.tenantId.toLowerCase() !== "unknown" &&
            d.tenantId.toLowerCase() !== "empresa_default" &&
            d.tenantId.toLowerCase() !== "nikaotec"
        );

        // Se está em uma aba de empresa específica (não "all"), filtra apenas por ela
        if (currentTenant && currentTenant.id !== 'all') {
            return assignedDevices.filter(d => d.tenantId === currentTenant.id || d.tenantId === currentTenant.name);
        }

        // Se é gestor e está na aba "Todos", mostra todos os dispositivos ATRIBUÍDOS
        if (isManager) {
            return assignedDevices;
        }

        // Usuário normal: mostra apenas dispositivos das empresas vinculadas
        const allowedTenantIds = availableTenants.map(t => t.id);
        const allowedTenantNames = availableTenants.map(t => t.name);

        // Filtra dispositivos que são de empresas vinculadas ao usuário
        return assignedDevices.filter(d => {
            return allowedTenantIds.includes(d.tenantId) || allowedTenantNames.includes(d.tenantId);
        });
    }, [tenantDevices, currentTenant, availableTenants, isManager]);

    // No longer needing primaryDevice or mocks

    if (!currentTenant || !currentUser) {
        return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Carregando dados da Empresa...</div>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeItem="dashboard" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative bg-background-light text-text-dark">
                {/* HEADER */}
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 shadow-sm">
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
                                    <button
                                        onClick={() => {
                                            setIsProfileMenuOpen(false);
                                            onNavigate('settings');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1D16] transition-colors"
                                    >
                                        Configurações
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsProfileMenuOpen(false);
                                            logout();
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

                <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-10 py-6 custom-scrollbar">
                    {/* TABS E STATUS */}
                    <div className="flex flex-col gap-6 mb-8">
                        {/* Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            <button
                                onClick={() => setTenantId('all')}
                                className={`px-4 py-2 whitespace-nowrap text-sm font-semibold transition-all border-b-2 ${currentTenant?.id === 'all' || !currentTenant ? 'border-primary text-text-dark' : 'border-transparent text-text-primary hover:text-text-dark'} `}
                            >
                                Todos
                            </button>
                            {availableTenants.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTenantId(t.id)}
                                    className={`px-4 py-2 whitespace-nowrap text-sm font-semibold transition-all border-b-2 ${currentTenant?.id === t.id ? 'border-primary text-text-dark' : 'border-transparent text-text-primary hover:text-text-dark'} `}
                                >
                                    {t.name}
                                </button>
                            ))}
                            <button className="flex items-center gap-2 px-3 py-1.5 ml-2 text-xs font-semibold bg-white border border-gray-200 text-text-primary hover:text-primary hover:border-primary/30 rounded-lg transition-colors whitespace-nowrap shadow-sm">
                                <span>+</span>
                                <span>Nova Empresa</span>
                            </button>
                        </div>
                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {displayDevices.length === 0 ? (
                            <div className="col-span-1 md:col-span-2 xl:col-span-3 py-12 flex flex-col items-center justify-center text-slate-500 bg-[#1A1D17] rounded-2xl border border-[#2A2E24]">
                                <ServerCrash size={48} className="mb-4 opacity-50" />
                                <p className="text-lg">Nenhum dispositivo encontrado para esta empresa.</p>
                            </div>
                        ) : (
                            displayDevices.map((device) => {


                                const getStatusLabel = (status: string) => {
                                    switch (status) {
                                        case 'online': return 'ESTÁVEL';
                                        case 'warning': return 'ALERTA';
                                        case 'error': return 'ERRO';
                                        case 'offline': return 'OFFLINE';
                                        default: return status.toUpperCase();
                                    }
                                };

                                const getStatusStyle = (status: string) => {
                                    switch (status) {
                                        case 'online': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                                        case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                                        case 'offline': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
                                        case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
                                        default: return 'bg-slate-800 text-slate-400 border-slate-700';
                                    }
                                };

                                const getSignalQuality = (rssi?: number) => {
                                    if (!rssi) return 'Desconhecido';
                                    if (rssi > -65) return 'Excelente';
                                    if (rssi > -75) return 'Bom';
                                    if (rssi > -85) return 'Regular';
                                    return 'Fraco';
                                };

                                const isOffline = device.status === 'offline' || !(device as any).mqttUpdated;

                                return (
                                    <div
                                        key={device.id}
                                        onClick={onDeviceClick}
                                        className={`bg-[#1A1D17] rounded-2xl border shadow-lg p-6 relative flex flex-col cursor-pointer transition-all group overflow-hidden ${isOffline
                                            ? 'border-red-400/30 opacity-80 grayscale-[0.5] hover:border-red-400/50'
                                            : 'border-[#2A2E24] hover:border-primary/50'
                                            }`}
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                            <ServerCrash size={80} className="text-primary" />
                                        </div>

                                        <div className="mb-4 flex flex-col z-10">
                                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-loose font-heading">Monitoramento em Tempo Real</h3>
                                            <div className="flex justify-between items-center mt-1">
                                                <div>
                                                    <h4 className="font-bold text-white text-lg group-hover:text-primary transition-colors">{device.name}</h4>
                                                    {device.location && (
                                                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                                            {device.location}
                                                        </p>
                                                    )}
                                                    {currentTenant?.id === 'all' && (
                                                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md mt-1.5 inline-block font-medium">
                                                            {availableTenants.find(t => t.id === device.tenantId)?.name || device.tenantId}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {device.status === 'offline' && (
                                            <div className="mb-4 bg-slate-800/50 text-slate-400 text-xs px-4 py-3 rounded-xl border border-slate-700 flex items-start gap-3 z-10">
                                                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                                                <span className="leading-snug">
                                                    <strong className="text-white">Dispositivo offline.</strong><br />
                                                    Exibindo o último estado conhecido.
                                                </span>
                                            </div>
                                        )}

                                        <div className="bg-[#0F110D] rounded-xl p-4 mb-4 flex items-center justify-between border border-[#2A2E24] z-10">
                                            <div>
                                                <div className="text-xs text-slate-500 font-medium mb-1 font-heading uppercase tracking-wider">Temperatura Atual</div>
                                                <div className="text-4xl font-bold text-white tracking-tight">
                                                    {device.telemetry?.temp !== undefined ? `${device.telemetry.temp.toFixed(1)}` : '--'}
                                                    <span className="text-lg text-slate-400 font-medium ml-1">°C</span>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${getStatusStyle(device.status || 'offline')} ${device.status === 'offline' ? 'opacity-50' : ''}`}>
                                                {getStatusLabel(device.status || 'offline')}
                                            </div>
                                        </div>

                                        {/* Telemetria Secundária: Ambiente e Umidade */}
                                        <div className="flex items-center justify-between px-4 py-2 bg-[#0F110D]/50 rounded-xl border border-[#2A2E24] mb-4 z-10">
                                            <div className="flex items-center gap-2">
                                                <Thermometer size={12} className="text-slate-500" />
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Ext:</span>
                                                <span className="text-[10px] text-slate-200 font-bold">{device.telemetry?.tempExt !== undefined ? `${device.telemetry.tempExt.toFixed(1)}°C` : '--'}</span>
                                            </div>
                                            <div className="w-px h-3 bg-[#2A2E24]"></div>
                                            <div className="flex items-center gap-2">
                                                <Droplets size={12} className="text-slate-500" />
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Umid:</span>
                                                <span className="text-[10px] text-slate-200 font-bold">{device.telemetry?.humidity !== undefined ? `${device.telemetry.humidity.toFixed(0)}%` : '--'}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4 z-10">
                                            <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex flex-col items-center justify-center text-center">
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                                    <ArrowUp size={16} color="#f43f5e" />
                                                    Máxima
                                                </div>
                                                <div className="text-lg font-bold text-rose-500">
                                                    {device.telemetry.tempMax !== undefined ? `${device.telemetry.tempMax.toFixed(1)}°C` : '--'}
                                                </div>
                                            </div>
                                            <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex flex-col items-center justify-center text-center">
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                                    <ArrowDown size={16} color="#818cf8" />
                                                    Mínima
                                                </div>
                                                <div className="text-lg font-bold text-indigo-400">
                                                    {device.telemetry.tempMin !== undefined ? `${device.telemetry.tempMin.toFixed(1)}°C` : '--'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6 z-10">
                                            <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                                                    <BatteryCharging size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bateria</div>
                                                    <div className="text-sm font-bold text-white">
                                                        {device.telemetry.batteryVoltage !== undefined ? `${device.telemetry.batteryVoltage.toFixed(2)}V` : '--'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                                    <Zap size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tensão</div>
                                                    <div className="text-sm font-bold text-white">
                                                        {device.telemetry.inputVoltage !== undefined ? `${device.telemetry.inputVoltage}V` : '--'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-[#2A2E24] flex items-center justify-between z-10">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Wifi size={14} className={device.telemetry.signal && device.telemetry.signal > -75 ? 'text-primary' : 'text-amber-500'} />
                                                <span className="text-xs font-medium">Sinal RSSI: {device.telemetry.signal !== undefined ? `${device.telemetry.signal} dBm` : '--'}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-[#0F110D] border border-[#2A2E24] ${device.telemetry.signal && device.telemetry.signal > -75 ? 'text-emerald-400' : 'text-amber-500'}`}>
                                                {getSignalQuality(device.telemetry.signal)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
