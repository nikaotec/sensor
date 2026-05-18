import React from 'react';

interface SystemInfoProps {
    device: any;
    remoteSync: boolean;
    setRemoteSync: (sync: boolean) => void;
}

const SystemInfo: React.FC<SystemInfoProps> = ({
    device,
    remoteSync,
    setRemoteSync
}) => {
    return (
        <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg">
            <h3 className="text-xs font-medium text-slate-400 uppercase mb-4 tracking-wider font-heading">Informações do Sistema</h3>
            <div className="space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Última Atividade</span>
                    <span className="font-mono text-white font-medium">{device?.lastSeen ? new Date(device.lastSeen).toLocaleString('pt-BR') : '--'}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Endereço MAC</span>
                    <span className="font-mono text-white font-medium">{device?.id || '--'}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Endereço IP</span>
                    <span className="font-mono text-white font-medium">{device?.telemetry?.ip || '--'}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Modo</span>
                    <span className="font-mono text-white font-medium">{device?.telemetry?.modo || '--'}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Versão do Firmware</span>
                    <span className="font-mono text-white font-medium">{device?.telemetry?.version || '--'}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Uptime</span>
                    <span className="font-mono text-white font-medium">
                        {device?.telemetry?.uptime ? `${Math.floor(device.telemetry.uptime / 3600)}h ${Math.floor((device.telemetry.uptime % 3600) / 60)}m` : '--'}
                    </span>
                </div>
                <div className="pt-5 mt-5 border-t border-[#2A2E24] flex items-center justify-between">
                    <span className="text-sm font-bold text-white">Sincronia Ativa</span>
                    <button onClick={() => setRemoteSync(!remoteSync)} className={`relative inline-flex h-6 w-12 rounded-full border-2 transition-colors ${remoteSync ? 'bg-primary border-transparent' : 'bg-[#0F110D] border-[#2A2E24]'}`}>
                        <span className={`h-5 w-5 transform rounded-full bg-white transition duration-200 ${remoteSync ? 'translate-x-6' : 'translate-x-0'}`}></span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemInfo;
