import React from 'react';
import { Settings2 } from 'lucide-react';
import SensorSelector from './SensorSelector';
import type { TempSensorType } from './SensorSelector';

interface CalibrationControlProps {
    voltCalibration: string;
    setVoltCalibration: (val: string) => void;
    batCalibration: string;
    setBatCalibration: (val: string) => void;
    tempCalibration: string;
    setTempCalibration: (val: string) => void;
    handleCalibration: (type: 'tensao' | 'bateria' | 'temperatura') => void;
    isUpdating: boolean;
    isConnected: boolean;
    tempSensor: TempSensorType;
    setTempSensor: (type: TempSensorType) => void;
}

const CalibrationControl: React.FC<CalibrationControlProps> = ({
    voltCalibration,
    setVoltCalibration,
    batCalibration,
    setBatCalibration,
    tempCalibration,
    setTempCalibration,
    handleCalibration,
    isUpdating,
    isConnected,
    tempSensor,
    setTempSensor
}) => {
    return (
        <div className="mt-6 pt-5 border-t border-[#2A2E24]">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                    <Settings2 size={16} className="text-primary" />
                </div>
                <div>
                    <h4 className="text-[11px] text-white uppercase font-bold tracking-widest leading-none">Calibração de Sensores</h4>
                    <p className="text-[9px] text-slate-500 mt-1">Insira o valor medido pelo multímetro para manter a precisão.</p>
                </div>
            </div>

            <div className="space-y-3 bg-[#0A0D08] p-4 rounded-xl border border-[#2A2E24] shadow-inner">
                {/* Calibração de Tensão */}
                <div className="space-y-1.5 focus-within:ring-1 focus-within:ring-amber-500/30 rounded-lg transition-all p-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Tensão Real (V)</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            step="1"
                            value={voltCalibration}
                            onChange={(e) => setVoltCalibration(e.target.value)}
                            className="flex-1 bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-500 focus:outline-none transition-colors placeholder:text-slate-600"
                            placeholder="Ex: 220"
                        />
                        <button
                            onClick={() => handleCalibration('tensao')}
                            disabled={isUpdating || !isConnected || !voltCalibration}
                            className="px-4 py-2 bg-[#0F110D] border border-[#2A2E24] hover:bg-amber-500/10 hover:border-amber-500/30 text-amber-500 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Aplicar
                        </button>
                    </div>
                </div>

                {/* Calibração de Bateria */}
                <div className="space-y-1.5 focus-within:ring-1 focus-within:ring-emerald-500/30 rounded-lg transition-all p-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Bateria Real (V)</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            step="0.1"
                            value={batCalibration}
                            onChange={(e) => setBatCalibration(e.target.value)}
                            className="flex-1 bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-slate-600"
                            placeholder="Ex: 12.6"
                        />
                        <button
                            onClick={() => handleCalibration('bateria')}
                            disabled={isUpdating || !isConnected || !batCalibration}
                            className="px-4 py-2 bg-[#0F110D] border border-[#2A2E24] hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-500 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Aplicar
                        </button>
                    </div>
                </div>

                {/* Calibração de Temperatura */}
                <div className="space-y-1.5 focus-within:ring-1 focus-within:ring-red-500/30 rounded-lg transition-all p-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Temperatura Real (°C)</label>

                    <SensorSelector
                        selected={tempSensor}
                        onChange={setTempSensor}
                        disabled={isUpdating || !isConnected}
                    />

                    <div className="flex gap-2">
                        <input
                            type="number"
                            step="0.1"
                            value={tempCalibration}
                            onChange={(e) => setTempCalibration(e.target.value)}
                            className="flex-1 bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-red-500 focus:outline-none transition-colors placeholder:text-slate-600"
                            placeholder="Ex: 25.0"
                        />
                        <button
                            onClick={() => handleCalibration('temperatura')}
                            disabled={isUpdating || !isConnected || !tempCalibration}
                            className="px-4 py-2 bg-[#0F110D] border border-[#2A2E24] hover:bg-red-500/10 hover:border-red-500/30 text-red-500 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Aplicar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalibrationControl;
