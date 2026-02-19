
import React from 'react';
import Sidebar from './Sidebar';
import { useTenant } from '../contexts/TenantContext';
import { useSettings } from '../hooks/useSettings';

interface SettingsProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details') => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
    const { currentTenant } = useTenant();
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

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-background-dark/50">
                <header className="sticky top-0 z-10 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-8 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">Configurações do Sistema</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Gerencie integrações e limites globais do ecossistema {currentTenant.name}.</p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full space-y-8 pb-32 custom-scrollbar">
                    {/* Section 1: MQTT Configuration */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary">router</span>
                            <h3 className="text-slate-900 dark:text-white text-xl font-bold">Configuração MQTT</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl p-6 shadow-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Broker URL</label>
                                    <input
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-primary focus:border-primary px-4 py-2.5 transition-all outline-none"
                                        type="text"
                                        value={settings.mqtt.brokerUrl}
                                        onChange={(e) => updateMqtt('brokerUrl', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Porta</label>
                                    <input
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-primary focus:border-primary px-4 py-2.5 transition-all outline-none"
                                        type="text"
                                        value={settings.mqtt.port}
                                        onChange={(e) => updateMqtt('port', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client ID</label>
                                    <input
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-primary focus:border-primary px-4 py-2.5 transition-all outline-none"
                                        type="text"
                                        value={settings.mqtt.clientId}
                                        onChange={(e) => updateMqtt('clientId', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password / Token</label>
                                    <div className="relative">
                                        <input
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-primary focus:border-primary px-4 py-2.5 transition-all outline-none"
                                            type="password"
                                            value="••••••••••••"
                                            readOnly
                                        />
                                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary">
                                            <span className="material-symbols-outlined text-sm">visibility</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary">verified_user</span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Conexão SSL/TLS Habilitada</p>
                                        <p className="text-xs text-slate-500">Garante a segurança dos dados em trânsito.</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={settings.mqtt.useSsl}
                                        onChange={(e) => updateMqtt('useSsl', e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Global Alert Limits */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary">warning</span>
                            <h3 className="text-slate-900 dark:text-white text-xl font-bold">Limites Globais de Alerta</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl p-6 shadow-xl space-y-8">
                            {/* Temperature Slider */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-500">thermometer</span>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Temperatura Crítica</span>
                                    </div>
                                    <span className="text-primary font-bold text-sm bg-primary/10 px-2 py-1 rounded">{settings.thresholds.criticalTemp}°C</span>
                                </div>
                                <input
                                    type="range"
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                    min="0" max="100"
                                    value={settings.thresholds.criticalTemp}
                                    onChange={(e) => updateThreshold('criticalTemp', parseInt(e.target.value))}
                                />
                                <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                                    <span>0°C</span>
                                    <span>Ideal</span>
                                    <span>Perigoso</span>
                                    <span>100°C</span>
                                </div>
                            </div>

                            {/* Voltage Slider */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-500">battery_alert</span>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Baixa Voltagem</span>
                                    </div>
                                    <span className="text-primary font-bold text-sm bg-primary/10 px-2 py-1 rounded">{settings.thresholds.lowVoltage}V</span>
                                </div>
                                <input
                                    type="range"
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                    min="0" max="24" step="0.1"
                                    value={settings.thresholds.lowVoltage}
                                    onChange={(e) => updateThreshold('lowVoltage', parseFloat(e.target.value))}
                                />
                                <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                                    <span>0V</span>
                                    <span>Operacional</span>
                                    <span>24V</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Notification Preferences */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary">notifications_active</span>
                            <h3 className="text-slate-900 dark:text-white text-xl font-bold">Preferências de Notificação</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl p-4 shadow-xl">
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {[
                                    { id: 'email', label: 'E-mail', desc: 'Alertas de sistema e logs diários.', icon: 'mail' },
                                    { id: 'whatsapp', label: 'WhatsApp', desc: 'Notificações críticas imediatas.', icon: 'chat_bubble' },
                                    { id: 'weeklyReports', label: 'Relatórios Semanais', desc: 'Resumo de performance consolidado.', icon: 'summarize' }
                                ].map((item) => (
                                    <label key={item.id} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                                <span className="material-symbols-outlined">{item.icon}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{item.label}</p>
                                                <p className="text-xs text-slate-500">{item.desc}</p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-primary focus:ring-primary size-5"
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
                <footer className="fixed bottom-0 right-0 left-0 lg:left-64 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-white/10 px-8 py-6 flex flex-col sm:flex-row items-center justify-between z-20">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-4 sm:mb-0">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span className="text-xs">Última alteração salva em {lastSaved}</span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleDiscard}
                            disabled={!isDirty}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${isDirty ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'}`}
                        >
                            Descartar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isDirty}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${isDirty ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}
                        >
                            <span className="material-symbols-outlined text-sm">save</span>
                            Salvar Alterações
                        </button>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default Settings;
