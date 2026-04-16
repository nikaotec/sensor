import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/config';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useUsers } from '../hooks/useSupabaseData';
import {
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    Users,
    Search,
    Loader2,
    Trash2,
    Edit2,
    Phone,
    X,
    UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Máscara de telefone: +55 81 99999-9999
const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 0) return '';
    const limited = digits.slice(0, 13);
    let result = '+' + limited;
    if (limited.length > 2) result = '+' + limited.slice(0, 2) + ' ' + limited.slice(2);
    if (limited.length > 4) result = '+' + limited.slice(0, 2) + ' ' + limited.slice(2, 4) + ' ' + limited.slice(4);
    if (limited.length > 9) result = '+' + limited.slice(0, 2) + ' ' + limited.slice(2, 4) + ' ' + limited.slice(4, 9) + '-' + limited.slice(9);
    return result;
};

const handlePhoneChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(formatPhone(e.target.value));
};

interface AdminUserPanelProps {
    onNavigate: (screen: any) => void;
}

const AdminUserPanel: React.FC<AdminUserPanelProps> = ({ onNavigate }) => {
    const { currentUser } = useAuth();
    const { availableTenants } = useTenant();
    const { users, isLoading: loadingUsers } = useUsers(currentUser?.role);

    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [openTenantPopoverFor, setOpenTenantPopoverFor] = useState<string | null>(null);

    // Form States
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserPhone, setNewUserPhone] = useState('');
    const [newUserWhatsapp, setNewUserWhatsapp] = useState('');
    const [newUserReceiveWhatsapp, setNewUserReceiveWhatsapp] = useState(false);
    const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
    const [newUserTenants, setNewUserTenants] = useState<string[]>([]);

    // Edit Modal States
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editUserName, setEditUserName] = useState('');
    const [editUserEmail, setEditUserEmail] = useState('');
    const [editUserPhone, setEditUserPhone] = useState('');
    const [editUserWhatsapp, setEditUserWhatsapp] = useState('');
    const [editUserReceiveWhatsapp, setEditUserReceiveWhatsapp] = useState(false);
    const [editUserRole, setEditUserRole] = useState<'admin' | 'user'>('user');
    const [editUserTenants, setEditUserTenants] = useState<string[]>([]);

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

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserEmail || !newUserName) return;

        try {
            const { error } = await supabase.from('users').upsert({
                id: newUserEmail.toLowerCase(),
                name: newUserName,
                email: newUserEmail.toLowerCase(),
                phone: newUserPhone || null,
                whatsapp: newUserWhatsapp || null,
                receive_notifications: newUserReceiveWhatsapp,
                role: newUserRole,
                tenant_ids: newUserTenants,
                created_at: new Date().toISOString(),
                provisioned_by: currentUser?.email
            });
            if (error) throw error;

            showMessage('success', `Usuário ${newUserName} provisionado com sucesso!`);
            setNewUserName('');
            setNewUserEmail('');
            setNewUserPhone('');
            setNewUserWhatsapp('');
            setNewUserReceiveWhatsapp(false);
            setNewUserRole('user');
            setNewUserTenants([]);
            // refreshUsers(); // Removed
        } catch (err: any) {
            showMessage('error', `Erro ao criar usuário: ${err.message}`);
        }
    };

    const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
        try {
            const { error: roleError } = await supabase
                .from('users')
                .update({ role: newRole, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (roleError) throw roleError;
            showMessage('success', 'Cargo atualizado com sucesso!');
            // refreshUsers(); // Removed
        } catch (err: any) {
            showMessage('error', `Erro ao atualizar cargo: ${err.message}`);
        }
    };

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        if (!window.confirm(`Tem certeza que deseja remover o acesso de ${userEmail}?`)) return;
        try {
            const { error } = await supabase.from('users').delete().eq('id', userId);
            if (error) throw error;
            showMessage('success', 'Usuário removido do sistema.');
            // refreshUsers(); // Removed
        } catch (err: any) {
            showMessage('error', `Erro ao remover usuário: ${err.message}`);
        }
    };

    const handleOpenEditUser = (user: any) => {
        setEditingUser(user);
        setEditUserName(user.name || '');
        setEditUserEmail(user.email || '');
        setEditUserPhone(user.phone || '');
        setEditUserWhatsapp(user.whatsapp || '');
        setEditUserReceiveWhatsapp(user.receive_notifications || false);
        setEditUserRole(user.role || 'user');
        setEditUserTenants(user.tenant_ids || []);
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    name: editUserName,
                    email: editUserEmail.toLowerCase(),
                    phone: editUserPhone || null,
                    whatsapp: editUserWhatsapp || null,
                    receive_notifications: editUserReceiveWhatsapp,
                    role: editUserRole,
                    tenant_ids: editUserTenants,
                    updated_at: new Date().toISOString()
                }).eq('id', editingUser.id);

            if (error) throw error;
            showMessage('success', 'Usuário atualizado!');
            setEditingUser(null);
            // refreshUsers(); // Removed
        } catch (err: any) {
            showMessage('error', `Erro ao salvar: ${err.message}`);
        }
    };

    const toggleTenantForEditUser = (id: string) => {
        setEditUserTenants(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const handleToggleUserTenant = async (userId: string, tenantId: string, currentTenants: string[]) => {
        const isSelected = currentTenants.includes(tenantId);
        const newTenants = isSelected ? currentTenants.filter(id => id !== tenantId) : [...currentTenants, tenantId];

        try {
            const { error } = await supabase.from('users').update({ tenant_ids: newTenants }).eq('id', userId);
            if (error) throw error;
            // refreshUsers(); // Removed
        } catch (err: any) {
            showMessage('error', `Erro ao atualizar empresas: ${err.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-background-dark flex flex-col">
            <header className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-8 bg-black/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/20 p-2.5 rounded-2xl border border-primary/30">
                        <Users size={24} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Gestão de Usuários</h1>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Painel Administrativo</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <AnimatePresence mode="wait">
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}
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
                        Voltar ao Dashboard
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 sm:pb-8 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Lista de Usuários */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">Usuários do Sistema</h3>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input type="text" placeholder="Filtrar..." className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white w-64 focus:outline-none focus:border-primary/50" />
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.02]">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuário</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cargo</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Empresas</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loadingUsers ? (
                                            <tr><td colSpan={4} className="p-10 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" /> Carregando...</td></tr>
                                        ) : users.map(u => (
                                            <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                            {u.name?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{u.name || 'Sem nome'}</p>
                                                            <p className="text-xs text-slate-500">{u.email}</p>
                                                            {u.whatsapp && (
                                                                <p className={`text-[10px] font-bold flex items-center gap-1 mt-1 ${u.receive_notifications ? 'text-primary' : 'text-slate-600'}`}>
                                                                    <Phone size={10} /> {u.whatsapp} {u.receive_notifications ? '• Notifica' : ''}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={u.role}
                                                        disabled={u.role === 'manager' || u.role === 'gestor'}
                                                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value as any)}
                                                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-300 focus:outline-none disabled:opacity-50"
                                                    >
                                                        <option value="user">USUÁRIO</option>
                                                        <option value="admin">ADMIN</option>
                                                        {(u.role === 'manager' || u.role === 'gestor') && <option value={u.role}>GESTOR</option>}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="relative">
                                                        <div
                                                            className="flex flex-wrap gap-1 max-w-[200px] cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-colors"
                                                            onClick={() => setOpenTenantPopoverFor(openTenantPopoverFor === u.id ? null : u.id)}
                                                        >
                                                            {u.tenant_ids?.length > 0 ? u.tenant_ids.map((tid: string) => (
                                                                <span key={tid} className="text-[9px] bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded text-primary font-bold">
                                                                    {availableTenants.find(t => t.id === tid)?.name || tid}
                                                                </span>
                                                            )) : <span className="text-[10px] text-slate-600">Nenhuma</span>}
                                                        </div>
                                                        {openTenantPopoverFor === u.id && (
                                                            <div ref={popoverRef} className="absolute bottom-full left-0 mb-2 w-48 bg-background-dark border border-white/10 rounded-2xl p-3 shadow-2xl z-[100]">
                                                                <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                                                    {availableTenants.map(t => (
                                                                        <button
                                                                            key={t.id}
                                                                            onClick={() => handleToggleUserTenant(u.id, t.id, u.tenant_ids || [])}
                                                                            className={`w-full flex items-center justify-between p-2 rounded-lg text-[10px] font-bold ${(u.tenant_ids || []).includes(t.id) ? 'bg-primary/10 text-primary' : 'text-slate-500'}`}
                                                                        >
                                                                            {t.name}
                                                                            {(u.tenant_ids || []).includes(t.id) && <CheckCircle2 size={12} />}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleOpenEditUser(u)} className="p-2 text-slate-500 hover:text-primary transition-all"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteUser(u.id, u.email)} className="p-2 text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Formulário Novo Usuário */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl h-fit">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 rounded-2xl bg-primary/10 text-primary"><UserPlus size={24} /></div>
                                <h3 className="text-xl font-bold text-white">Novo Usuário</h3>
                            </div>
                            <form onSubmit={handleCreateUser} className="space-y-5">
                                <FormInput label="Nome" value={newUserName} onChange={setNewUserName} placeholder="João Silva" required />
                                <FormInput label="E-mail" type="email" value={newUserEmail} onChange={setNewUserEmail} placeholder="joao@email.com" required />
                                <FormInput label="WhatsApp" value={newUserWhatsapp} onChange={handlePhoneChange(setNewUserWhatsapp)} placeholder="+55 81 99999-9999" />

                                <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                                    <div className="text-sm font-bold text-white">Notificações WhatsApp</div>
                                    <button
                                        type="button"
                                        onClick={() => setNewUserReceiveWhatsapp(!newUserReceiveWhatsapp)}
                                        className={`relative inline-flex h-6 w-12 rounded-full border-2 transition-colors ${newUserReceiveWhatsapp ? 'bg-primary border-transparent' : 'bg-[#0F110D] border-white/10'}`}
                                    >
                                        <span className={`h-5 w-5 transform rounded-full bg-white transition duration-200 ${newUserReceiveWhatsapp ? 'translate-x-6' : 'translate-x-0'}`}></span>
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-3">Cargo</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setNewUserRole('admin')} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${newUserRole === 'admin' ? 'bg-primary/20 border-primary text-primary' : 'bg-black/20 border-white/10 text-slate-600'}`}>Admin</button>
                                        <button type="button" onClick={() => setNewUserRole('user')} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${newUserRole === 'user' ? 'bg-primary/20 border-primary text-primary' : 'bg-black/20 border-white/10 text-slate-600'}`}>Usuário</button>
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-4 mt-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
                                    Provisionar
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            <EditUserModal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                name={editUserName}
                setName={setEditUserName}
                email={editUserEmail}
                setEmail={setEditUserEmail}
                phone={editUserPhone}
                setPhone={setEditUserPhone}
                whatsapp={editUserWhatsapp}
                setWhatsapp={setEditUserWhatsapp}
                receiveWhatsapp={editUserReceiveWhatsapp}
                setReceiveWhatsapp={setEditUserReceiveWhatsapp}
                role={editUserRole}
                setRole={setEditUserRole}
                tenants={editUserTenants}
                availableTenants={availableTenants}
                onSave={handleSaveUser}
                onToggleTenant={toggleTenantForEditUser}
            />
        </div>
    );
};

const FormInput = ({ label, value, onChange, placeholder, type = 'text', required = false }: any) => (
    <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-700"
            placeholder={placeholder}
            required={required}
        />
    </div>
);

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
    onSave
}: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1A1D17] border border-white/10 rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Editar Usuário</h3>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X size={20} /></button>
                </div>

                <div className="space-y-5">
                    <FormInput label="Nome" value={name} onChange={setName} placeholder="Nome" required />
                    <FormInput label="E-mail" value={email} onChange={setEmail} placeholder="E-mail" required />
                    <FormInput label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="WhatsApp" />

                    <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                        <div className="text-sm font-bold text-white">Notificações WhatsApp</div>
                        <button
                            onClick={() => setReceiveWhatsapp(!receiveWhatsapp)}
                            className={`relative inline-flex h-6 w-12 rounded-full border-2 transition-colors ${receiveWhatsapp ? 'bg-primary border-transparent' : 'bg-[#0F110D] border-white/10'}`}
                        >
                            <span className={`h-5 w-5 transform rounded-full bg-white transition duration-200 ${receiveWhatsapp ? 'translate-x-6' : 'translate-x-0'}`}></span>
                        </button>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-3">Cargo</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setRole('admin')} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${role === 'admin' ? 'bg-primary/20 border-primary text-primary' : 'bg-black/20 border-white/10 text-slate-600'}`}>Admin</button>
                            <button type="button" onClick={() => setRole('user')} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${role === 'user' ? 'bg-primary/20 border-primary text-primary' : 'bg-black/20 border-white/10 text-slate-600'}`}>Usuário</button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-4 border border-white/10 text-slate-400 font-bold rounded-2xl">Cancelar</button>
                    <button onClick={onSave} className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20">Salvar</button>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminUserPanel;
