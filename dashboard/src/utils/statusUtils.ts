import React from 'react';
import {
    AlertTriangle,
    Info,
    CheckCircle2,
    XCircle,
    User,
    Settings,
    Bell,
    Clock
} from 'lucide-react';

export const getStatusStyle = (status: string) => {
    switch (status) {
        case 'online': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        case 'offline': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
        default: return 'bg-slate-700 text-slate-400';
    }
};

export const getStatusLabel = (status: string) => {
    switch (status) {
        case 'online': return 'ESTÁVEL';
        case 'warning': return 'ALERTA';
        case 'error': return 'ERRO';
        case 'offline': return 'OFFLINE';
        default: return status.toUpperCase();
    }
};

export const getEventIcon = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'alerta': return React.createElement(AlertTriangle, { size: 16 });
        case 'info': return React.createElement(Info, { size: 16 });
        case 'sucesso': return React.createElement(CheckCircle2, { size: 16 });
        case 'erro': return React.createElement(XCircle, { size: 16 });
        case 'user': return React.createElement(User, { size: 16 });
        case 'command': return React.createElement(Settings, { size: 16 });
        case 'notification': return React.createElement(Bell, { size: 16 });
        default: return React.createElement(Clock, { size: 16 });
    }
};

export const getEventColor = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'alerta':
            return {
                border: 'border-amber-500/20',
                bg: 'bg-amber-500/5',
                icon: 'text-amber-500',
                text: 'text-amber-200'
            };
        case 'erro':
            return {
                border: 'border-red-500/20',
                bg: 'bg-red-500/5',
                icon: 'text-red-500',
                text: 'text-red-200'
            };
        case 'sucesso':
            return {
                border: 'border-emerald-500/20',
                bg: 'bg-emerald-500/5',
                icon: 'text-emerald-500',
                text: 'text-emerald-200'
            };
        case 'command':
        case 'user':
            return {
                border: 'border-blue-500/20',
                bg: 'bg-blue-500/5',
                icon: 'text-blue-500',
                text: 'text-blue-200'
            };
        default:
            return {
                border: 'border-slate-500/20',
                bg: 'bg-slate-500/5',
                icon: 'text-slate-500',
                text: 'text-slate-200'
            };
    }
};

export const formatEventTime = (timestamp: any) => {
    if (!timestamp) return '---';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '---';
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};
