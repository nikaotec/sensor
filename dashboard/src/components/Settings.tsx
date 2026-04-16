import React from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useSettings } from '../hooks/useSettings';
import { Router, EyeOff, ShieldCheck, AlertTriangle, Thermometer, BatteryWarning, BellRing, Mail, MessageCircle, FileText, Info, Save } from 'lucide-react';

interface SettingsProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel' | 'admin-users') => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
    const { currentTenant } = useTenant();
    if (!currentTenant) return <div className="flex h-screen items-center justify-center bg-background-dark text-white">Carregando dados...</div>;
    const {
        settings,
        isDirty,
        lastSaved,
        updateMqtt,
        updateThreshold,
        toggleNotification,
        handleSave,
        handleDiscard
    } = useSettings(currentTenant.id);

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">
            <Sidebar activeItem="settings" onNavigate={onNavigate} />

            <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden relative bg-background-light text-text-dark">
                {/* HEADER */}
                <header className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-8 bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-text-dark tracking-tight">Configurações do Sistema</h2>
                        <p className="text-slate-500 text-xs font-normal">Gerencie integrações e limites globais do ecossistema {currentTenant.name}.</p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 max-w-5xl mx-auto w-full space-y-8 pb-32 custom-scrollbar">
                    {/* Section 1: MQTT Configuration */}
                    <section>
                        <div className="flex items-center gap-2 px-1 pb-3 pt-2">
                            <Router className="text-primary" size={20} />
                            <h3 className="text-lg font-bold leading-tight tracking-tight text-white/90 font-heading">Configuração MQTT</h3>
                        </div>
                        <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Broker URL</label>
                                    <input
                                        className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl text-white focus:ring-primary focus:border-primary/50 px-4 py-3 transition-all outline-none"
                                        type="text"
                                        value={settings.mqtt.brokerUrl}
                                        onChange={(e) => updateMqtt('brokerUrl', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Porta</label>
                                    <input
                                        className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl text-white focus:ring-primary focus:border-primary/50 px-4 py-3 transition-all outline-none"
                                        type="text"
                                        value={settings.mqtt.port}
                                        onChange={(e) => updateMqtt('port', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client ID</label>
                                    <input
                                        className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl text-white focus:ring-primary focus:border-primary/50 px-4 py-3 transition-all outline-none"
                                        type="text"
                                        value={settings.mqtt.clientId}
                                        onChange={(e) => updateMqtt('clientId', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password / Token</label>
                                    <div className="relative">
                                        <input
                                            className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl text-white focus:ring-primary focus:border-primary/50 px-4 py-3 transition-all outline-none"
                                            type="password"
                                            value="••••••••••••"
                                            readOnly
                                        />
                                        <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors">
                                            <EyeOff size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-[#2A2E24] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2.5 rounded-lg border border-primary/20 text-primary">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Conexão SSL/TLS Habilitada</p>
                                        <p className="text-xs text-slate-400 mt-1">Garante a segurança dos dados em trânsito.</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={settings.mqtt.useSsl}
                                        onChange={(e) => updateMqtt('useSsl', e.target.checked)}
                                    />
                                    <div className={`w-12 h-6 bg-[#0F110D] border border-[#2A2E24] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#DFDFDF] after:border-gray-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${settings.mqtt.useSsl ? 'bg-primary border-primary' : ''}`}></div>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Global Alert Limits */}
                    <section>
                        <div className="flex items-center gap-2 px-1 pb-3 pt-2">
                            <AlertTriangle className="text-amber-500" size={20} />
                            <h3 className="text-lg font-bold leading-tight tracking-tight text-white/90 font-heading">Limites Globais de Alerta</h3>
                        </div>
                        <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg space-y-8">
                            {/* Temperature Slider */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                            <Thermometer size={18} />
                                        </div>
                                        <span className="text-sm font-bold text-white">Temperatura Crítica</span>
                                    </div>
                                    <span className="text-primary font-bold text-xs bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg">{settings.thresholds.criticalTemp}°C</span>
                                </div>
                                <input
                                    type="range"
                                    className="w-full h-1.5 bg-[#0F110D] border border-[#2A2E24] rounded-lg appearance-none cursor-pointer accent-primary"
                                    min="0" max="100"
                                    value={settings.thresholds.criticalTemp}
                                    onChange={(e) => updateThreshold('criticalTemp', parseInt(e.target.value))}
                                />
                                <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold tracking-widest pt-1">
                                    <span>0°C</span>
                                    <span>Ideal</span>
                                    <span>Perigoso</span>
                                    <span>100°C</span>
                                </div>
                            </div>

                            {/* Voltage Slider */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                            <BatteryWarning size={18} />
                                        </div>
                                        <span className="text-sm font-bold text-white">Baixa Voltagem</span>
                                    </div>
                                    <span className="text-primary font-bold text-xs bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg">{settings.thresholds.lowVoltage}V</span>
                                </div>
                                <input
                                    type="range"
                                    className="w-full h-1.5 bg-[#0F110D] border border-[#2A2E24] rounded-lg appearance-none cursor-pointer accent-primary"
                                    min="0" max="24" step="0.1"
                                    value={settings.thresholds.lowVoltage}
                                    onChange={(e) => updateThreshold('lowVoltage', parseFloat(e.target.value))}
                                />
                                <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold tracking-widest pt-1">
                                    <span>0V</span>
                                    <span>Operacional</span>
                                    <span>24V</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Notification Preferences */}
                    <section>
                        <div className="flex items-center gap-2 px-1 pb-3 pt-2">
                            <BellRing className="text-primary" size={20} />
                            <h3 className="text-lg font-bold leading-tight tracking-tight text-white/90 font-heading">Preferências de Notificação</h3>
                        </div>
                        <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-2 shadow-lg">
                            <div className="divide-y divide-[#2A2E24]">
                                {[
                                    { id: 'email', label: 'E-mail', desc: 'Alertas de sistema e logs diários.', icon: <Mail size={18} /> },
                                    { id: 'whatsapp', label: 'WhatsApp', desc: 'Notificações críticas imediatas.', icon: <MessageCircle size={18} /> },
                                    { id: 'weeklyReports', label: 'Relatórios Semanais', desc: 'Resumo de performance consolidado.', icon: <FileText size={18} /> }
                                ].map((item) => (
                                    <label key={item.id} className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#2A2E24]/30 transition-colors group rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-xl bg-[#0F110D] border border-[#2A2E24] flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary/30 transition-colors">
                                                {item.icon}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{item.label}</p>
                                                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="rounded border-[#2A2E24] bg-[#0F110D] text-primary focus:ring-primary size-5"
                                            checked={(settings.notifications as any)[item.id]}
                                            onChange={() => toggleNotification(item.id as any)}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Persistent Footer Action Bar */}
                <footer className="fixed bottom-0 right-0 left-0 lg:left-[80px] bg-[#1A1D17]/90 backdrop-blur-lg border-t border-[#2A2E24] px-8 py-5 flex flex-col sm:flex-row items-center justify-between z-20">
                    <div className="flex items-center gap-3 text-slate-500 mb-4 sm:mb-0">
                        <Info size={16} className="text-primary" />
                        <span className="text-xs font-medium">Última alteração salva em {lastSaved}</span>
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <button
                            onClick={handleDiscard}
                            disabled={!isDirty}
                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all border ${isDirty ? 'border-[#2A2E24] hover:bg-[#2A2E24] text-white bg-[#0F110D]' : 'border-transparent text-slate-600 cursor-not-allowed'}`}
                        >
                            Descartar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isDirty}
                            className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${isDirty ? 'bg-primary text-background-dark shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]' : 'bg-[#0F110D] border border-[#2A2E24] text-slate-600 cursor-not-allowed'}`}
                        >
                            <Save size={16} />
                            Salvar Alterações
                        </button>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default Settings;
