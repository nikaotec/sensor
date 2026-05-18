import { Gauge, BatteryCharging, Thermometer, DoorOpen, ToggleRight, ToggleLeft, BellOff } from 'lucide-react';

interface SensorAlarmTogglesProps {
    chkVolt: boolean;
    chkBat: boolean;
    chkTemp: boolean;
    chkDoor: boolean;
    isOfflinePaused?: boolean;
    onToggleOfflinePause?: () => void;
    handleToggleAlarm: (sensor: 'habilitar_tensao' | 'desabilitar_tensao' | 'habilitar_bateria' | 'desabilitar_bateria' | 'habilitar_temperatura' | 'desabilitar_temperatura' | 'habilitar_porta' | 'desabilitar_porta') => void;
    isUpdating: boolean;
    isConnected: boolean;
}

const SensorAlarmToggles: React.FC<SensorAlarmTogglesProps> = ({
    chkVolt,
    chkBat,
    chkTemp,
    chkDoor,
    isOfflinePaused = false,
    onToggleOfflinePause,
    handleToggleAlarm,
    isUpdating,
    isConnected
}) => {
    return (
        <div className="pt-4 mt-4 border-t border-[#2A2E24]">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3 block">Alarmes por Sensor</label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {/* ... (Existing buttons) ... */}
                {/* Toggle: Alarme de Tensão */}
                <button
                    onClick={() => handleToggleAlarm(chkVolt ? 'desabilitar_tensao' : 'habilitar_tensao')}
                    disabled={isUpdating || !isConnected}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                        ${chkVolt
                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                            : 'bg-[#0F110D] border-[#2A2E24] hover:bg-[#151811]'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${chkVolt ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                            <Gauge size={16} />
                        </div>
                        <div>
                            <p className={`text-[11px] font-bold uppercase tracking-wider ${chkVolt ? 'text-emerald-400' : 'text-slate-400'}`}>Tensão</p>
                            <p className={`text-[9px] font-medium ${chkVolt ? 'text-emerald-500/70' : 'text-slate-600'}`}>{chkVolt ? 'Alerta Ativado' : 'Desativado'}</p>
                        </div>
                    </div>
                    <div className={chkVolt ? 'text-emerald-500' : 'text-slate-600'}>
                        {chkVolt ? (
                            <ToggleRight size={24} className="transition-transform group-hover:scale-105" />
                        ) : (
                            <ToggleLeft size={24} className="transition-transform group-hover:scale-105" />
                        )}
                    </div>
                </button>

                {/* Toggle: Alarme de Bateria */}
                <button
                    onClick={() => handleToggleAlarm(chkBat ? 'desabilitar_bateria' : 'habilitar_bateria')}
                    disabled={isUpdating || !isConnected}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                        ${chkBat
                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                            : 'bg-[#0F110D] border-[#2A2E24] hover:bg-[#151811]'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${chkBat ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                            <BatteryCharging size={16} />
                        </div>
                        <div>
                            <p className={`text-[11px] font-bold uppercase tracking-wider ${chkBat ? 'text-emerald-400' : 'text-slate-400'}`}>Bateria</p>
                            <p className={`text-[9px] font-medium ${chkBat ? 'text-emerald-500/70' : 'text-slate-600'}`}>{chkBat ? 'Alerta Ativado' : 'Desativado'}</p>
                        </div>
                    </div>
                    <div className={chkBat ? 'text-emerald-500' : 'text-slate-600'}>
                        {chkBat ? (
                            <ToggleRight size={24} className="transition-transform group-hover:scale-105" />
                        ) : (
                            <ToggleLeft size={24} className="transition-transform group-hover:scale-105" />
                        )}
                    </div>
                </button>

                {/* Toggle: Alarme de Temperatura */}
                <button
                    onClick={() => handleToggleAlarm(chkTemp ? 'desabilitar_temperatura' : 'habilitar_temperatura')}
                    disabled={isUpdating || !isConnected}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                        ${chkTemp
                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                            : 'bg-[#0F110D] border-[#2A2E24] hover:bg-[#151811]'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${chkTemp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                            <Thermometer size={16} />
                        </div>
                        <div>
                            <p className={`text-[11px] font-bold uppercase tracking-wider ${chkTemp ? 'text-emerald-400' : 'text-slate-400'}`}>Temperatura</p>
                            <p className={`text-[9px] font-medium ${chkTemp ? 'text-emerald-500/70' : 'text-slate-600'}`}>{chkTemp ? 'Alerta Ativado' : 'Desativado'}</p>
                        </div>
                    </div>
                    <div className={chkTemp ? 'text-emerald-500' : 'text-slate-600'}>
                        {chkTemp ? (
                            <ToggleRight size={24} className="transition-transform group-hover:scale-105" />
                        ) : (
                            <ToggleLeft size={24} className="transition-transform group-hover:scale-105" />
                        )}
                    </div>
                </button>

                {/* Toggle: Alarme de Porta */}
                <button
                    onClick={() => handleToggleAlarm(chkDoor ? 'desabilitar_porta' : 'habilitar_porta')}
                    disabled={isUpdating || !isConnected}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                        ${chkDoor
                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.05)]'
                            : 'bg-[#0F110D] border-[#2A2E24] hover:bg-[#151811]'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${chkDoor ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                            <DoorOpen size={16} />
                        </div>
                        <div>
                            <p className={`text-[11px] font-bold uppercase tracking-wider ${chkDoor ? 'text-emerald-400' : 'text-slate-400'}`}>Porta</p>
                            <p className={`text-[9px] font-medium ${chkDoor ? 'text-emerald-500/70' : 'text-slate-600'}`}>{chkDoor ? 'Alerta Ativado' : 'Desativado'}</p>
                        </div>
                    </div>
                    <div className={chkDoor ? 'text-emerald-500' : 'text-slate-600'}>
                        {chkDoor ? (
                            <ToggleRight size={24} className="transition-transform group-hover:scale-105" />
                        ) : (
                            <ToggleLeft size={24} className="transition-transform group-hover:scale-105" />
                        )}
                    </div>
                </button>

                {/* Toggle: Pausar Alertas Offline */}
                <button
                    onClick={() => onToggleOfflinePause?.()}
                    disabled={isUpdating}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group col-span-1 sm:col-span-2
                        ${isOfflinePaused
                            ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.05)]'
                            : 'bg-[#0F110D] border-[#2A2E24] hover:bg-[#151811]'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${isOfflinePaused ? 'bg-rose-500/20 text-rose-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                            <BellOff size={16} />
                        </div>
                        <div>
                            <p className={`text-[11px] font-bold uppercase tracking-wider ${isOfflinePaused ? 'text-rose-400' : 'text-slate-400'}`}>Alertas Offline</p>
                            <p className={`text-[9px] font-medium ${isOfflinePaused ? 'text-rose-500/70' : 'text-slate-600'}`}>{isOfflinePaused ? 'Sorrão: Silenciado' : 'Envio Ativo (2 min)'}</p>
                        </div>
                    </div>
                    <div className={isOfflinePaused ? 'text-rose-500' : 'text-slate-600'}>
                        {isOfflinePaused ? (
                            <ToggleRight size={24} className="transition-transform group-hover:scale-105" />
                        ) : (
                            <ToggleLeft size={24} className="transition-transform group-hover:scale-105" />
                        )}
                    </div>
                </button>
            </div>
        </div>
    );
};

export default SensorAlarmToggles;
