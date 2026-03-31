import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/config';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useMqttData } from '../hooks/useMqttData';
import { useSupabaseData, useUsers } from '../hooks/useSupabaseData';
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
    Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ManagerPanelProps {
    onNavigate: (screen: 'dashboard' | 'device-list' | 'alerts' | 'reports' | 'settings' | 'device-details' | 'manager-panel') => void;
}

type Tab = 'overview' | 'users' | 'companies' | 'devices';

const ManagerPanel: React.FC<ManagerPanelProps> = ({ onNavigate }) => {
    const { availableTenants } = useTenant();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    // Data hooks
    const { users, isLoading: loadingUsers } = useUsers(currentUser?.role);
    const { devices: supabaseDevices } = useSupabaseData('all', undefined, currentUser?.role);
    const { devices: mqttDevices } = useMqttData('all', currentUser?.role, supabaseDevices);

    const [selectedTenants, setSelectedTenants] = useState<{ [key: string]: string }>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [openTenantPopoverFor, setOpenTenantPopoverFor] = useState<string | null>(null);

    // Form States
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState<'manager' | 'admin' | 'user'>('user');
    const [newUserTenants, setNewUserTenants] = useState<string[]>([]);

    const unlinkedDevices = mqttDevices.filter(d => {
        const tid = d.tenantId || (d as any).tenant_id;
        return !tid || tid === "Unknown" || tid === "empresa_default" || tid === "Nikaotec";
    });

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
            const { error } = await supabase.from('tenants').insert({
                name: newCompanyName.trim(),
                created_at: new Date().toISOString()
            });
            if (error) throw error;
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

        try {
            // Provisiona usuário por e-mail no Supabase
            const { error } = await supabase.from('users').upsert({
                id: newUserEmail.toLowerCase(),
                name: newUserName,
                email: newUserEmail.toLowerCase(),
                role: newUserRole,
                tenant_ids: newUserTenants,
                created_at: new Date().toISOString(),
                provisioned_by: currentUser?.email
            });
            if (error) throw error;

            showMessage('success', `Usuário ${newUserName} provisionado com sucesso!`);
            setNewUserName('');
            setNewUserEmail('');
            setNewUserRole('user');
            setNewUserTenants([]);
        } catch (err: any) {
            showMessage('error', `Erro ao criar usuário: ${err.message}`);
        }
    };

    const handleLinkDevice = async (deviceId: string) => {
        const tId = selectedTenants[deviceId];
        if (!tId) {
            showMessage('error', 'Selecione uma empresa válida.');
            return;
        }

        try {
            const { error } = await supabase.from('devices_status').upsert({
                id: deviceId,
                tenant_id: tId
            });
            if (error) throw error;
            showMessage('success', 'Dispositivo vinculado com sucesso!');
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
            const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
            if (error) throw error;
            showMessage('success', `Cargo atualizado com sucesso!`);
        } catch (err: any) {
            showMessage('error', `Erro ao atualizar cargo: ${err.message}`);
        }
    };

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        if (!window.confirm(`Deseja realmente excluir o usuário ${userEmail}?`)) return;
        try {
            const { error } = await supabase.from('users').delete().eq('id', userId);
            if (error) throw error;
            showMessage('success', `Usuário ${userEmail} removido.`);
        } catch (err: any) {
            showMessage('error', `Erro ao remover usuário: ${err.message}`);
        }
    };

    // --- Funções de Gestão de Empresas ---
    const handleUpdateCompanyName = async (id: string, oldName: string) => {
        const newName = window.prompt("Digite o novo nome da empresa:", oldName);
        if (!newName || newName === oldName) return;
        try {
            const { error } = await supabase.from('tenants').update({ name: newName }).eq('id', id);
            if (error) throw error;
            showMessage('success', 'Nome da empresa atualizado!');
        } catch (err: any) {
            showMessage('error', `Erro ao renomear: ${err.message}`);
        }
    };

    const handleDeleteCompany = async (id: string, name: string) => {
        if (!window.confirm(`Excluir a empresa "${name}"? Esta ação é irreversível.`)) return;
        try {
            const { error } = await supabase.from('tenants').delete().eq('id', id);
            if (error) throw error;
            showMessage('success', `Empresa "${name}" removida.`);
        } catch (err: any) {
            showMessage('error', `Erro ao remover empresa: ${err.message}`);
        }
    };

    // --- Funções de Gestão de Dispositivos ---
    const handleResetDevice = async (deviceId: string) => {
        if (!window.confirm("Deseja resetar o vínculo deste dispositivo? Ele voltará para a lista de pendentes.")) return;
        try {
            const { error } = await supabase.from('devices_status').update({
                tenant_id: 'Nikaotec'
            }).eq('id', deviceId);
            if (error) throw error;
            showMessage('success', "Vínculo do dispositivo resetado.");
        } catch (err: any) {
            showMessage('error', `Erro ao resetar: ${err.message}`);
        }
    };

    const handleToggleUserTenant = async (userId: string, tenantId: string, currentTenants: string[]) => {
        try {
            const isSelected = currentTenants.includes(tenantId);
            const updatedTenants = isSelected
                ? currentTenants.filter(id => id !== tenantId)
                : [...currentTenants, tenantId];

            const { error } = await supabase.from('users').update({
                tenant_ids: updatedTenants
            }).eq('id', userId);
            if (error) throw error;
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
            <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 bg-black/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
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
                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-6xl mx-auto"
                    >
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
                                                                            {u.tenant_ids?.length > 0 ? u.tenant_ids.map((tid: string) => (
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
                                                                                                handleToggleUserTenant(u.id, t.id, u.tenant_ids || []);
                                                                                            }}
                                                                                            className={`w-full flex items-center justify-between p-2 rounded-lg text-[10px] font-bold transition-all ${(u.tenant_ids || []).includes(t.id)
                                                                                                ? 'bg-primary/10 text-primary'
                                                                                                : 'text-slate-500 hover:bg-white/5'
                                                                                                }`}
                                                                                        >
                                                                                            {t.name}
                                                                                            {(u.tenant_ids || []).includes(t.id) && <CheckCircle2 size={12} />}
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

                                            <button type="submit" className="w-full py-4 mt-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
                                                Provisionar Usuário
                                            </button>
                                        </form>
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
                                                        <div className={`p-3 rounded-2xl ${isLinked ? 'bg-indigo-500/10 text-indigo-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                            <Cpu size={24} />
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${isLinked ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                            {isLinked ? availableTenants.find(t => t.id === dev.tenantId)?.name || 'Vinculado' : 'Aguardando Vínculo'}
                                                        </span>
                                                    </div>
                                                    <div className="mb-8">
                                                        <p className="text-lg font-bold text-white">{dev.name || 'Dispositivo sem Nome'}</p>
                                                        <p className="text-xs text-slate-500 font-mono mt-1">UUID: {dev.id}</p>
                                                    </div>

                                                    <div className="mt-auto space-y-4">
                                                        {!isLinked ? (
                                                            <>
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
                                                                <button
                                                                    onClick={() => handleLinkDevice(dev.id)}
                                                                    className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                                                                >
                                                                    <CheckCircle2 size={16} /> Confirmar Ativação
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleResetDevice(dev.id)}
                                                                className="w-full py-3 border border-white/10 text-slate-400 font-bold rounded-xl hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2"
                                                            >
                                                                <ArrowLeft size={16} /> Resetar Vínculo
                                                            </button>
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

const FormInput = ({ label, value, onChange, placeholder, type = 'text', required = false }: any) => (
    <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</label>
        <input
            type={type}
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-700"
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

export default ManagerPanel;
