import {
    AlertTriangle, CheckCircle, Info, ShieldAlert,
    Wifi, WifiOff,
    MonitorIcon, ShieldCheck
} from 'lucide-react';

export const getStatusStyle = (status: string) => {
    switch (status) {
        case 'online': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
        default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
};

export const getStatusLabel = (status: string) => {
    switch (status) {
        case 'online': return 'Operacional';
        case 'warning': return 'Alerta';
        case 'critical': return 'Crítico';
        default: return 'Offline';
    }
};

export const getEventIcon = (type: string) => {
    switch (type) {
        case 'alert': return <AlertTriangle size={18} />;
        case 'critical': return <ShieldAlert size={18} />;
        case 'success': return <CheckCircle size={18} />;
        case 'maintenance': return <MonitorIcon size={18} />;
        case 'security': return <ShieldCheck size={18} />;
        default: return <Info size={18} />;
    }
};

export const getEventColor = (type: string) => {
    switch (type) {
        case 'alert': return { bg: 'bg-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400', icon: 'text-amber-500' };
        case 'critical': return { bg: 'bg-red-500/5', border: 'border-red-500/20', text: 'text-red-400', icon: 'text-red-500' };
        case 'success': return { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'text-emerald-500' };
        case 'maintenance': return { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'text-blue-500' };
        default: return { bg: 'bg-slate-500/5', border: 'border-slate-500/20', text: 'text-slate-400', icon: 'text-slate-400' };
    }
};

export const formatEventTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' +
        date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const getRssiIcon = (rssi: number | undefined) => {
    if (rssi === undefined) return <WifiOff size={18} />;
    if (rssi > -60) return <Wifi size={18} className="text-emerald-500" />;
    if (rssi > -80) return <Wifi size={18} className="text-amber-500" />;
    return <Wifi size={18} className="text-red-500" />;
};
