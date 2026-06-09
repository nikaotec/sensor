import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useMqttData } from '../hooks/useMqttData';
import { useSupabaseData, useUsers } from '../hooks/useSupabaseData';
import { provisionFirebaseUser, generateRandomPassword } from '../services/firebaseAuth';
import { deleteUserCompletely } from '../services/userService';
import {
    Building2,
    UserPlus,
    Cpu,
    Plus,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    Users,
    ShieldCheck,
    Settings2,
    Search,
    Loader2,
    Building,
    Trash2,
    Edit2,
    Phone,
    X,
    BellOff,
    Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nikaotech.com/api';

// Máscara de telefone: +55 81 99999-9999 (formato brasileiro)
// Aceita até 13 dígitos: +55 (2) + DDD (2) + 9 dígitos = 13 dígitos
const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');

    if (digits.length <= 0) return '';

    // Limita a 13 dígitos (sem o +)
    const limited = digits.slice(0, 13);

    let result = '+' + limited;

    if (limited.length > 2) {
        // Insere espaço após DDI
        result = '+' + limited.slice(0, 2) + ' ' + limited.slice(2);
    }

    if (limited.length > 4) {
        // Insere espaço após DDD
        result = '+' + limited.slice(0, 2) + ' ' + limited.slice(2, 4) + ' ' + limited.slice(4);
    }

    if (limited.length > 9) {
        // Insere hífen antes dos últimos 4 dígitos
        result = '+' + limited.slice(0, 2) + ' ' + limited.slice(2, 4) + ' ' + limited.slice(4, 9) + '-' + limited.slice(9);
    }

    return result;
};

// handlePhoneChange removido para simplificação e correção de erro de foco

// Sincroniza o telefone do usuário na tabela users_devices (usada pelo n8n para alertas WhatsApp)
const syncPhoneToUsersDevices = async (
    userId: string,
    phone: string | null,
    receiveNotifications: boolean
): Promise<void> => {
    const phoneClean = phone?.trim() || null;
    if (phoneClean) {
        const response = await fetch(`${API_BASE_URL}/users-devices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                deviceId: null,
                phone: phoneClean,
                receiveNotifications: receiveNotifications
            })
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Falha ao sincronizar notificações: ${errText || response.statusText}`);
        }
    } else {
        const response = await fetch(`${API_BASE_URL}/users-devices/user/${userId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Falha ao remover notificações: ${errText || response.statusText}`);
        }
    }
};

interface ManagerPanelProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel') => void;
}

type Tab = 'overview' | 'users' | 'companies' | 'devices';

