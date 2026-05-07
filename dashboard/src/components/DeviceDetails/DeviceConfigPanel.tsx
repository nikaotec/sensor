import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, RefreshCw, Gauge, BatteryCharging, Thermometer, DoorOpen, ToggleRight, ToggleLeft, Settings2 } from 'lucide-react';
import type { Device } from '../../domain/entities/Device';

interface DeviceConfigPanelProps {
    device: Device | undefined;
    isConnected: boolean;
    isUpdating: boolean;
    onSaveHysteresis: (tempOn: number, tempOff: number) => Promise<void>;
    onSaveLimits: (limits: any) => Promise<void>;
    onToggleAlarm: (sensor: string) => Promise<void>;
    onCalibrate: (type: 'tensao' | 'bateria' | 'temperatura', value: number) => void;
}

const DeviceConfigPanel: React.FC<DeviceConfigPanelProps> = ({
    device,
    isConnected,
    isUpdating,
    onSaveHysteresis,
    onSaveLimits,
    onToggleAlarm,
    onCalibrate
}) => {
    const [remoteSync, setRemoteSync] = useState(true);

    // Estados locais para inputs
    const [tempMinInput, setTempMinInput] = useState<string>('');
    const [tempMaxInput, setTempMaxInput] = useState<string>('');
    const [voltMinInput, setVoltMinInput] = useState<string>('');
    const [voltMaxInput, setVoltMaxInput] = useState<string>('');
    const [batMinInput, setBatMinInput] = useState<string>('');
    const [doorTimeInput, setDoorTimeInput] = useState<string>('');
    const [hysteresisOnInput, setHysteresisOnInput] = useState<string>('7.5');
    const [hysteresisOffInput, setHysteresisOffInput] = useState<string>('2.5');

    // Estados de calibração
    const [voltCalibration, setVoltCalibration] = useState<string>('');
    const [batCalibration, setBatCalibration] = useState<string>('');
    const [tempCalibration, setTempCalibration] = useState<string>('');

    // Sincronizar inputs com dados do dispositivo
    useEffect(() => {
        if (device?.telemetry && remoteSync) {
            if (device.telemetry.alarmMax !== undefined) setTempMaxInput(device.telemetry.alarmMax.toString());
            if (device.telemetry.alarmMin !== undefined) setTempMinInput(device.telemetry.alarmMin.toString());
            if (device.telemetry.voltMaxLimit !== undefined) setVoltMaxInput(device.telemetry.voltMaxLimit.toString());
            if (device.telemetry.voltMinLimit !== undefined) setVoltMinInput(device.telemetry.voltMinLimit.toString());
            if (device.telemetry.batMinLimit !== undefined) setBatMinInput(device.telemetry.batMinLimit.toString());
            if (device.telemetry.doorMaxTime !== undefined) setDoorTimeInput(device.telemetry.doorMaxTime.toString());
            if ((device.telemetry as any).tempOn !== undefined) setHysteresisOnInput((device.telemetry as any).tempOn.toString());
            if ((device.telemetry as any).tempOff !== undefined) setHysteresisOffInput((device.telemetry as any).tempOff.toString());
        }
    }, [device?.telemetry, remoteSync]);

    const chkVolt = device?.telemetry?.chkVolt ?? true;
    const chkBat = device?.telemetry?.chkBat ?? true;
    const chkTemp = device?.telemetry?.chkTemp ?? true;
    const chkDoor = device?.telemetry?.chkDoor ?? true;

    const handleInternalSaveHysteresis = () => {
        onSaveHysteresis(parseFloat(hysteresisOnInput), parseFloat(hysteresisOffInput));
    };

    const handleInternalSaveLimits = () => {
        onSaveLimits({
            tempMax: tempMaxInput,
            tempMin: tempMinInput,
            voltMax: voltMaxInput,
            voltMin: voltMinInput,
            batMin: batMinInput,
            doorTime: doorTimeInput
        });
    };

    return (
        <div className="rounded-2xl border border-[#2A2E24] bg-[#1A1D17] p-6 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                <SettingsIcon size={40} className="text-primary rotate-12" />
            </div>

            <h3 className="text-xs font-medium text-slate-400 uppercase mb-5 tracking-wider font-heading flex items-center gap-2">
                <RefreshCw size={14} className={isUpdating ? 'animate-spin' : ''} />
                Painel de Controle
            </h3>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {/* Seção: Controle de Histerese */}
                <div className="bg-[#0A0D08] p-4 rounded-xl border border-blue-500/20 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="size-2 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[11px] font-bold text-white uppercase tracking-widest">Histerese (Relé Automático)</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mb-3">Temp &gt;= ON Liga | Temp &lt;= OFF Desliga</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="space-y-1.5">
                            <label className="text-[9px] text-slate-400 uppercase font-bold tracking-widest px-1">Ligar Máx (°C)</label>
                            <input type="number" step="0.1" value={hysteresisOnInput} onChange={(e) => setHysteresisOnInput(e.target.value)} className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500/50 focus:outline-none transition-colors" placeholder="7.5" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] text-slate-400 uppercase font-bold tracking-widest px-1">Desligar Mín (°C)</label>
                            <input type="number" step="0.1" value={hysteresisOffInput} onChange={(e) => setHysteresisOffInput(e.target.value)} className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-blue-500/50 focus:outline-none transition-colors" placeholder="2.5" />
                        </div>
                    </div>
                    <button
                        onClick={handleInternalSaveHysteresis}
                        disabled={isUpdating || !isConnected}
                        className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]
                            ${isUpdating ? 'bg-slate-700 text-slate-400 cursor-wait' : isConnected ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed opacity-50'}`}
                    >
                        {isUpdating ? 'ENVIANDO...' : (isConnected ? 'ATUALIZAR HISTERESE' : 'SEM CONEXÃO')}
                    </button>
                </div>

                {/* Temperatura */}
                <div className="space-y-2 pb-3 border-b border-[#2A2E24]/50">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="size-1.5 rounded-full bg-red-500"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alerta de Temperatura</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Mín (°C)</label>
                            <input type="number" step="0.1" value={tempMinInput} onChange={(e) => { setTempMinInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-red-500/50 focus:outline-none" placeholder="0.0" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Máx (°C)</label>
                            <input type="number" step="0.1" value={tempMaxInput} onChange={(e) => { setTempMaxInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-red-500/50 focus:outline-none" placeholder="0.0" />
                        </div>
                    </div>
                </div>

                {/* Tensão */}
                <div className="space-y-2 pb-3 border-b border-[#2A2E24]/50">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="size-1.5 rounded-full bg-amber-500"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alerta de Tensão</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Mín (V)</label>
                            <input type="number" step="1" value={voltMinInput} onChange={(e) => { setVoltMinInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500/50 focus:outline-none" placeholder="0" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Máx (V)</label>
                            <input type="number" step="1" value={voltMaxInput} onChange={(e) => { setVoltMaxInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500/50 focus:outline-none" placeholder="0" />
                        </div>
                    </div>
                </div>

                {/* Outros */}
                <div className="grid grid-cols-2 gap-3 pb-2">
                    <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Bat. Mín (V)</label>
                        <input type="number" step="0.1" value={batMinInput} onChange={(e) => { setBatMinInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-primary/50 focus:outline-none" placeholder="0.0" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] text-slate-500 uppercase font-bold tracking-widest px-1">Porta (s)</label>
                        <input type="number" step="1" value={doorTimeInput} onChange={(e) => { setDoorTimeInput(e.target.value); setRemoteSync(false); }} className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-primary/50 focus:outline-none" placeholder="0" />
                    </div>
                </div>

                <button
                    onClick={handleInternalSaveLimits}
                    disabled={isUpdating || !isConnected}
                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98]
                        ${isUpdating ? 'bg-slate-700 text-slate-400 cursor-wait' : isConnected ? 'bg-primary text-background-dark hover:bg-primary-light shadow-primary/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 cursor-not-allowed opacity-50'}`}
                >
                    {isUpdating ? 'ENVIANDO...' : (isConnected ? 'ATUALIZAR LIMITES' : 'SEM CONEXÃO')}
                </button>

                {/* Alarmes por Sensor */}
                <div className="pt-4 mt-4 border-t border-[#2A2E24]">
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3 block">Alarmes por Sensor</label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                        <button
                            onClick={() => onToggleAlarm(chkVolt ? 'desabilitar_tensao' : 'habilitar_tensao')}
                            disabled={isUpdating || !isConnected}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                                ${chkVolt ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.05)]' : 'bg-[#0F110D] border-[#2A2E24]'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${chkVolt ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                                    <Gauge size={16} />
                                </div>
                                <div>
                                    <p className={`text-[11px] font-bold uppercase ${chkVolt ? 'text-emerald-400' : 'text-slate-400'}`}>Tensão</p>
                                    <p className="text-[9px] font-medium">{chkVolt ? 'Ativo' : 'Desativado'}</p>
                                </div>
                            </div>
                            {chkVolt ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-600" />}
                        </button>

                        <button
                            onClick={() => onToggleAlarm(chkBat ? 'desabilitar_bateria' : 'habilitar_bateria')}
                            disabled={isUpdating || !isConnected}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                                ${chkBat ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#0F110D] border-[#2A2E24]'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${chkBat ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                                    <BatteryCharging size={16} />
                                </div>
                                <div>
                                    <p className={`text-[11px] font-bold uppercase ${chkBat ? 'text-emerald-400' : 'text-slate-400'}`}>Bateria</p>
                                    <p className="text-[9px] font-medium">{chkBat ? 'Ativo' : 'Desativado'}</p>
                                </div>
                            </div>
                            {chkBat ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-600" />}
                        </button>

                        <button
                            onClick={() => onToggleAlarm(chkTemp ? 'desabilitar_temperatura' : 'habilitar_temperatura')}
                            disabled={isUpdating || !isConnected}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                                ${chkTemp ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#0F110D] border-[#2A2E24]'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${chkTemp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                                    <Thermometer size={16} />
                                </div>
                                <div>
                                    <p className={`text-[11px] font-bold uppercase ${chkTemp ? 'text-emerald-400' : 'text-slate-400'}`}>Temperatura</p>
                                    <p className="text-[9px] font-medium">{chkTemp ? 'Ativo' : 'Desativado'}</p>
                                </div>
                            </div>
                            {chkTemp ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-600" />}
                        </button>

                        <button
                            onClick={() => onToggleAlarm(chkDoor ? 'desabilitar_porta' : 'habilitar_porta')}
                            disabled={isUpdating || !isConnected}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 w-full text-left group
                                ${chkDoor ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#0F110D] border-[#2A2E24]'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${chkDoor ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1A1D17] text-slate-500'}`}>
                                    <DoorOpen size={16} />
                                </div>
                                <div>
                                    <p className={`text-[11px] font-bold uppercase ${chkDoor ? 'text-emerald-400' : 'text-slate-400'}`}>Porta</p>
                                    <p className="text-[9px] font-medium">{chkDoor ? 'Ativo' : 'Desativado'}</p>
                                </div>
                            </div>
                            {chkDoor ? <ToggleRight size={24} className="text-emerald-500" /> : <ToggleLeft size={24} className="text-slate-600" />}
                        </button>
                    </div>

                    {/* Calibração */}
                    <div className="mt-6 pt-5 border-t border-[#2A2E24]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                                <Settings2 size={16} className="text-primary" />
                            </div>
                            <div>
                                <h4 className="text-[11px] text-white uppercase font-bold tracking-widest leading-none">Calibração de Sensores</h4>
                                <p className="text-[9px] text-slate-500 mt-1">Insira o valor medido para manter a precisão.</p>
                            </div>
                        </div>

                        <div className="space-y-3 bg-[#0A0D08] p-4 rounded-xl border border-[#2A2E24]">
                            <div className="space-y-1.5 p-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Tensão Real (V)</label>
                                <div className="flex gap-2">
                                    <input type="number" value={voltCalibration} onChange={(e) => setVoltCalibration(e.target.value)} className="flex-1 bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none" placeholder="Ex: 220" />
                                    <button onClick={() => { onCalibrate('tensao', parseFloat(voltCalibration)); setVoltCalibration(''); }} disabled={isUpdating || !isConnected || !voltCalibration} className="px-4 py-2 bg-[#0F110D] border border-amber-500/30 text-amber-500 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50">Aplicar</button>
                                </div>
                            </div>
                            <div className="space-y-1.5 p-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Bateria Real (V)</label>
                                <div className="flex gap-2">
                                    <input type="number" value={batCalibration} onChange={(e) => setBatCalibration(e.target.value)} className="flex-1 bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none" placeholder="Ex: 13.8" />
                                    <button onClick={() => { onCalibrate('bateria', parseFloat(batCalibration)); setBatCalibration(''); }} disabled={isUpdating || !isConnected || !batCalibration} className="px-4 py-2 bg-[#0F110D] border border-emerald-500/30 text-emerald-500 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50">Aplicar</button>
                                </div>
                            </div>
                            <div className="space-y-1.5 p-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Temperatura Real (°C)</label>
                                <div className="flex gap-2">
                                    <input type="number" value={tempCalibration} onChange={(e) => setTempCalibration(e.target.value)} className="flex-1 bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none" placeholder="Ex: 25.0" />
                                    <button onClick={() => { onCalibrate('temperatura', parseFloat(tempCalibration)); setTempCalibration(''); }} disabled={isUpdating || !isConnected || !tempCalibration} className="px-4 py-2 bg-[#0F110D] border border-red-500/30 text-red-500 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50">Aplicar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeviceConfigPanel;
