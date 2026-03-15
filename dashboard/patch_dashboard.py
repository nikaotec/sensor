import sys

filepath = '/media/venancio/f429fc29-48c2-4ca6-975a-6363fef9fc848/home/antonio/Documentos/projetos/n8n/workflows/sensor/dashboard/src/components/Dashboard.tsx'

with open(filepath, 'r') as f:
    content = f.read()

# Fix imports
import_old = """    DoorOpen,
    Wifi
} from 'lucide-react';"""
import_new = """    DoorOpen,
    Wifi,
    ServerCrash,
    AlertTriangle
} from 'lucide-react';"""
content = content.replace(import_old, import_new)

# Find the start and end of the SCADA section
start_marker = "                    {/* SCADA DEVICE HEADER */}"
end_marker = """                        </div>
                    </div>
                </div>
            </main>"""

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found!")
    sys.exit(1)

grid_code = """
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {tenantDevices.length === 0 ? (
                            <div className="col-span-1 md:col-span-2 xl:col-span-3 py-12 flex flex-col items-center justify-center text-slate-500 bg-[#1A1D17] rounded-2xl border border-[#2A2E24]">
                                <ServerCrash size={48} className="mb-4 opacity-50" />
                                <p className="text-lg">Nenhum dispositivo encontrado para esta empresa.</p>
                            </div>
                        ) : (
                            tenantDevices.map((device) => {
                                const getStatusLabel = (status: string) => {
                                    switch (status) {
                                        case 'online': return 'ESTÁVEL';
                                        case 'warning': return 'ALERTA';
                                        case 'error': return 'ERRO';
                                        case 'offline': return 'OFFLINE';
                                        default: return status.toUpperCase();
                                    }
                                };

                                const getStatusStyle = (status: string) => {
                                    switch (status) {
                                        case 'online': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                                        case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                                        case 'offline': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
                                        case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
                                        default: return 'bg-slate-800 text-slate-400 border-slate-700';
                                    }
                                };

                                const getSignalQuality = (rssi?: number) => {
                                    if (!rssi) return 'Desconhecido';
                                    if (rssi > -65) return 'Excelente';
                                    if (rssi > -75) return 'Bom';
                                    if (rssi > -85) return 'Regular';
                                    return 'Fraco';
                                };

                                return (
                                    <div
                                        key={device.id}
                                        onClick={onDeviceClick}
                                        className="bg-[#1A1D17] rounded-2xl border border-[#2A2E24] shadow-lg p-6 relative flex flex-col cursor-pointer hover:border-primary/50 transition-all group overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                                            <ServerCrash size={80} className="text-primary" />
                                        </div>

                                        <div className="mb-4 flex flex-col z-10">
                                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-loose font-heading">Monitoramento em Tempo Real</h3>
                                            <div className="flex justify-between items-center mt-1">
                                                <h4 className="font-bold text-white text-lg group-hover:text-primary transition-colors">{device.name}</h4>
                                            </div>
                                        </div>

                                        {device.status === 'offline' && (
                                            <div className="mb-4 bg-slate-800/50 text-slate-400 text-xs px-4 py-3 rounded-xl border border-slate-700 flex items-start gap-3 z-10">
                                                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                                                <span className="leading-snug">
                                                    <strong className="text-white">Dispositivo offline.</strong><br />
                                                    Exibindo o último estado conhecido.
                                                </span>
                                            </div>
                                        )}

                                        <div className="bg-[#0F110D] rounded-xl p-4 mb-4 flex items-center justify-between border border-[#2A2E24] z-10">
                                            <div>
                                                <div className="text-xs text-slate-500 font-medium mb-1 font-heading uppercase tracking-wider">Temperatura Atual</div>
                                                <div className="text-4xl font-bold text-white tracking-tight">
                                                    {device.telemetry.temp !== undefined ? `${device.telemetry.temp.toFixed(1)}` : '--'}
                                                    <span className="text-lg text-slate-400 font-medium ml-1">°C</span>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${getStatusStyle(device.status)} ${device.status === 'offline' ? 'opacity-50' : ''}`}>
                                                {getStatusLabel(device.status)}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4 z-10">
                                            <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex flex-col items-center justify-center text-center">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Máxima</div>
                                                <div className="text-lg font-bold text-rose-500">
                                                    {device.telemetry.tempMax !== undefined ? `${device.telemetry.tempMax.toFixed(1)}°C` : '--'}
                                                </div>
                                            </div>
                                            <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex flex-col items-center justify-center text-center">
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Mínima</div>
                                                <div className="text-lg font-bold text-indigo-400">
                                                    {device.telemetry.tempMin !== undefined ? `${device.telemetry.tempMin.toFixed(1)}°C` : '--'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6 z-10">
                                            <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                                                    <BatteryCharging size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bateria</div>
                                                    <div className="text-sm font-bold text-white">
                                                        {device.telemetry.batteryVoltage !== undefined ? `${device.telemetry.batteryVoltage.toFixed(2)}V` : '--'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-[#0F110D] rounded-xl p-4 border border-[#2A2E24] flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                                    <Zap size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tensão</div>
                                                    <div className="text-sm font-bold text-white">
                                                        {device.telemetry.inputVoltage !== undefined ? `${device.telemetry.inputVoltage}V` : '--'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-[#2A2E24] flex items-center justify-between z-10">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Wifi size={14} className={device.telemetry.signal && device.telemetry.signal > -75 ? 'text-primary' : 'text-amber-500'} />
                                                <span className="text-xs font-medium">Sinal RSSI: {device.telemetry.signal !== undefined ? `${device.telemetry.signal} dBm` : '--'}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-[#0F110D] border border-[#2A2E24] ${device.telemetry.signal && device.telemetry.signal > -75 ? 'text-emerald-400' : 'text-amber-500'}`}>
                                                {getSignalQuality(device.telemetry.signal)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
"""

new_content = content[:start_idx] + grid_code + "\n" + content[end_idx:]

with open(filepath, 'w') as f:
    f.write(new_content)

print("Dashboard updated successfully!")
