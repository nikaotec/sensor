import React, { useState } from 'react';
import Sidebar from './Sidebar';
import DeviceCard from './dashboard/DeviceCard';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useMqttData } from '../hooks/useMqttData';
import { Search, Wifi, ServerCrash } from 'lucide-react';

interface DeviceListProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel' | 'admin-users') => void;
    onDeviceClick: (deviceId: string) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ onNavigate, onDeviceClick }) => {
    const { currentTenant, availableTenants } = useTenant();
    const { currentUser } = useAuth();
    if (!currentTenant) return <div className="flex h-screen items-center justify-center bg-background-dark text-white">Carregando dados...</div>;

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'warning'>('all');

    // Dados base do Firebase + sobreposição ao vivo do MQTT
    // Escuta todos os dados para que a lógica lide mesmo quando a aba não estiver em "Todos".
    const { devices: supabaseDevices } = useSupabaseData(currentTenant.id);
    const { devices: tenantDevices, isConnected: mqttConnected } = useMqttData({ id: 'all' }, currentUser?.role, supabaseDevices);

    // Filtro para garantir que só seja exibido dispositivos vinculados
    const authFilteredDevices = React.useMemo(() => {
        const allowedTenantIds = availableTenants.map(t => t.id);
        const allowedTenantNames = availableTenants.map(t => t.name);

        const assignedDevices = tenantDevices.filter(d => {
            if (!d || !d.tenantId) return false;
            const t = String(d.tenantId).trim().toLowerCase();
            return t !== "" && t !== "unknown" && t !== "empresa_default" && t !== "nikaotec" && t !== "null" && t !== "undefined";
        });

        if (currentTenant && currentTenant.id !== 'all') {
            return assignedDevices.filter(d => d.tenantId === currentTenant.id || d.tenantId === currentTenant.name);
        }

        if (currentUser?.role === 'manager') return assignedDevices;

        return assignedDevices.filter(d => d.tenantId && (allowedTenantIds.includes(d.tenantId) || allowedTenantNames.includes(d.tenantId)));
    }, [tenantDevices, currentUser?.role, availableTenants, currentTenant]);

    // Filter by search, status AND require mqttUpdated to be true
    const filteredDevices = authFilteredDevices.filter(device => {

        const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
        return matchesSearch && matchesStatus;
    });



    return (
        <div className="flex h-screen overflow-hidden bg-background-dark text-slate-100 font-display">
            <Sidebar activeItem="device-list" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background-dark">
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-8 bg-[#1A1D17]/80 backdrop-blur-md border-b border-[#2A2E24] sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-white tracking-tight">Dispositivos de {currentTenant.name}</h2>
                        {mqttConnected && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                                <Wifi size={10} /> MQTT Live
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex items-center bg-[#0F110D] px-4 py-2 rounded-xl border border-[#2A2E24] w-64 lg:w-96 group focus-within:border-primary/50 transition-all">
                            <Search size={18} className="text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm px-3 w-full text-white placeholder:text-slate-500"
                                placeholder="Buscar dispositivo ou local..."
                            />
                        </div>
                        <div className="flex bg-[#0F110D] rounded-xl p-1 border border-[#2A2E24]">
                            {['all', 'online', 'warning', 'offline'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setStatusFilter(f as any)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === f ? 'bg-primary/20 text-primary border border-primary/30' : 'text-slate-400 hover:text-white border border-transparent'}`}
                                >
                                    {f === 'all' ? 'TODOS' : f.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 pb-24 sm:pb-8 custom-scrollbar 2xl:max-w-[1600px] 2xl:mx-auto w-full">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredDevices.length === 0 ? (
                                <div className="col-span-1 md:col-span-2 xl:col-span-3 py-12 flex flex-col items-center justify-center text-slate-500 bg-[#1A1D17] rounded-2xl border border-[#2A2E24]">
                                    <ServerCrash size={48} className="mb-4 opacity-50" />
                                    <p className="text-lg">Nenhum dispositivo encontrado para os filtros aplicados.</p>
                                </div>
                            ) : (
                                filteredDevices.map((device) => {
                                    return (
                                        <DeviceCard
                                            key={device.id}
                                            device={device}
                                            onDeviceClick={onDeviceClick}
                                            isManager={currentUser?.role === 'gestor' || currentUser?.role === 'manager' || currentUser?.role === 'admin'}
                                            currentTenantId={currentTenant.id}
                                            availableTenants={availableTenants}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DeviceList;

