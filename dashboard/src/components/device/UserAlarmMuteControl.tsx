import React from 'react';
import { Volume2, VolumeX, Gauge, BatteryCharging, Thermometer, DoorOpen, BellOff } from 'lucide-react';
import { useNotifications, type UserAlarmMuteSettings } from '../../contexts/NotificationContext';

interface UserAlarmMuteControlProps {
    deviceId: string;
}

const UserAlarmMuteControl: React.FC<UserAlarmMuteControlProps> = ({ deviceId }) => {
    const { getUserMuteSettings, saveUserMuteSettings } = useNotifications();
    const settings = getUserMuteSettings(deviceId);

    const handleToggleMute = (key: keyof UserAlarmMuteSettings) => {
        const updated = {
            ...settings,
            [key]: !settings[key]
        };
        saveUserMuteSettings(deviceId, updated);
    };

    const toggleItems = [
        {
            key: 'muteTemp' as keyof UserAlarmMuteSettings,
            label: 'Alarme de Temperatura',
            description: 'Silencia sirenes de temperatura quente ou fria',
            icon: Thermometer,
            color: 'text-rose-400',
            bg: 'bg-rose-500/10'
        },
        {
            key: 'muteVolt' as keyof UserAlarmMuteSettings,
            label: 'Alarme de Tensão',
            description: 'Silencia sirenes de falta de energia ou picos de tensão',
            icon: Gauge,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10'
        },
        {
            key: 'muteBat' as keyof UserAlarmMuteSettings,
            label: 'Alarme de Bateria',
            description: 'Silencia sirenes de bateria crítica ou baixa',
            icon: BatteryCharging,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10'
        },
        {
            key: 'muteDoor' as keyof UserAlarmMuteSettings,
            label: 'Alarme de Porta',
            description: 'Silencia sirenes de porta aberta por tempo excessivo',
            icon: DoorOpen,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10'
        },
        {
            key: 'muteOffline' as keyof UserAlarmMuteSettings,
            label: 'Alerta de Offline',
            description: 'Silencia bipes se o sensor perder a rede com o broker',
            icon: BellOff,
            color: 'text-slate-400',
            bg: 'bg-slate-500/10'
        }
    ];

    return (
        <div className="pt-4 mt-4 border-t border-[#2A2E24]">
            <div className="flex items-center gap-2 mb-3">
                <VolumeX size={16} className="text-primary" />
                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">
                    Silenciar Alarmes (Somente Este Navegador)
                </label>
            </div>

            <p className="text-[9px] text-slate-500 mb-3 leading-normal">
                Controla <strong className="text-slate-400">sons e popups</strong> apenas no seu navegador.
                Outros usuários continuam recebendo normalmente.
            </p>
            <p className="text-[9px] text-amber-600/80 mb-4 leading-normal">
                ⚠️ Para parar o <strong>WhatsApp</strong>, use o botão <strong>"Silenciar Alarme"</strong> nos Comandos Rápidos acima (afeta todos).
            </p>

            <div className="space-y-2.5">
                {toggleItems.map((item) => {
                    const isMuted = settings[item.key];
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.key}
                            onClick={() => handleToggleMute(item.key)}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                                ${isMuted
                                    ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/30'
                                    : 'bg-[#0F110D] border-[#2A2E24] hover:bg-[#151811] hover:border-slate-800'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-rose-500/15 text-rose-400' : 'bg-[#1A1D17] text-slate-400 group-hover:text-white'}`}>
                                    <Icon size={16} />
                                </div>
                                <div>
                                    <p className={`text-[11px] font-bold uppercase tracking-wider ${isMuted ? 'text-rose-400' : 'text-slate-200'}`}>
                                        {item.label}
                                    </p>
                                    <p className="text-[9px] text-slate-500 font-medium mt-0.5">
                                        {item.description}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${isMuted ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                    {isMuted ? 'Silenciado' : 'Ouvindo'}
                                </span>
                                <div className={`transition-all duration-300 ${isMuted ? 'text-rose-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default UserAlarmMuteControl;
