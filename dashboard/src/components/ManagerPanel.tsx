import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc, arrayUnion, onSnapshot, setDoc } from 'firebase/firestore';
import { useTenant } from '../contexts/TenantContext';
import { useMqttData } from '../hooks/useMqttData';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { Building2, UserPlus, Cpu, Plus, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

interface ManagerPanelProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel') => void;
}

const ManagerPanel: React.FC<ManagerPanelProps> = ({ onNavigate }) => {
    const { availableTenants } = useTenant();
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [selectedTenants, setSelectedTenants] = useState<{ [key: string]: string }>({});

    // Carrega dispositivos via Firestore + MQTT Live Stream para reagir a vínculos
    const { devices: firebaseDevices } = useFirebaseData('all');
    const { devices: mqttDevices } = useMqttData('all', 'manager', firebaseDevices);

    // Filtro reativo
    const unlinkedDevices = mqttDevices.filter(d =>
        !d.tenantId || d.tenantId === "Unknown" || d.tenantId === "empresa_default" || d.tenantId === "Nikaotec"
    );

    useEffect(() => {
        const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersList: any[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.email) {
                    usersList.push({ id: doc.id, ...data });
                }
            });
            setAllUsers(usersList);
        });

        return () => {
            unsubscribeUsers();
        };
    }, []);

    // States for Company Creation
    const [companyName, setCompanyName] = useState('');

    // States for Admin User Creation
    const [adminUserId, setAdminUserId] = useState('');
    const [adminTenantId, setAdminTenantId] = useState('');



    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyName.trim()) return;
        try {
            const docRef = await addDoc(collection(db, 'tenants'), {
                name: companyName.trim(),
                createdAt: new Date().toISOString()
            });
            showMessage('success', `Empresa criada com sucesso! ID: ${docRef.id}`);
            setCompanyName('');
        } catch (err: any) {
            showMessage('error', `Erro ao criar empresa: ${err.message}`);
        }
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminUserId || !adminTenantId) return;
        try {
            const userDocRef = doc(db, 'users', adminUserId);

            await updateDoc(userDocRef, {
                role: 'admin',
                tenantIds: arrayUnion(adminTenantId)
            });

            showMessage('success', `Usuário vinculado à empresa como Administrador com sucesso!`);
            setAdminUserId('');
            setAdminTenantId('');
        } catch (err: any) {
            showMessage('error', `Erro ao configurar admin: ${err.message}`);
        }
    };

    const handleLinkDevice = async (idDispositivo: string) => {
        const tId = selectedTenants[idDispositivo];
        if (!tId) {
            showMessage('error', 'Selecione uma empresa válida.');
            return;
        }

        try {
            const deviceRef = doc(db, 'devices_status', idDispositivo);
            await setDoc(deviceRef, {
                tenantId: tId
            }, { merge: true });
            showMessage('success', 'Dispositivo vinculado com sucesso!');
        } catch (err: any) {
            showMessage('error', `Erro ao vincular: ${err.message}`);
        }
    };

    return (
        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-background-light dark:bg-background-dark p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Painel do Gestor</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie empresas, administradores e dispositivos do sistema.</p>
                    </div>
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className="flex items-center gap-2 bg-white dark:bg-[#12150F] border border-gray-200 dark:border-[#2A2E24] hover:bg-gray-50 dark:hover:bg-[#1A1D16] text-gray-700 dark:text-gray-300 rounded-xl px-4 py-2 text-sm font-medium transition-colors shadow-sm"
                    >
                        <ArrowLeft size={18} />
                        Voltar ao Dashboard
                    </button>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}>
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <p className="text-sm font-medium">{message.text}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                    {/* Create Company Card */}
                    <div className="bg-white dark:bg-[#12150F] rounded-2xl border border-gray-200 dark:border-[#2A2E24] p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                                <Building2 size={24} />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nova Empresa</h2>
                        </div>
                        <form onSubmit={handleCreateCompany} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Empresa</label>
                                <input
                                    type="text"
                                    required
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#1A1D16] border border-gray-200 dark:border-[#2A2E24] rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Ex: Farmácia Central"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
                            >
                                <Plus size={18} />
                                Cadastrar Empresa
                            </button>
                        </form>
                    </div>

                    {/* Create Admin Card */}
                    <div className="bg-white dark:bg-[#12150F] rounded-2xl border border-gray-200 dark:border-[#2A2E24] p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <UserPlus size={24} />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Promover Administrador</h2>
                        </div>
                        <form onSubmit={handleCreateAdmin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuário Existente</label>
                                <select
                                    required
                                    value={adminUserId}
                                    onChange={(e) => setAdminUserId(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#1A1D16] border border-gray-200 dark:border-[#2A2E24] rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">Selecione um usuário...</option>
                                    {allUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.email} ({u.name || 'Sem Nome'})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa Vinculada</label>
                                <select
                                    required
                                    value={adminTenantId}
                                    onChange={(e) => setAdminTenantId(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#1A1D16] border border-gray-200 dark:border-[#2A2E24] rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">Selecione uma empresa...</option>
                                    {availableTenants.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
                            >
                                <Plus size={18} />
                                Vincular Admin
                            </button>
                        </form>
                    </div>

                    {/* Unlinked Devices Card */}
                    <div className="bg-white dark:bg-[#12150F] rounded-2xl border border-gray-200 dark:border-[#2A2E24] p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-lg bg-orange-500/10 text-orange-500">
                                <Cpu size={24} />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-baseline gap-2">
                                Novos Dispositivos ({unlinkedDevices.length})
                                <span className="text-[10px] text-gray-400 font-normal">(Live: {mqttDevices.length})</span>
                            </h2>
                        </div>

                        {unlinkedDevices.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum novo dispositivo aguardando vínculo.</p>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {unlinkedDevices.map((dev) => (
                                    <div key={dev.id} className="p-4 bg-gray-50 dark:bg-[#1A1D16] border border-gray-200 dark:border-[#2A2E24] rounded-xl space-y-3">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{dev.name || 'Sem nome'}</p>
                                            <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {dev.id}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <select
                                                value={selectedTenants[dev.id] || ""}
                                                onChange={(e) => setSelectedTenants({ ...selectedTenants, [dev.id]: e.target.value })}
                                                className="flex-1 bg-white dark:bg-[#12150F] border border-gray-200 dark:border-[#2A2E24] rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                                            >
                                                <option value="">Selecione empresa...</option>
                                                {availableTenants.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleLinkDevice(dev.id)}
                                                className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
                                            >
                                                <Plus size={14} /> Vincular
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ManagerPanel;
