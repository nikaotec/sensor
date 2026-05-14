import React from 'react';

export type TempSensorType = 'DS18B20' | 'PT100';

interface SensorSelectorProps {
    selected: TempSensorType;
    onChange: (type: TempSensorType) => void;
    disabled?: boolean;
}

const SensorSelector: React.FC<SensorSelectorProps> = ({ selected, onChange, disabled }) => {
    return (
        <div className="flex gap-2 mb-3">
            <button
                type="button"
                onClick={() => onChange('DS18B20')}
                disabled={disabled}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border
                    ${selected === 'DS18B20'
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-[#1A1D17] border-[#2A2E24] text-slate-500 hover:border-slate-700'}`}
            >
                DS18B20
            </button>
            <button
                type="button"
                onClick={() => onChange('PT100')}
                disabled={disabled}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border
                    ${selected === 'PT100'
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-[#1A1D17] border-[#2A2E24] text-slate-500 hover:border-slate-700'}`}
            >
                PT100
            </button>
        </div>
    );
};

export default SensorSelector;
