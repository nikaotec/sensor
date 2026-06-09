import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useSupabaseData } from '../../hooks/useSupabaseData';

interface DailyReportPreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DailyReportPreferencesModal: React.FC<DailyReportPreferencesModalProps> = ({ isOpen, onClose }) => {
    const { currentUser } = useAuth();
    const { currentTenant, availableTenants } = useTenant();

    if (!isOpen || !currentUser || !currentTenant) return null;

    const [dailyReports, setDailyReports] = React.useState(currentUser?.dailyReportsEnabled || false);
    const [selectedDeviceIds, setSelectedDeviceIds] = React.useState<string[]>(currentUser?.dailyReportDeviceIds || []);
    const [reportTime, setReportTime] = React.useState(currentUser?.dailyReportTime || '17:05');
    const [isUpdatingUser, setIsUpdatingUser] = React.useState(false);
    const [isSendingEmail, setIsSendingEmail] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState<string | null>(null);

    // Sync state when modal is opened or user changes
    React.useEffect(() => {
        setDailyReports(currentUser?.dailyReportsEnabled || false);
        setSelectedDeviceIds(currentUser?.dailyReportDeviceIds || []);
        setReportTime(currentUser?.dailyReportTime || '17:05');
        setError(null);
        setSuccess(null);
    }, [currentUser, isOpen]);

    // Fetch devices available for this tenant/user (passing 'all' to load across all tenants)
    const { devices: supabaseDevices } = useSupabaseData(
        'all', 
        undefined, 
        currentUser?.role, 
        currentUser?.allowedDevices
    );

    const tenantMap = React.useMemo(() => {
        const map = new Map<string, string>();
        availableTenants.forEach(t => {
            map.set(t.id, t.name);
        });
        return map;
    }, [availableTenants]);

    const groupedDevices = React.useMemo(() => {
        const groups: { [tenantId: string]: { tenantName: string; devices: typeof supabaseDevices } } = {};
        
        supabaseDevices.forEach(device => {
            const tId = device.tenantId || 'unassigned';
            const tenantName = tenantMap.get(tId) || (tId === 'unassigned' ? 'Sem Empresa' : tId);
            if (!groups[tId]) {
                groups[tId] = {
                    tenantName,
                    devices: []
                };
            }
            groups[tId].devices.push(device);
        });
        
        return Object.values(groups).sort((a, b) => a.tenantName.localeCompare(b.tenantName));
    }, [supabaseDevices, tenantMap]);

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nikaotech.com/api';

    const handleSavePreferences = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingUser(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`${API_BASE_URL}/users/${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dailyReportsEnabled: dailyReports,
                    dailyReportDeviceIds: selectedDeviceIds,
                    dailyReportTime: reportTime
                })
            });
            if (!res.ok) throw new Error('Falha ao salvar preferências');

            // Sync with local session instance
            currentUser.dailyReportsEnabled = dailyReports;
            currentUser.dailyReportDeviceIds = selectedDeviceIds;
            currentUser.dailyReportTime = reportTime;

            setSuccess('Preferências salvas com sucesso!');
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar preferências.');
        } finally {
            setIsUpdatingUser(false);
        }
    };

    const handleSendReportNow = async () => {
        setIsSendingEmail(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`${API_BASE_URL}/users/${currentUser.id}/send-daily-report`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Falha ao enviar relatório.');
            setSuccess('Relatório diário enviado com sucesso para o seu e-mail!');
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar o relatório agora.');
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1A1D17] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2.5 rounded-xl text-primary border border-primary/30">
                            <Mail size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Preferências de Relatório</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar pb-4">
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            >
                                <AlertCircle size={16} />
                                {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            >
                                <CheckCircle2 size={16} />
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Toggle Automático */}
                    <div className="flex items-center justify-between gap-4 p-4 bg-black/20 border border-white/5 rounded-2xl">
                        <div>
                            <h4 className="text-xs font-bold text-white">Relatório Automático Diário</h4>
                            <p className="text-[10px] text-slate-500 mt-1">
                                Envio diário automático com temperaturas de 08:00 e 16:00.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={dailyReports}
                                onChange={(e) => setDailyReports(e.target.checked)}
                                disabled={isUpdatingUser}
                            />
                            <div className={`w-12 h-6 bg-[#0F110D] border border-[#2A2E24] rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#DFDFDF] after:border-gray-500 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${dailyReports ? 'bg-primary border-primary' : 'bg-black/20 border-[#2A2E24]'}`}></div>
                        </label>
                    </div>

                    {/* Horário de Envio */}
                    <div className="flex items-center justify-between gap-4 p-4 bg-black/20 border border-white/5 rounded-2xl">
                        <div>
                            <h4 className="text-xs font-bold text-white">Horário Preferencial</h4>
                            <p className="text-[10px] text-slate-500 mt-1">
                                Horário de envio ( Brasília ). Ex: 17:05
                            </p>
                        </div>
                        <input
                            type="time"
                            className="bg-[#0F110D] border border-white/10 rounded-xl text-white text-xs px-3 py-2 outline-none focus:border-primary/50 transition-all"
                            value={reportTime}
                            onChange={(e) => setReportTime(e.target.value)}
                        />
                    </div>

                    {/* Seleção de Dispositivos */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Selecionar Dispositivos
                        </label>
                        <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2 p-1">
                            {groupedDevices.map(group => (
                                <div key={group.tenantName} className="space-y-2">
                                    <div className="text-[10px] font-black text-primary uppercase tracking-wider border-b border-white/5 pb-1">
                                        {group.tenantName}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {group.devices.map(device => {
                                            const isChecked = selectedDeviceIds.includes(device.id);
                                            return (
                                                <label key={device.id} className="flex items-center gap-3 p-3 bg-black/20 border border-white/5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors group">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-[#2A2E24] bg-[#0F110D] text-primary focus:ring-primary size-4"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            if (isChecked) {
                                                                setSelectedDeviceIds(selectedDeviceIds.filter(id => id !== device.id));
                                                            } else {
                                                                setSelectedDeviceIds([...selectedDeviceIds, device.id]);
                                                            }
                                                        }}
                                                    />
                                                    <div className="text-[11px] text-left">
                                                        <p className="font-bold text-white group-hover:text-primary transition-colors">{device.name || device.id}</p>
                                                        {device.location && <p className="text-[9px] text-[#A5A4AB]">{device.location}</p>}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {groupedDevices.length === 0 && (
                                <p className="text-xs text-slate-500 italic">Nenhum dispositivo disponível.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-white/10 flex flex-wrap gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isUpdatingUser || isSendingEmail}
                        className="flex-1 py-3 border border-white/10 text-slate-400 font-bold rounded-2xl hover:bg-white/5 text-xs transition-colors disabled:opacity-50"
                    >
                        Fechar
                    </button>
                    <button
                        type="button"
                        onClick={handleSendReportNow}
                        disabled={isSendingEmail || isUpdatingUser}
                        className="flex-1 py-3 bg-black/40 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/5 text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        {isSendingEmail ? <Loader2 size={12} className="animate-spin" /> : 'Gerar e Enviar Agora'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSavePreferences}
                        disabled={isUpdatingUser || isSendingEmail}
                        className="flex-1 py-3 bg-primary text-background-dark font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                        {isUpdatingUser ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default DailyReportPreferencesModal;
