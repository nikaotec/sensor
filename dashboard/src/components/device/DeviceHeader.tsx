import React from 'react';
import { ArrowLeft, Edit3, Save, X, Settings as SettingsIcon } from 'lucide-react';
import type { User } from '../../data/mockData';
import { getStatusStyle, getStatusLabel } from '../../utils/statusUtils';

interface DeviceHeaderProps {
    device: any;
    currentUser: User | null;
    isEditingName: boolean;
    setIsEditingName: (value: boolean) => void;
    newDeviceName: string;
    setNewDeviceName: (value: string) => void;
    handleChangeDeviceName: () => void;
    isChangingName: boolean;
    onNavigate: (screen: any) => void;
    availableTenants: any[];
}

const DeviceHeader: React.FC<DeviceHeaderProps> = ({
    device,
    currentUser,
    isEditingName,
    setIsEditingName,
    newDeviceName,
    setNewDeviceName,
    handleChangeDeviceName,
    isChangingName,
    onNavigate,
    availableTenants
}) => {
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
                                onClick={handleChangeDeviceName}
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
                <div className="h-8 w-px bg-[#2A2E24] mx-2"></div>
                <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                    <SettingsIcon size={20} />
                </button>
            </div>
        </header>
    );
};

export default DeviceHeader;
