import React, { useState, useMemo } from 'react';
import { Cpu, Send, AlertTriangle, CheckCircle2, ChevronLeft, UploadCloud, Hash, Globe, CheckCircle } from 'lucide-react';
import type { OtaProgressMap } from '../../types/ota';
import OtaProgressBadge from './OtaProgressBadge';
import { LATEST_FIRMWARE_VERSION } from '../../services/OtaService';
import { VersionService } from '../../services/VersionService';
import { firmwareRegistryService, type FirmwareVersion } from '../../services/FirmwareRegistryService';

const FIRMWARE_BASE_URL = 'https://firmware.nikaotech.com/';

interface Device {
    id: string;
    name: string;
    location?: string;
    status?: string;
    tenantId?: string;
    telemetry?: {
        version?: string;
    };
}

interface OtaPanelProps {
    devices: any[];
    firmwareVersions?: FirmwareVersion[];
    onSendOta: (deviceIds: string[], url: string, version?: string, hash?: string) => void;
    onRefreshFirmwares?: () => void;
    progressMap: OtaProgressMap;
    onClearProgress: (deviceId: string) => void;
    onNavigate: (screen: any) => void;
    isMqttConnected: boolean;
}

type SelectionMode = 'all' | 'individual';

export const OtaPanel: React.FC<OtaPanelProps> = ({
    devices,
    onSendOta,
    progressMap,
    onClearProgress,
    onNavigate,
    isMqttConnected,
}) => {
    const [firmwareFilename, setFirmwareFilename] = useState('');
    const [firmwareHash, setFirmwareHash] = useState('');
    const [firmwareVersion, setFirmwareVersion] = useState('');
    const [selectionMode, setSelectionMode] = useState<SelectionMode>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirming, setConfirming] = useState(false);
    const [urlError, setUrlError] = useState('');
    const [versions, setVersions] = useState<FirmwareVersion[]>([]);
    const [isAddingVersion, setIsAddingVersion] = useState(false);
    const [newVersionInput, setNewVersionInput] = useState({ version: '', filename: '', hash: '' });

    // Load versions on mount
    React.useEffect(() => {
        setVersions(firmwareRegistryService.getVersions());
    }, []);

    const dynamicLatestVersion = useMemo(() => {
        const latest = versions.find(v => v.isLatest);
        return latest?.version || LATEST_FIRMWARE_VERSION;
    }, [versions]);

    const onlineDevices = useMemo(() => devices.filter(d => d.status !== 'offline'), [devices]);

    // Grouping logic based on dynamic latest version
    const outdatedDevices = useMemo(() => devices.filter(d => !VersionService.isUpToDate(d.telemetry?.version, dynamicLatestVersion)), [devices, dynamicLatestVersion]);
    const updatedDevices = useMemo(() => devices.filter(d => VersionService.isUpToDate(d.telemetry?.version, dynamicLatestVersion)), [devices, dynamicLatestVersion]);

    const onlineOutdatedCount = useMemo(() => outdatedDevices.filter(d => d.status !== 'offline').length, [outdatedDevices]);

    const handleSelectVersion = (v: FirmwareVersion) => {
        setFirmwareFilename(v.filename);
        setFirmwareHash(v.hash || '');
        setFirmwareVersion(v.version); // Adicionado para rastrear a versão alvo
        setConfirming(false);
        setUrlError('');
    };

    const handleAddVersion = () => {
        if (!newVersionInput.version || !newVersionInput.filename) return;
        firmwareRegistryService.addVersion({
            id: `v${newVersionInput.version}-${Date.now()}`,
            version: newVersionInput.version,
            filename: newVersionInput.filename,
            hash: newVersionInput.hash
        });
        setVersions(firmwareRegistryService.getVersions());
        setIsAddingVersion(false);
        setNewVersionInput({ version: '', filename: '', hash: '' });
    };

    const handleSetLatest = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        firmwareRegistryService.setLatest(id);
        setVersions(firmwareRegistryService.getVersions());
    };

    const handleRemoveVersion = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        firmwareRegistryService.removeVersion(id);
        setVersions(firmwareRegistryService.getVersions());
    };

    const effectiveDeviceIds = selectionMode === 'all'
        ? outdatedDevices.filter(d => d.status !== 'offline').map(d => d.id)
        : [...selectedIds];

    const toggleDevice = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const validateUrl = (filename: string) => {
        if (!filename.trim()) {
            setUrlError('Informe o nome do arquivo de firmware');
            return false;
        }
        if (!filename.endsWith('.bin')) {
            setUrlError('O arquivo deve ter extensão .bin');
            return false;
        }
        setUrlError('');
        return true;
    };

    const handleSubmit = () => {
        if (!validateUrl(firmwareFilename)) return;
        if (effectiveDeviceIds.length === 0) return;
        if (!confirming) { setConfirming(true); return; }

        const fullUrl = FIRMWARE_BASE_URL + firmwareFilename.trim();
        onSendOta(effectiveDeviceIds, fullUrl, firmwareVersion || undefined, firmwareHash || undefined);
        setConfirming(false);
        setFirmwareFilename('');
        setFirmwareHash('');
        setFirmwareVersion('');
    };

    const hasActiveOta = Object.values(progressMap).some(
        s => s.phase !== 'idle' && s.phase !== 'success' && s.phase !== 'error'
    );

    const renderDeviceItem = (device: Device, isInteractive: boolean) => {
        const status = progressMap[device.id];
        const isOffline = device.status === 'offline';
        const isUpdated = VersionService.isUpToDate(device.telemetry?.version, dynamicLatestVersion);

        if (isInteractive) {
            return (
                <label
                    key={device.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${selectedIds.has(device.id)
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-[#0F110D] border-[#2A2E24] hover:border-slate-600'
                        }`}
                >
                    <input
                        type="checkbox"
                        checked={selectedIds.has(device.id)}
                        onChange={() => { toggleDevice(device.id); setConfirming(false); }}
                        className="accent-primary w-4 h-4"
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-white truncate">{device.name}</p>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md border ${isUpdated ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-amber-500/20 text-amber-400 bg-amber-500/5'}`}>
                                FW {device.telemetry?.version || '?.?.?'}
                            </span>
                        </div>
                        {device.location && <p className="text-[10px] text-slate-500 truncate">{device.location}</p>}
                    </div>
                    <div className="ml-auto">
                        {progressMap[device.id] && (
                            <OtaProgressBadge
                                status={progressMap[device.id]}
                                onDismiss={() => onClearProgress(device.id)}
                            />
                        )}
                    </div>
                </label>
            );
        }

        return (
            <div
                key={device.id}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all ${isOffline ? 'border-[#1e2218] bg-[#0f110d]/40 opacity-60' : 'border-[#2A2E24] bg-[#0F110D]'}`}
            >
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${isOffline ? 'bg-slate-600' : status?.phase === 'success' ? 'bg-emerald-400' : status?.phase === 'error' ? 'bg-red-500' : status ? 'bg-sky-400 animate-pulse' : isUpdated ? 'bg-emerald-400' : 'bg-amber-400'}`} />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white truncate">{device.name}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md border ${isUpdated ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-amber-500/20 text-amber-400 bg-amber-500/5'}`}>
                            FW {device.telemetry?.version || '?.?.?'}
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{device.location || device.id}</p>
                </div>

                <div className="shrink-0 min-w-[120px] flex justify-end">
                    {status && status.phase !== 'idle' ? (
                        <OtaProgressBadge
                            status={status}
                            onDismiss={() => onClearProgress(device.id)}
                        />
                    ) : (
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border ${isOffline ? 'text-slate-600 border-slate-800 bg-slate-900/20' : isUpdated ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-amber-400 border-amber-500/20 bg-amber-500/5'}`}>
                            {isOffline ? 'Offline' : isUpdated ? 'Atualizado' : 'Desatualizado'}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0D0F0A] text-white font-sans">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#0D0F0A]/90 backdrop-blur-md border-b border-[#2A2E24] px-6 py-4 flex items-center gap-4">
                <button
                    onClick={() => onNavigate('dashboard')}
                    className="p-2 rounded-xl border border-[#2A2E24] text-slate-400 hover:text-white hover:border-slate-600 transition-all font-sans"
                >
                    <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <UploadCloud size={18} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold tracking-tight">Atualização de Firmware (OTA)</h1>
                        <p className="text-[11px] text-slate-500">Envio remoto seguro via MQTT + HTTPS</p>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isMqttConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-[11px] text-slate-500">{isMqttConnected ? 'MQTT Conectado' : 'MQTT Desconectado'}</span>
                </div>
            </header>

            <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Left: Versions & Form ──────────────────── */}
                <div className="space-y-6 font-sans">
                    {/* Firmware Library */}
                    <div className="bg-[#1A1D17] rounded-2xl border border-[#2A2E24] p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <UploadCloud size={15} className="text-primary" />
                                Biblioteca de Firmwares
                            </h2>
                            <button
                                onClick={() => setIsAddingVersion(!isAddingVersion)}
                                className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
                            >
                                {isAddingVersion ? 'Cancelar' : '+ Adicionar'}
                            </button>
                        </div>

                        {isAddingVersion && (
                            <div className="mb-6 p-4 rounded-xl border border-[#2A2E24] bg-[#0F110D] space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Versão (ex: 1.2.0)"
                                        value={newVersionInput.version}
                                        onChange={e => setNewVersionInput({ ...newVersionInput, version: e.target.value })}
                                        className="bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-xs text-white focus:outline-none placeholder:text-slate-600"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Arquivo (ex: fw.bin)"
                                        value={newVersionInput.filename}
                                        onChange={e => setNewVersionInput({ ...newVersionInput, filename: e.target.value })}
                                        className="bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-xs text-white focus:outline-none placeholder:text-slate-600"
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="SHA256 Hash (opcional)"
                                    value={newVersionInput.hash}
                                    onChange={e => setNewVersionInput({ ...newVersionInput, hash: e.target.value })}
                                    className="w-full bg-[#1A1D17] border border-[#2A2E24] rounded-lg px-3 py-2 text-xs text-white focus:outline-none placeholder:text-slate-600"
                                />
                                <button
                                    onClick={handleAddVersion}
                                    disabled={!newVersionInput.version || !newVersionInput.filename}
                                    className="w-full py-2 bg-primary text-black rounded-lg text-xs font-bold disabled:opacity-30"
                                >
                                    Salvar na Biblioteca
                                </button>
                            </div>
                        )}

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {versions.length === 0 ? (
                                <p className="text-[10px] text-slate-500 italic text-center py-4">Nenhum firmware cadastrado</p>
                            ) : (
                                versions.map(v => (
                                    <div
                                        key={v.id}
                                        onClick={() => handleSelectVersion(v)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${firmwareFilename === v.filename
                                            ? 'bg-primary/5 border-primary/40 shadow-[0_0_15px_rgba(202,255,0,0.05)]'
                                            : 'bg-[#0F110D] border-[#2A2E24] hover:border-slate-700'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-white">v{v.version}</span>
                                                {v.isLatest && (
                                                    <span className="text-[8px] bg-primary/20 text-primary border border-primary/30 px-1 rounded uppercase font-black">Latest</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-500 truncate">{v.filename}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {!v.isLatest && (
                                                <button
                                                    onClick={(e) => handleSetLatest(v.id, e)}
                                                    className="p-1.5 rounded-lg border border-[#2A2E24] text-slate-500 hover:text-primary hover:border-primary/40 transition-all shadow-sm"
                                                    title="Marcar como Versão Atual"
                                                >
                                                    <CheckCircle size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleRemoveVersion(v.id, e)}
                                                className="p-1.5 rounded-lg border border-[#2A2E24] text-slate-500 hover:text-red-400 hover:border-red-500/40 transition-all shadow-sm"
                                                title="Remover"
                                            >
                                                <AlertTriangle size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-[#1A1D17] rounded-2xl border border-[#2A2E24] p-6">
                        <h2 className="text-sm font-bold text-slate-200 mb-5 flex items-center gap-2">
                            <Send size={15} className="text-primary" />
                            Configurar Atualização
                        </h2>

                        {/* URL */}
                        <div className="mb-4">
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Globe size={11} /> Arquivo de Firmware
                            </label>
                            <div className={`flex items-center w-full bg-[#0F110D] border ${urlError ? 'border-red-500/60' : 'border-[#2A2E24]'} rounded-xl overflow-hidden focus-within:border-primary/50 transition-colors`}>
                                <span className="px-3 py-3 text-sm text-slate-500 whitespace-nowrap border-r border-[#2A2E24] bg-[#141710] shrink-0">
                                    {FIRMWARE_BASE_URL}
                                </span>
                                <input
                                    type="text"
                                    value={firmwareFilename}
                                    onChange={(e) => { setFirmwareFilename(e.target.value); setUrlError(''); setConfirming(false); }}
                                    placeholder="firmware_v1.2.0.bin"
                                    className="flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none min-w-0"
                                />
                            </div>
                            {urlError && <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1"><AlertTriangle size={11} />{urlError}</p>}
                        </div>

                        {/* Hash */}
                        <div className="mb-6">
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Hash size={11} /> SHA256 (opcional)
                            </label>
                            <input
                                type="text"
                                value={firmwareHash}
                                onChange={(e) => { setFirmwareHash(e.target.value); setConfirming(false); }}
                                placeholder="e3b0c44298fc1c149afb..."
                                className="w-full bg-[#0F110D] border border-[#2A2E24] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-colors"
                            />
                        </div>

                        {/* Selection mode */}
                        <div className="mb-4">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Destino</p>
                            <div className="grid grid-cols-2 gap-2">
                                {(['all', 'individual'] as SelectionMode[]).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => { setSelectionMode(mode); setSelectedIds(new Set()); setConfirming(false); }}
                                        className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${selectionMode === mode
                                            ? 'bg-primary/10 border-primary/40 text-primary'
                                            : 'bg-[#0F110D] border-[#2A2E24] text-slate-500 hover:border-slate-600 hover:text-slate-300'
                                            }`}
                                    >
                                        {mode === 'all' ? `Desatualizados Online (${onlineOutdatedCount})` : 'Selecionar Manualmente'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Device list (individual mode) */}
                        {selectionMode === 'individual' && onlineDevices.length > 0 && (
                            <div className="mb-4 max-h-52 overflow-y-auto space-y-1.5 pr-1">
                                {onlineDevices.map(device => renderDeviceItem(device, true))}
                            </div>
                        )}


                        {/* Warnings */}
                        {!isMqttConnected && (
                            <div className="mb-4 flex items-start gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5 text-[11px]">
                                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                                <span>MQTT desconectado. Conecte-se antes de enviar atualizações.</span>
                            </div>
                        )}

                        {/* Confirm step */}
                        {confirming && (
                            <div className="mb-4 flex items-start gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5 text-[11px]">
                                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                                <span>
                                    <strong>Confirmar?</strong> Isso atualizará {effectiveDeviceIds.length} dispositivo(s).
                                    Os dispositivos irão reiniciar após a instalação.
                                </span>
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!isMqttConnected || !firmwareFilename || effectiveDeviceIds.length === 0 || hasActiveOta}
                            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${confirming
                                ? 'bg-amber-500 hover:bg-amber-600 text-black'
                                : 'bg-primary hover:bg-primary/90 text-black'
                                } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                            {confirming ? (
                                <><AlertTriangle size={16} /> Confirmar Envio ({effectiveDeviceIds.length} dispositivo(s))</>
                            ) : (
                                <><Send size={16} /> Enviar Atualização</>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Right: Progress Table ───────────────────── */}
                <div className="bg-[#1A1D17] rounded-2xl border border-[#2A2E24] p-6 font-sans">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                            <Cpu size={15} className="text-primary" />
                            Status dos Dispositivos
                        </h2>
                    </div>

                    {devices.length === 0 && (
                        <p className="text-[11px] text-slate-500 text-center py-8">Nenhum dispositivo disponível</p>
                    )}

                    <div className="space-y-6 max-h-[520px] overflow-y-auto pr-1">
                        {/* Section: Outdated (Pendentes) */}
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center justify-between gap-2 px-1">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={12} />
                                    Pendentes de Atualização
                                </div>
                                <span className="bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{outdatedDevices.length}</span>
                            </h3>
                            {outdatedDevices.length > 0 ? (
                                outdatedDevices.map(device => renderDeviceItem(device, false))
                            ) : (
                                <p className="text-[10px] text-slate-600 italic px-1">Nenhum dispositivo pendente</p>
                            )}
                        </div>

                        {/* Section: Updated (Atualizados) */}
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-between gap-2 px-1">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={12} />
                                    Dispositivos Atualizados
                                </div>
                                <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{updatedDevices.length}</span>
                            </h3>
                            {updatedDevices.length > 0 ? (
                                updatedDevices.map(device => renderDeviceItem(device, false))
                            ) : (
                                <p className="text-[10px] text-slate-600 italic px-1">Nenhum dispositivo atualizado</p>
                            )}
                        </div>
                    </div>

                    {/* Summary footer */}
                    {Object.keys(progressMap).length > 0 && (
                        <div className="mt-6 pt-4 border-t border-[#2A2E24] grid grid-cols-3 gap-2 text-center">
                            {[
                                { label: 'Pendente', count: Object.values(progressMap).filter(s => s.phase === 'pending').length, color: 'text-amber-400' },
                                { label: 'Em Progresso', count: Object.values(progressMap).filter(s => s.phase === 'downloading' || s.phase === 'installing').length, color: 'text-sky-400' },
                                { label: 'Concluído', count: Object.values(progressMap).filter(s => s.phase === 'success').length, color: 'text-emerald-400' },
                            ].map(item => (
                                <div key={item.label} className="bg-[#0F110D] rounded-xl border border-[#2A2E24] py-2">
                                    <p className={`text-base font-black ${item.color}`}>{item.count}</p>
                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {Object.values(progressMap).some(s => s.phase === 'success') && (
                        <div className="mt-3 flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5 text-[11px]">
                            <CheckCircle2 size={13} />
                            <span>Firmware atualizado com sucesso em {Object.values(progressMap).filter(s => s.phase === 'success').length} dispositivo(s).</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default OtaPanel;
