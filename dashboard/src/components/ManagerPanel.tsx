import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, doc, setDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import { useTenant } from '../contexts/TenantContext';
import { Building2, UserPlus, Cpu, Plus, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
// import { createUserWithEmailAndPassword } from 'firebase/auth'; // Using secondary app is better, but keeping simple for now

interface ManagerPanelProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel') => void;
}

const ManagerPanel: React.FC<ManagerPanelProps> = ({ onNavigate }) => {
    const { availableTenants } = useTenant();
    const [allUsers, setAllUsers] = useState<any[]>([]);

    useEffect(() => {
        // Escuta os usuários cadastrados no sistema em tempo real para a promoção
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersList: any[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.email) {
                    usersList.push({ id: doc.id, ...data });
                }
            });
            setAllUsers(usersList);
        });

        return () => unsubscribe();
    }, []);

    // States for Company Creation
    const [companyName, setCompanyName] = useState('');

    // States for Admin User Creation
    const [adminUserId, setAdminUserId] = useState('');
    const [adminTenantId, setAdminTenantId] = useState('');

    // States for Device Creation
    const [deviceId, setDeviceId] = useState('');
    const [deviceName, setDeviceName] = useState('');
    const [deviceTenantId, setDeviceTenantId] = useState('');

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

    const handleCreateDevice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deviceId.trim() || !deviceName.trim() || !deviceTenantId) return;
        try {
            await setDoc(doc(db, 'devices', deviceId.trim()), {
                name: deviceName.trim(),
                tenantId: deviceTenantId,
                status: 'Instalado',
                location: 'Sede',
                createdAt: new Date().toISOString()
            });
            showMessage('success', `Dispositivo ${deviceName} registrado com sucesso!`);
            setDeviceId('');
            setDeviceName('');
            setDeviceTenantId('');
        } catch (err: any) {
            showMessage('error', `Erro ao registrar dispositivo: ${err.message}`);
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

                    {/* Create Device Card */}
                    <div className="bg-white dark:bg-[#12150F] rounded-2xl border border-gray-200 dark:border-[#2A2E24] p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-lg bg-orange-500/10 text-orange-500">
                                <Cpu size={24} />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Novo Dispositivo</h2>
                        </div>
                        <form onSubmit={handleCreateDevice} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID Mqtt do Dispositivo (Client ID)</label>
                                <input
                                    type="text"
                                    required
                                    value={deviceId}
                                    onChange={(e) => setDeviceId(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#1A1D16] border border-gray-200 dark:border-[#2A2E24] rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Ex: sensor-freezer-01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome de Exibição</label>
                                <input
                                    type="text"
                                    required
                                    value={deviceName}
                                    onChange={(e) => setDeviceName(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#1A1D16] border border-gray-200 dark:border-[#2A2E24] rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Freezer Vacina Polio"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa Vinculada</label>
                                <select
                                    required
                                    value={deviceTenantId}
                                    onChange={(e) => setDeviceTenantId(e.target.value)}
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
                                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
                            >
                                <Plus size={18} />
                                Registrar Dispositivo
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ManagerPanel;
