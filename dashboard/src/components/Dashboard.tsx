import React from 'react';
import { Shield, ServerCrash } from 'lucide-react';
import Sidebar from './Sidebar';
import DashboardHeader from './dashboard/DashboardHeader';
import DeviceCard from './dashboard/DeviceCard';
import ReportModal from './dashboard/ReportModal';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useTelemetryData } from '../hooks/useTelemetryData';
import { useReportGenerator } from '../hooks/useReportGenerator';

interface DashboardProps {
    onDeviceClick: (deviceId: string) => void;
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel' | 'admin-users') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onDeviceClick, onNavigate }) => {
    const { currentTenant, availableTenants, setTenantId } = useTenant();
    const { currentUser, logout } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

    const isAdmin = currentUser?.role === 'admin';
    const isManager = currentUser?.role === 'manager' || currentUser?.role === 'gestor';
    const hasLinkedTenants = availableTenants.length > 0;
    const canSeeDevices = isAdmin || isManager || hasLinkedTenants;

    // Business Logic focused hooks
    const {
        supabaseDevices,
        displayDevices,
        mqttConnected
    } = useTelemetryData(currentTenant, availableTenants, currentUser);

    const {
        reportForm,
        setReportForm,
        applyPreset,
        generatingReport,
        showReportModal,
        setShowReportModal,
        openReportModal,
        handleGenerateReport
    } = useReportGenerator(currentTenant, availableTenants, supabaseDevices, displayDevices, currentUser?.role);

    if (!currentTenant || !currentUser) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
                Carregando dados da Empresa...
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar
                activeItem="dashboard"
                onNavigate={onNavigate}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={setSidebarCollapsed}
            />

            <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative bg-background-light text-text-dark">
                <DashboardHeader
                    currentUser={currentUser}
                    mqttConnected={mqttConnected}
                    onOpenReport={openReportModal}
                    onNavigate={onNavigate}
                    onLogout={logout}
                />

                <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-10 py-6 pb-24 sm:pb-6 custom-scrollbar 2xl:max-w-[1600px] 2xl:mx-auto w-full">
                    {/* TABS */}
                    <div className="flex flex-col gap-6 mb-8">
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            <button
                                onClick={() => setTenantId('all')}
                                className={`px-4 py-2 whitespace-nowrap text-sm font-semibold transition-all border-b-2 ${currentTenant?.id === 'all' || !currentTenant
                                    ? 'border-primary text-text-dark'
                                    : 'border-transparent text-text-primary hover:text-text-dark'
                                    }`}
                            >
                                Todos
                            </button>
                            {availableTenants.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTenantId(t.id)}
                                    className={`px-4 py-2 whitespace-nowrap text-sm font-semibold transition-all border-b-2 ${currentTenant?.id === t.id
                                        ? 'border-primary text-text-dark'
                                        : 'border-transparent text-text-primary hover:text-text-dark'
                                        }`}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* DEVICE GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {!canSeeDevices ? (
                            <div className="col-span-1 md:col-span-2 xl:col-span-3 py-12 flex flex-col items-center justify-center text-slate-500 bg-[#1A1D17] rounded-2xl border border-[#2A2E24]">
                                <Shield className="mb-4 opacity-50 text-amber-500" size={48} />
                                <h2 className="text-xl font-bold text-white mb-2">Acesso Pendente</h2>
                                <p className="text-slate-400 text-center max-w-xs">Sua conta ainda não foi vinculada a nenhuma empresa. Entre em contato com o administrador.</p>
                            </div>
                        ) : displayDevices.length === 0 ? (
                            <div className="col-span-1 md:col-span-2 xl:col-span-3 py-12 flex flex-col items-center justify-center text-slate-500 bg-[#1A1D17] rounded-2xl border border-[#2A2E24]">
                                <ServerCrash size={48} className="mb-4 opacity-50" />
                                <p className="text-lg">Nenhum dispositivo encontrado para esta empresa.</p>
                            </div>
                        ) : (
                            displayDevices.map((device) => (
                                <DeviceCard
                                    key={device.id}
                                    device={device}
                                    onDeviceClick={onDeviceClick}
                                    isManager={isManager || isAdmin}
                                    currentTenantId={currentTenant.id}
                                    availableTenants={availableTenants}
                                />
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* MODAL DE RELATÓRIOS */}
            <ReportModal
                show={showReportModal}
                onClose={() => setShowReportModal(false)}
                reportForm={reportForm}
                setReportForm={setReportForm}
                generatingReport={generatingReport}
                applyPreset={applyPreset}
                onGenerate={handleGenerateReport}
                availableTenants={availableTenants}
                supabaseDevices={supabaseDevices}
                currentUser={currentUser}
            />
        </div>
    );
};

export default Dashboard;
