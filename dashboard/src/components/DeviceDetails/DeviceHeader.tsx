import React, { useState } from 'react';
import { ArrowLeft, Edit3, Save, X, Settings as SettingsIcon } from 'lucide-react';
import type { Device } from '../../domain/entities/Device';

interface DeviceHeaderProps {
    device: Device | undefined;
    currentUser: any;
    availableTenants: any[] | undefined;
    onNavigate: (screen: any) => void;
    onUpdateName: (newName: string) => Promise<void>;
}

const DeviceHeader: React.FC<DeviceHeaderProps> = ({
    device,
    currentUser,
    availableTenants,
    onNavigate,
    onUpdateName
}) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [newDeviceName, setNewDeviceName] = useState('');
    const [isChangingName, setIsChangingName] = useState(false);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'online': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'offline': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-slate-700 text-slate-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'online': return 'ESTÁVEL';
            case 'warning': return 'ALERTA';
            case 'error': return 'ERRO';
            case 'offline': return 'OFFLINE';
            default: return status.toUpperCase();
        }
    };

    const handleSaveName = async () => {
        if (!newDeviceName.trim()) return;
        setIsChangingName(true);
        try {
            await onUpdateName(newDeviceName.trim());
            setIsEditingName(false);
        } catch (error) {
            console.error('Erro ao mudar nome no componente:', error);
        } finally {
            setIsChangingName(false);
        }
    };

    return (
        <header className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-8 bg-[#1A1D17]/80 backdrop-blur-md border-b border-[#2A2E24] sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-4">
                <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-[#2A2E24]/50 rounded-xl transition-colors text-slate-400 hover:text-white">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col">
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newDeviceName}
                                onChange={(e) => setNewDeviceName(e.target.value)}
                                maxLength={31}
                                placeholder="Novo nome..."
                                className="bg-[#0a0c08] border border-primary/50 rounded-lg px-3 py-1.5 text-white text-lg font-bold w-48 focus:border-primary outline-none"
                                autoFocus
                            />
                            <button
                                onClick={handleSaveName}
                                disabled={isChangingName || !newDeviceName.trim()}
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                            >
                                <Save size={18} />
                            </button>
                            <button
                                onClick={() => { setIsEditingName(false); setNewDeviceName(''); }}
                                className="p-1.5 text-slate-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold leading-none text-white tracking-tight">{device?.name || 'Dispositivo'}</h2>
                            {(currentUser?.role === 'gestor' || currentUser?.role === 'manager' || currentUser?.role === 'admin') && (
                                <button
                                    onClick={() => { setIsEditingName(true); setNewDeviceName(device?.name || ''); }}
                                    className="p-1 text-slate-500 hover:text-primary transition-colors"
                                    title="Alterar nome"
                                >
                                    <Edit3 size={14} />
                                </button>
                            )}
                        </div>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                        {availableTenants?.find(t => t.id === device?.tenantId)?.name || device?.tenantId || 'Empresa Desconhecida'}
                        {device?.location ? ` • ${device.location}` : ''}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border tracking-widest ${getStatusStyle(device?.status || 'offline')}`}>
                    {getStatusLabel(device?.status || 'offline')}
                </span>
                {device?.fwVersion && (
                    <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border tracking-widest border-blue-500/20 bg-blue-500/10 text-blue-400">
                        FW: v{device.fwVersion}
                    </span>
                )}
                <div className="h-8 w-px bg-[#2A2E24] mx-2"></div>
                <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                    <SettingsIcon size={20} />
                </button>
            </div>
        </header>
    );
};

export default DeviceHeader;