const ManagerPanel: React.FC<ManagerPanelProps> = ({ onNavigate }) => {
    const { availableTenants } = useTenant();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // Data hooks
    const { users, isLoading: loadingUsers, refreshUsers } = useUsers(currentUser?.role);
    const { devices: supabaseDevices } = useSupabaseData('all', undefined, currentUser?.role, currentUser?.allowedDevices);
    const { devices: mqttDevices, publish: mqttPublish, updateDeviceLocal } = useMqttData('all', currentUser?.role, supabaseDevices);

    const [selectedTenants, setSelectedTenants] = useState<{ [key: string]: string }>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [openTenantPopoverFor, setOpenTenantPopoverFor] = useState<string | null>(null);

    // Form States
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserWhatsapp, setNewUserWhatsapp] = useState('');
    const [newUserReceiveWhatsapp, setNewUserReceiveWhatsapp] = useState(false);
    const [newUserRole, setNewUserRole] = useState<'manager' | 'admin' | 'user'>('user');
    const [newUserTenants, setNewUserTenants] = useState<string[]>([]);
    const [newUserAllowedDevices, setNewUserAllowedDevices] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string, pass: string } | null>(null);

    // Estado para silenciar alertas de offline (localStorage)
    const [pausedDevices, setPausedDevices] = useState<{ [key: string]: boolean }>({});

    // Inicializar estado de pausa a partir dos dispositivos
    useEffect(() => {
        const stored: { [key: string]: boolean } = {};
        mqttDevices.forEach(d => {
            stored[d.id] = d.alerts_paused === true;
        });
        setPausedDevices(stored);
    }, [mqttDevices]);

    const handleToggleOfflinePause = async (deviceId: string) => {
        const dev = mqttDevices.find(d => d.id === deviceId);
        const currentStatus = dev?.alerts_paused || false;
        const newValue = !currentStatus;

        setPausedDevices(prev => ({ ...prev, [deviceId]: newValue }));

        try {
            const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alertsPaused: newValue })
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || response.statusText);
            }
        } catch (err) {
            console.error('Erro ao atualizar silenciamento na API:', err);
            setPausedDevices(prev => ({ ...prev, [deviceId]: currentStatus }));
        }
    };

    // Modal de edição de usuário
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editUserName, setEditUserName] = useState('');
    const [editUserEmail, setEditUserEmail] = useState('');
    const [editUserWhatsapp, setEditUserWhatsapp] = useState('');
    const [editUserReceiveWhatsapp, setEditUserReceiveWhatsapp] = useState(false);
    const [editUserRole, setEditUserRole] = useState<'manager' | 'admin' | 'user'>('user');
    const [editUserTenants, setEditUserTenants] = useState<string[]>([]);
    const [editUserAllowedDevices, setEditUserAllowedDevices] = useState<string[]>([]);

    // Forçar desativação de notificações WhatsApp se a role for 'user' na criação
    useEffect(() => {
        if (newUserRole === 'user') {
            setNewUserReceiveWhatsapp(false);
            setNewUserWhatsapp('');
        }
    }, [newUserRole]);

    // Forçar desativação de notificações WhatsApp se a role for 'user' na edição
    useEffect(() => {
        if (editUserRole === 'user') {
            setEditUserReceiveWhatsapp(false);
            setEditUserWhatsapp('');
        }
    }, [editUserRole]);

    // Dispositivos pendentes = dispositivos ATIVOS no MQTT sem empresa válida
    // + dispositivos do Supabase com tenant_id=null que podem estar offline
    const UNLINKED_IDS = [null, undefined, '', 'Unknown', 'empresa_default', 'Nikaotec'];

    const mqttUnlinked = mqttDevices.filter(d => UNLINKED_IDS.includes(d.tenantId as any));

    // Adiciona dispositivos do Supabase com tenant_id=null que não estão no MQTT
    const mqttIds = new Set(mqttDevices.map(d => d.id));
    const supabasePending = supabaseDevices.filter(d =>
        UNLINKED_IDS.includes(d.tenantId as any) && !mqttIds.has(d.id)
    );

    const unlinkedDevices = [...mqttUnlinked, ...supabasePending];

    const popoverRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setOpenTenantPopoverFor(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCompanyName.trim()) return;
        try {
            const response = await fetch(`${API_BASE_URL}/tenants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newCompanyName.trim()
                })
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || response.statusText);
            }
            showMessage('success', `Empresa "${newCompanyName}" criada com sucesso!`);
            setNewCompanyName('');
        } catch (err: any) {
            showMessage('error', `Erro ao criar empresa: ${err.message}`);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserEmail || !newUserName) return;

        // Trava hierárquica: Apenas gestores podem criar outros gestores
        if (newUserRole === 'manager' && currentUser?.role !== 'manager' && currentUser?.role !== 'gestor') {
            showMessage('error', 'Apenas um Gestor pode promover outro usuário a Gestor.');
            return;
        }

        setSubmitting(true);
        setGeneratedCredentials(null);

        try {
            // 0. Gerar senha temporária
            const randomPass = generateRandomPassword();

            // 1. Provisionar no Firebase Auth primeiro
            const fbResult = await provisionFirebaseUser(newUserEmail.toLowerCase(), randomPass);

            if (!fbResult.success) {
                throw new Error(fbResult.error);
            }

            const uid = fbResult.uid || newUserEmail.toLowerCase();

            // 2. Salvar na API Java com o UID do Firebase
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: uid,
                    name: newUserName,
                    email: newUserEmail.toLowerCase(),
                    phone: newUserRole === 'user' ? null : (newUserWhatsapp || null),
                    receiveNotifications: newUserRole === 'user' ? false : newUserReceiveWhatsapp,
                    role: newUserRole,
                    tenantIds: newUserRole === 'manager' ? [] : newUserTenants,
                    allowedDevices: newUserRole === 'user' ? newUserAllowedDevices : [],
                    provisionedBy: currentUser?.email
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || response.statusText);
            }

            // 3. Sincronizar telefone na tabela users_devices (para alertas WhatsApp via n8n)
            await syncPhoneToUsersDevices(uid, newUserRole === 'user' ? null : (newUserWhatsapp || null), newUserRole === 'user' ? false : newUserReceiveWhatsapp);

            setGeneratedCredentials({ email: newUserEmail.toLowerCase(), pass: randomPass });
            showMessage('success', `Usuário ${newUserName} provisionado com sucesso!`);

            // Limpar formulário (exceto as credenciais que serão mostradas)
            setNewUserName('');
            setNewUserEmail('');
            setNewUserWhatsapp('');
            setNewUserReceiveWhatsapp(false);
            setNewUserRole('user');
            setNewUserTenants([]);
            setNewUserAllowedDevices([]);
        } catch (err: any) {
            console.error("Erro no provisionamento:", err);
            showMessage('error', `Erro ao criar usuário: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleLinkDevice = async (deviceId: string) => {
        const tId = selectedTenants[deviceId];
        if (!tId) {
            showMessage('error', 'Selecione uma empresa válida.');
            return;
        }

        // Encontra o nome da empresa pelo ID
        const tenant = availableTenants.find(t => t.id === tId);
        if (!tenant) {
            showMessage('error', 'Empresa não encontrada.');
            return;
        }

        // Encontra o dispositivo para pegar nome e ala
        const device = mqttDevices.find(d => d.id === deviceId);

        try {
            // 1. Salva na API Java (vínculo para o dashboard)
            const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId: tId })
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || response.statusText);
            }

            // 2. Envia comando MQTT para o ESP32 gravar na EEPROM
            const mqttPayload = JSON.stringify({
                intencao: 'vincular_dispositivo',
                id: deviceId,
                dispositivo_id: deviceId,
                is_admin: true,
                source: 'dashboard',
                empresa: tenant.name,
                nome: device?.name || 'Sensor',
                ala: device?.location || 'Nao Definida'
            });
            mqttPublish('esp32c3/status/action', mqttPayload);

            updateDeviceLocal(deviceId, { tenantId: tId });

            showMessage('success', `Dispositivo vinculado à empresa ${tenant.name}!`);
        } catch (err: any) {
            showMessage('error', `Erro ao vincular: ${err.message}`);
        }
    };

    const toggleTenantForNewUser = (id: string) => {
        setNewUserTenants(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    // --- Funções de Gestão de Usuários ---
    const handleUpdateUserRole = async (userId: string, newRole: 'manager' | 'admin' | 'user') => {
        if (newRole === 'manager' && currentUser?.role !== 'manager' && currentUser?.role !== 'gestor') {
            showMessage('error', 'Apenas um Gestor pode promover outro a Gestor.');
            return;
        }

        try {
            const updatePayload: any = { role: newRole };
            if (newRole === 'manager') {
                updatePayload.tenantIds = [];
            } else if (newRole === 'user') {
                updatePayload.receiveNotifications = false;
                updatePayload.phone = null;
            }

            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `Erro HTTP ${response.status}`);
            }

            if (newRole === 'user') {
                await syncPhoneToUsersDevices(userId, null, false);
            }
            showMessage('success', `Cargo atualizado com sucesso!`);
        } catch (err: any) {
            showMessage('error', `Erro ao atualizar cargo: ${err.message}`);
        }
    };

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        if (!window.confirm(`Deseja realmente excluir o usuário ${userEmail}? Esta ação é IRREVERSÍVEL.`)) return;

        try {
            const result = await deleteUserCompletely(userId);
            if (result.warning) {
                console.warn('Aviso durante a exclusão:', result.warning);
            }
            showMessage('success', `Usuário ${userEmail} removido do sistema e Firebase.`);
        } catch (err: any) {
            showMessage('error', `Erro ao remover usuário: ${err.message}`);
        }
    };

    // Abre modal de edição
    const handleOpenEditUser = (user: any) => {
        setEditingUser(user);
        setEditUserName(user.name || '');
        setEditUserEmail(user.email || '');
        setEditUserWhatsapp(user.phone || '');
        setEditUserReceiveWhatsapp(user.receiveNotifications !== undefined ? user.receiveNotifications : (user.receive_notifications || false));
        setEditUserRole(user.role === 'gestor' ? 'manager' : (user.role || 'user'));
        setEditUserTenants(user.tenantIds || user.tenant_ids || []);
        setEditUserAllowedDevices(user.allowedDevices || user.allowed_devices || []);
    };

    // Salva edição de usuário
    const handleSaveUser = async () => {
        if (!editingUser) return;

        // Validação hierárquica
        if (editUserRole === 'manager' && currentUser?.role !== 'manager' && currentUser?.role !== 'gestor') {
            showMessage('error', 'Apenas um Gestor pode promover outro a Gestor.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editUserName,
                    email: editUserEmail.toLowerCase(),
                    phone: editUserRole === 'user' ? null : (editUserWhatsapp || null),
                    receiveNotifications: editUserRole === 'user' ? false : editUserReceiveWhatsapp,
                    role: editUserRole,
                    tenantIds: editUserRole === 'manager' ? [] : editUserTenants,
                    allowedDevices: editUserRole === 'user' ? editUserAllowedDevices : []
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `Erro HTTP ${response.status}`);
            }

            // Sincronizar telefone na tabela users_devices (para alertas WhatsApp via n8n)
            await syncPhoneToUsersDevices(editingUser.id, editUserRole === 'user' ? null : (editUserWhatsapp || null), editUserRole === 'user' ? false : editUserReceiveWhatsapp);

            showMessage('success', 'Usuário atualizado com sucesso!');
            setEditingUser(null);
            if (refreshUsers) refreshUsers();
        } catch (err: any) {
            showMessage('error', `Erro ao atualizar usuário: ${err.message}`);
        }
    };

    // Toggle empresa para usuário em edição
    const toggleTenantForEditUser = (id: string) => {
        setEditUserTenants(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    // --- Funções de Gestão de Empresas ---
    const handleUpdateCompanyName = async (id: string, oldName: string) => {
        const newName = window.prompt("Digite o novo nome da empresa:", oldName);
        if (!newName || newName === oldName) return;
        try {
            const response = await fetch(`${API_BASE_URL}/tenants/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `Erro HTTP ${response.status}`);
            }
            showMessage('success', 'Nome da empresa atualizado!');
        } catch (err: any) {
            showMessage('error', `Erro ao renomear: ${err.message}`);
        }
    };

    const handleDeleteCompany = async (id: string, name: string) => {
        if (!window.confirm(`Excluir a empresa "${name}"? Esta ação é irreversível.`)) return;
        try {
            const response = await fetch(`${API_BASE_URL}/tenants/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `Erro HTTP ${response.status}`);
            }
            showMessage('success', `Empresa "${name}" removida.`);
        } catch (err: any) {
            showMessage('error', `Erro ao remover empresa: ${err.message}`);
        }
    };

    const handleResetDevice = async (deviceId: string) => {
        if (!window.confirm("Deseja resetar o vínculo deste dispositivo? Ele voltará para a lista de pendentes e todas as configurações de nome e empresa serão removidas do hardware.")) return;

        try {
            // 1. Enviar comando MQTT para o hardware se desvincular internamente
            const mqttPayload = JSON.stringify({
                intencao: 'desvincular_dispositivo',
                id: deviceId,
                dispositivo_id: deviceId,
                is_admin: true,
                source: 'dashboard'
            });
            mqttPublish('esp32c3/status/action', mqttPayload);

            // 2. Atualizar a API Java para remover o vínculo com o tenant
            const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId: "" })
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `Erro HTTP ${response.status}`);
            }

            updateDeviceLocal(deviceId, { tenantId: 'Unknown' });

            showMessage('success', "Dispositivo desvinculado com sucesso. A tela foi atualizada para pendente.");
        } catch (err: any) {
            console.error("Erro ao resetar:", err);
            showMessage('error', `Erro ao resetar: ${err.message}`);
        }
    };

    const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
        if (!window.confirm(`ATENÇÃO: Deseja excluir definitivamente o dispositivo "${deviceName}" do banco de dados? Ele poderá reaparecer como pendente se continuar enviando dados.`)) return;
        try {
            const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `Erro HTTP ${response.status}`);
            }
            showMessage('success', "Dispositivo excluído com sucesso.");
        } catch (err: any) {
            showMessage('error', `Erro ao excluir: ${err.message}`);
        }
    };

    const handleToggleUserTenant = async (userId: string, tenantId: string, currentTenants: string[]) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        try {
            const isSelected = currentTenants.includes(tenantId);
            const updatedTenants = isSelected
                ? currentTenants.filter(id => id !== tenantId)
                : [...currentTenants, tenantId];

            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...user,
                    tenantIds: updatedTenants,
                    allowedDevices: user.allowed_devices || user.allowedDevices || [],
                    receiveNotifications: user.receive_notifications !== undefined ? user.receive_notifications : user.receiveNotifications
                })
            });
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || `Erro HTTP ${response.status}`);
            }
            if (refreshUsers) refreshUsers();
        } catch (err: any) {
            showMessage('error', `Erro ao atualizar empresas: ${err.message}`);
        }
    };

    if (currentUser?.role !== 'manager' && currentUser?.role !== 'gestor') {
        return (
            <div className="flex h-screen items-center justify-center bg-background-dark text-white p-6">
                <div className="text-center space-y-4 max-w-md bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-xl">
                    <ShieldCheck size={64} className="mx-auto text-rose-500" />
                    <h2 className="text-2xl font-bold">Acesso Restrito</h2>
                    <p className="text-slate-400">Esta área é exclusiva para Gestores do sistema. Seu cargo atual não permite acesso à administração global.</p>
                    <button onClick={() => onNavigate('dashboard')} className="px-6 py-2 bg-primary rounded-xl font-bold hover:bg-primary-dark transition-all">Voltar ao Início</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 h-screen flex flex-col bg-[#0A0C08] overflow-hidden">
            {/* Header Moderno */}
            <header className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-8 bg-black/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-2.5 rounded-2xl border border-primary/30">
                        <Settings2 size={24} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Administração Central</h1>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Painel do Gestor</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <AnimatePresence mode="wait">
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                    }`}
                            >
                                {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                {message.text}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className="btn-secondary flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft size={18} />
                        Sair da Administração
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Menu Lateral de Abas */}
                <aside className="w-64 border-r border-white/5 bg-black/20 p-6 flex flex-col gap-2">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Building2 size={18} />} label="Visão Geral" />
                    <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={18} />} label="Usuários" />
                    <TabButton active={activeTab === 'companies'} onClick={() => setActiveTab('companies')} icon={<Building size={18} />} label="Empresas" />
                    <TabButton active={activeTab === 'devices'} onClick={() => setActiveTab('devices')} icon={<Cpu size={18} />} label="Dispositivos" count={unlinkedDevices.length} />

                    <div className="mt-auto p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Sua Conta</p>
                        <div className="flex items-center gap-3">
                            <img src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser?.name}`} className="size-8 rounded-full" alt="Avatar" />
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{currentUser?.name}</p>
                                <p className="text-[9px] text-slate-500 uppercase font-bold">{currentUser?.role}</p>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Conteúdo Principal */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 sm:pb-8 custom-scrollbar 2xl:max-w-[1600px] 2xl:mx-auto w-full">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-6xl mx-auto"
                    >
                        {/* Modal de Edição de Usuário */}
                        <EditUserModal
                            isOpen={!!editingUser}
                            onClose={() => setEditingUser(null)}
                            name={editUserName}
                            setName={setEditUserName}
                            email={editUserEmail}
                            setEmail={setEditUserEmail}
                            whatsapp={editUserWhatsapp}
                            setWhatsapp={setEditUserWhatsapp}
                            receiveWhatsapp={editUserReceiveWhatsapp}
                            setReceiveWhatsapp={setEditUserReceiveWhatsapp}
                            role={editUserRole}
                            setRole={setEditUserRole}
                            tenants={editUserTenants}
                            allowedDevices={editUserAllowedDevices}
                            setAllowedDevices={setEditUserAllowedDevices}
                            assignableDevices={supabaseDevices.filter(d => editUserTenants.includes(d.tenantId))}
                            availableTenants={availableTenants}
                            onSave={handleSaveUser}
                            onToggleTenant={toggleTenantForEditUser}
                        />

                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard label="Total de Usuários" value={users.length} icon={<Users className="text-blue-500" />} />
                                <StatCard label="Empresas Ativas" value={availableTenants.length} icon={<Building className="text-emerald-500" />} />
                                <StatCard label="Disp. Pendentes" value={unlinkedDevices.length} icon={<Cpu className="text-orange-500" />} />

                                <div className="col-span-1 md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                                    <h3 className="text-lg font-bold text-white mb-6">Atividades Recentes</h3>
                                    <div className="space-y-6">
                                        <RecentItem icon={<UserPlus />} title="Novo usuário criado" detail="João Silva promovido a Admin pela Nikaotec" time="há 2 horas" />
                                        <RecentItem icon={<Building />} title="Nova empresa cadastrada" detail="Clínica Saúde Vital iniciou no plano Pro" time="há 5 horas" />
                                        <RecentItem icon={<Cpu />} title="Vínculo de hardware" detail="Sensor 02 Centro vinculado à Farmácia Central" time="há 1 dia" />
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 rounded-3xl p-8 flex flex-col justify-between">
                                    <div>
                                        <ShieldCheck size={32} className="text-primary mb-4" />
                                        <h3 className="text-xl font-bold text-white mb-2">Segurança Ativa</h3>
                                        <p className="text-sm text-slate-400 leading-relaxed">Todas as alterações de cargos e vínculos de dispositivos são auditadas em tempo real nos logs do sistema.</p>
                                    </div>
                                    <button className="w-full mt-8 py-3 rounded-2xl bg-primary text-white font-bold hover:bg-primary-dark transition-all">Ver Logs de Auditoria</button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Lista de Usuários */}
                                    <div className="lg:col-span-2 space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-bold text-white">Usuários Cadastrados</h3>
                                            <div className="relative">
                                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                                <input type="text" placeholder="Filtrar por nome ou e-mail..." className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white w-64 focus:outline-none focus:border-primary/50" />
                                            </div>
                                        </div>

                                        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-heading">Usuário</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-heading">Cargo</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-heading">Empresas</th>
                                                        <th className="px-6 py-4"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {loadingUsers ? (
                                                        <tr><td colSpan={4} className="p-10 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" /> Carregando usuários...</td></tr>
                                                    ) : users.map(u => (
                                                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                                        {u.name?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-white">{u.name || 'Sem nome'}</p>
                                                                        <p className="text-xs text-slate-500 font-medium">{u.email}</p>
                                                                        {(u.phone || u.whatsapp) && (
                                                                            <p className={`text-[10px] font-bold flex items-center gap-1 mt-1 ${(u.receiveNotifications || u.receive_notifications) ? 'text-primary' : 'text-slate-600'}`}>
                                                                                <Phone size={10} /> {u.phone || u.whatsapp} {(u.receiveNotifications || u.receive_notifications) ? '• Notifica' : ''}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <select
                                                                    value={u.role === 'gestor' ? 'manager' : u.role}
                                                                    onChange={(e) => handleUpdateUserRole(u.id, e.target.value as any)}
                                                                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-300 focus:outline-none focus:border-primary/50"
                                                                >
                                                                    <option value="user">USER</option>
                                                                    <option value="admin">ADMIN</option>
                                                                    <option value="manager">MANAGER</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {u.role === 'manager' || u.role === 'gestor' ? (
                                                                    <span className="text-[10px] text-slate-500 italic">Acesso Total</span>
                                                                ) : (
                                                                    <div className="relative">
                                                                        <div
                                                                            className="flex flex-wrap gap-1 max-w-[200px] cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                                                                            onClick={() => setOpenTenantPopoverFor(openTenantPopoverFor === u.id ? null : u.id)}
                                                                        >
                                                                            {(u.tenantIds || u.tenant_ids || []).length > 0 ? (u.tenantIds || u.tenant_ids).map((tid: string) => (
                                                                                <span key={tid} className="text-[9px] bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded text-primary font-bold">
                                                                                    {availableTenants.find(t => t.id === tid)?.name || tid}
                                                                                </span>
                                                                            )) : <span className="text-[10px] text-slate-600">Nenhuma empresa</span>}
                                                                            <div className={`size-5 rounded flex items-center justify-center ml-auto transition-all ${openTenantPopoverFor === u.id ? 'bg-primary text-white' : 'bg-white/10 text-slate-400'}`}>
                                                                                <Plus size={10} />
                                                                            </div>
                                                                        </div>

                                                                        {/* Popover de Seleção (Aparece no Clique) */}
                                                                        {openTenantPopoverFor === u.id && (
                                                                            <div className="absolute bottom-full left-0 mb-2 w-48 bg-background-dark border border-white/10 rounded-2xl p-3 shadow-2xl z-[100]">
                                                                                <p className="text-[9px] font-black text-slate-500 uppercase mb-2 px-1">Gerenciar Acesso</p>
                                                                                <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                                                                    {availableTenants.map(t => (
                                                                                        <button
                                                                                            key={t.id}
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleToggleUserTenant(u.id, t.id, u.tenantIds || u.tenant_ids || []);
                                                                                                setOpenTenantPopoverFor(null);
                                                                                            }}
                                                                                            className={`w-full flex items-center justify-between p-2 rounded-lg text-[10px] font-bold transition-all ${(u.tenantIds || u.tenant_ids || []).includes(t.id)
                                                                                                ? 'bg-primary/10 text-primary'
                                                                                                : 'text-slate-500 hover:bg-white/5'
                                                                                                }`}
                                                                                        >
                                                                                            {t.name}
                                                                                            {(u.tenantIds || u.tenant_ids || []).includes(t.id) && <CheckCircle2 size={12} />}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    onClick={() => handleOpenEditUser(u)}
                                                                    className="p-2 text-slate-500 hover:text-primary transition-all"
                                                                    title="Editar Usuário"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                                                    className="p-2 text-slate-500 hover:text-rose-500 transition-all"
                                                                    title="Remover Usuário"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Formulário Novo Usuário */}
                                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl h-fit sticky top-4">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                                                <UserPlus size={24} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">Novo Usuário</h3>
                                        </div>
                                        <form onSubmit={handleCreateUser} className="space-y-6">
                                            <FormInput label="Nome Completo" value={newUserName} onChange={setNewUserName} placeholder="Ex: João Silva" required />
                                            <FormInput label="E-mail" type="email" value={newUserEmail} onChange={setNewUserEmail} placeholder="joao@email.com" required />
                                            <FormInput
                                                label="WhatsApp (para alertas)"
                                                value={newUserWhatsapp}
                                                onChange={(val: string) => setNewUserWhatsapp(formatPhone(val))}
                                                placeholder={newUserRole === 'user' ? "Indisponível para Usuário" : "+55 81 99999-9999"}
                                                disabled={newUserRole === 'user'}
                                            />

                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
                                                <div>
                                                    <p className="text-sm font-bold text-white">Notificações WhatsApp</p>
                                                    <p className="text-[10px] text-slate-500">Enviar alertas críticos via WhatsApp</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={newUserRole === 'user'}
                                                    onClick={() => setNewUserReceiveWhatsapp(!newUserReceiveWhatsapp)}
                                                    className={`relative inline-flex h-6 w-12 rounded-full border-2 transition-colors ${newUserRole === 'user' ? 'opacity-30 cursor-not-allowed bg-[#0F110D] border-white/10' : (newUserReceiveWhatsapp ? 'bg-primary border-transparent' : 'bg-[#0F110D] border-white/10')}`}
                                                >
                                                    <span className={`h-5 w-5 transform rounded-full bg-white transition duration-200 ${newUserReceiveWhatsapp ? 'translate-x-6' : 'translate-x-0'}`}></span>
                                                </button>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Cargo do Sistema</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <RoleSlot active={newUserRole === 'manager'} onClick={() => setNewUserRole('manager')} label="Gestor" />
                                                    <RoleSlot active={newUserRole === 'admin'} onClick={() => setNewUserRole('admin')} label="Admin" />
                                                    <RoleSlot active={newUserRole === 'user'} onClick={() => setNewUserRole('user')} label="Usuário" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Empresas com Acesso</label>
                                                <div className="space-y-2 max-h-40 overflow-y-auto px-2 custom-scrollbar">
                                                    {availableTenants.map(t => (
                                                        <label key={t.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                                                            <div className={`size-5 rounded border ${newUserTenants.includes(t.id) ? 'bg-primary border-primary' : 'border-white/20'} flex items-center justify-center transition-all`}>
                                                                {newUserTenants.includes(t.id) && <CheckCircle2 size={12} className="text-white" />}
                                                            </div>
                                                            <input type="checkbox" className="hidden" checked={newUserTenants.includes(t.id)} onChange={() => toggleTenantForNewUser(t.id)} />
                                                            <span className="text-sm text-slate-400 group-hover:text-white transition-colors">{t.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {newUserRole === 'user' && (
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Dispositivos Permitidos</label>
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {supabaseDevices.filter(d => newUserTenants.includes(d.tenantId)).map((device: any) => (
                                                            <button
                                                                key={device.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setNewUserAllowedDevices(prev => prev.includes(device.id) ? prev.filter(id => id !== device.id) : [...prev, device.id]);
                                                                }}
                                                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${newUserAllowedDevices.includes(device.id)
                                                                    ? 'bg-primary/20 border-primary text-primary'
                                                                    : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20'
                                                                    }`}
                                                            >
                                                                {device.name || device.id}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {newUserAllowedDevices.length === 0 && <p className="text-[9px] text-rose-500/70 font-medium">* Se nenhum for selecionado, o painel do usuário ficará vazio.</p>}
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={submitting || newUserTenants.length === 0}
                                                className="w-full py-4 mt-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                            >
                                                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Provisionar Usuário'}
                                            </button>
                                        </form>

                                        {/* Exibição de Credenciais no ManagerPanel */}
                                        <AnimatePresence>
                                            {generatedCredentials && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className="mt-6 p-5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl relative overflow-hidden"
                                                >
                                                    <div className="absolute top-0 right-0 p-2">
                                                        <button
                                                            onClick={() => setGeneratedCredentials(null)}
                                                            className="text-slate-500 hover:text-white transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="size-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                                            <CheckCircle2 size={16} className="text-indigo-400" />
                                                        </div>
                                                        <h4 className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">Acesso Criado</h4>
                                                    </div>

                                                    <div className="space-y-2 bg-black/40 p-3 rounded-xl border border-white/5">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-[10px] font-bold text-slate-500">EMAIL</span>
                                                            <span className="text-white font-mono">{generatedCredentials.email}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-[10px] font-bold text-slate-500">SENHA</span>
                                                            <span className="text-indigo-400 font-mono font-bold">{generatedCredentials.pass}</span>
                                                        </div>
                                                        <div className="pt-2 mt-2 border-t border-white/5 text-center">
                                                            <p className="text-[9px] text-slate-500 mb-1 uppercase font-bold">Início Rápido</p>
                                                            <a
                                                                href={window.location.origin}
                                                                target="_blank"
                                                                className="text-blue-400 text-[10px] font-mono hover:underline truncate block"
                                                            >
                                                                {window.location.origin}
                                                            </a>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'companies' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <h3 className="text-xl font-bold text-white mb-6">Empresas Gerenciadas</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {availableTenants.map(t => (
                                            <div key={t.id} className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between group hover:border-primary/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                                        <Building size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{t.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">ID: {t.id}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => handleUpdateCompanyName(t.id, t.name)}
                                                        className="p-2 text-slate-500 hover:text-white transition-all"
                                                        title="Renomear Empresa"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCompany(t.id, t.name)}
                                                        className="p-2 text-slate-500 hover:text-rose-500 transition-all"
                                                        title="Excluir Empresa"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl h-fit">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                                            <Plus size={24} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white">Nova Empresa</h3>
                                    </div>
                                    <form onSubmit={handleCreateCompany} className="space-y-6">
                                        <FormInput label="Nome da Organização" value={newCompanyName} onChange={setNewCompanyName} placeholder="Ex: Farmácia Central" required />
                                        <button type="submit" className="w-full py-4 mt-2 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all">
                                            Cadastrar Empresa
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {activeTab === 'devices' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Hardware Pendente</h3>
                                        <p className="text-sm text-slate-500 mt-1">Dispositivos ESP32 detectados no MQTT que ainda não possuem dono definido.</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <div className="size-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs font-bold text-emerald-400">Escaneando Broker...</span>
                                    </div>
                                </div>

                                {mqttDevices.length === 0 ? (
                                    <div className="py-20 text-center bg-white/5 rounded-3xl border border-white/10">
                                        <Cpu size={48} className="mx-auto text-slate-700 mb-4" />
                                        <p className="text-slate-500">Nenhum dispositivo detectado no sistema.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {mqttDevices.map(dev => {
                                            const isLinked = dev.tenantId && dev.tenantId !== "Unknown" && dev.tenantId !== "empresa_default" && dev.tenantId !== "Nikaotec";
                                            return (
                                                <div key={dev.id} className={`bg-white/5 border rounded-3xl p-6 group transition-all flex flex-col ${isLinked ? 'border-indigo-500/20' : 'border-orange-500/20 hover:border-orange-500/40'}`}>
                                                    <div className="flex items-start justify-between mb-6">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-3 rounded-2xl ${isLinked ? 'bg-indigo-500/10 text-indigo-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                                    <Cpu size={24} />
                                                                </div>
                                                                {/* Botão de Silenciar Alertas Offline */}
                                                                <button
                                                                    onClick={() => handleToggleOfflinePause(dev.id)}
                                                                    className={`p-2 rounded-xl border transition-all duration-300 ${pausedDevices[dev.id]
                                                                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                                                                        : 'bg-black/40 border-white/5 text-slate-500 hover:text-slate-300'
                                                                        }`}
                                                                    title={pausedDevices[dev.id] ? "Alertas Offline Pausados" : "Pausar Alertas Offline"}
                                                                >
                                                                    {pausedDevices[dev.id] ? <BellOff size={18} /> : <Bell size={18} />}
                                                                </button>
                                                            </div>
                                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${isLinked ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                                {isLinked ? availableTenants.find(t => t.id === dev.tenantId)?.name || 'Vinculado' : 'Aguardando Vínculo'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mb-8">
                                                        <p className="text-lg font-bold text-white">{dev.name || 'Dispositivo sem Nome'}</p>
                                                        <p className="text-xs text-slate-500 font-mono mt-1">UUID: {dev.id}</p>
                                                    </div>

                                                    <div className="mt-auto space-y-4">
                                                        {!isLinked ? (
                                                            <div className="space-y-2">
                                                                <select
                                                                    value={selectedTenants[dev.id] || ""}
                                                                    onChange={(e) => setSelectedTenants({ ...selectedTenants, [dev.id]: e.target.value })}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50"
                                                                >
                                                                    <option value="">Delegar para empresa...</option>
                                                                    {availableTenants.map(t => (
                                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                                    ))}
                                                                </select>
                                                                <div className="grid grid-cols-4 gap-2">
                                                                    <button
                                                                        onClick={() => handleLinkDevice(dev.id)}
                                                                        className="col-span-3 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                                                                    >
                                                                        <CheckCircle2 size={16} /> Ativar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteDevice(dev.id, dev.name)}
                                                                        className="col-span-1 py-3 border border-rose-500/20 text-rose-500 font-bold rounded-xl hover:bg-rose-500/10 transition-all flex items-center justify-center"
                                                                        title="Excluir"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button
                                                                    onClick={() => handleResetDevice(dev.id)}
                                                                    className="w-full py-3 border border-white/10 text-slate-400 font-bold rounded-xl hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <ArrowLeft size={16} /> Resetar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteDevice(dev.id, dev.name)}
                                                                    className="w-full py-3 border border-rose-500/20 text-rose-500 font-bold rounded-xl hover:bg-rose-500/10 hover:border-rose-500/40 transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <Trash2 size={16} /> Excluir
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </main>
            </div>
        </div>
    );
};

// Sub-componentes para Limpeza do Código
const TabButton = ({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count?: number }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-300 group ${active ? 'bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5' : 'text-slate-500 hover:bg-white/5 hover:text-white'
            }`}
    >
        <div className="flex items-center gap-3 font-bold text-sm">
            {icon}
            {label}
        </div>
        {count !== undefined && count > 0 && (
            <span className="size-5 rounded-full bg-orange-500 text-[10px] text-white flex items-center justify-center font-black animate-pulse">{count}</span>
        )}
    </button>
);

const StatCard = ({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) => (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

const RecentItem = ({ icon, title, detail, time }: { icon: React.ReactNode, title: string, detail: string, time: string }) => (
    <div className="flex items-start gap-4 group">
        <div className="size-10 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors border border-white/5 shrink-0">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-bold text-white">{title}</p>
                <span className="text-[10px] text-slate-600 italic">{time}</span>
            </div>
            <p className="text-xs text-slate-500 truncate">{detail}</p>
        </div>
    </div>
);

const FormInput = ({ label, value, onChange, placeholder, type = 'text', required = false, disabled = false }: any) => (
    <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</label>
        <input
            type={type}
            required={required}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            placeholder={placeholder}
        />
    </div>
);

const RoleSlot = ({ active, onClick, label }: any) => (
    <button
        type="button"
        onClick={onClick}
        className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${active ? 'bg-primary/20 border-primary text-primary' : 'bg-black/20 border-white/10 text-slate-600 hover:border-white/20'
            }`}
    >
        {label}
    </button>
);

// Modal de Edição de Usuário
const EditUserModal = ({
    isOpen,
    onClose,
    name,
    setName,
    email,
    setEmail,
    whatsapp,
    setWhatsapp,
    receiveWhatsapp,
    setReceiveWhatsapp,
    role,
    setRole,
    tenants,
    allowedDevices,
    setAllowedDevices,
    assignableDevices,
    availableTenants,
    onSave,
    onToggleTenant
}: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1A1D17] border border-white/10 rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                            <Edit2 size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white">Editar Usuário</h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-5">
                    <FormInput label="Nome Completo" value={name} onChange={setName} placeholder="Ex: João Silva" required />
                    <FormInput label="E-mail" type="email" value={email} onChange={setEmail} placeholder="joao@email.com" required />

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">WhatsApp</label>
                        <input
                            type="tel"
                            value={whatsapp}
                            disabled={role === 'user'}
                            onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            placeholder={role === 'user' ? "Indisponível para Usuário" : "+55 81 99999-9999"}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
                        <div>
                            <p className="text-sm font-bold text-white">Notificações WhatsApp</p>
                            <p className="text-[10px] text-slate-500">O usuário receberá alertas via WhatsApp</p>
                        </div>
                        <button
                            type="button"
                            disabled={role === 'user'}
                            onClick={() => setReceiveWhatsapp(!receiveWhatsapp)}
                            className={`relative inline-flex h-6 w-12 rounded-full border-2 transition-colors ${role === 'user' ? 'opacity-30 cursor-not-allowed bg-[#0F110D] border-white/10' : (receiveWhatsapp ? 'bg-primary border-transparent' : 'bg-[#0F110D] border-white/10')}`}
                        >
                            <span className={`h-5 w-5 transform rounded-full bg-white transition duration-200 ${receiveWhatsapp ? 'translate-x-6' : 'translate-x-0'}`}></span>
                        </button>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Cargo do Sistema</label>
                        <div className="grid grid-cols-3 gap-2">
                            <RoleSlot active={role === 'manager'} onClick={() => setRole('manager')} label="Gestor" />
                            <RoleSlot active={role === 'admin'} onClick={() => setRole('admin')} label="Admin" />
                            <RoleSlot active={role === 'user'} onClick={() => setRole('user')} label="Usuário" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Empresas com Acesso</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto px-2 custom-scrollbar">
                            {availableTenants.map((t: any) => (
                                <label key={t.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                                    <div className={`size-5 rounded border ${tenants.includes(t.id) ? 'bg-primary border-primary' : 'border-white/20'} flex items-center justify-center transition-all`}>
                                        {tenants.includes(t.id) && <CheckCircle2 size={12} className="text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={tenants.includes(t.id)} onChange={() => onToggleTenant(t.id)} />
                                    <span className="text-sm text-slate-400 group-hover:text-white transition-colors">{t.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {role === 'user' && (
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Dispositivos Permitidos</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {assignableDevices.map((device: any) => (
                                    <button
                                        key={device.id}
                                        type="button"
                                        onClick={() => setAllowedDevices((prev: string[]) => prev.includes(device.id) ? prev.filter(id => id !== device.id) : [...prev, device.id])}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${allowedDevices?.includes(device.id)
                                            ? 'bg-primary/20 border-primary text-primary'
                                            : 'bg-black/20 border-white/10 text-slate-500 hover:border-white/20'
                                            }`}
                                    >
                                        {device.name || device.id}
                                    </button>
                                ))}
                            </div>
                            {(!allowedDevices || allowedDevices.length === 0) && <p className="text-[9px] text-rose-500/70 font-medium">* Se nenhum for selecionado, o painel do usuário ficará vazio.</p>}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-4 border border-white/10 text-slate-400 font-bold rounded-2xl hover:bg-white/5 transition-all">
                        Cancelar
                    </button>
                    <button onClick={onSave} className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
                        Salvar Alterações
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ManagerPanel;
