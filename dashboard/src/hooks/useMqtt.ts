import { useState, useEffect } from 'react';
import { devices as initialDevices } from '../data/mockData';
import telemetryStore from '../data/telemetry.json';
import type { Device } from '../data/mockData';

export const useMqtt = (tenantId: string) => {
    const [devices, setDevices] = useState<Device[]>(initialDevices);
    const [history, setHistory] = useState<{ time: string, value: number, timestamp?: number }[]>([]);

    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        // Trigger a re-render every minute to constantly evaluate offline status
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const tenantDevices = initialDevices.filter(d => d.tenantId === tenantId);

        // n8n sends data in: telemetryStore.data.data
        if (telemetryStore && telemetryStore.data) {
            const wrapper = telemetryStore.data as any;
            const freshData = wrapper.data || wrapper; // Handle both direct and nested structure

            const lastUpdateDate = (telemetryStore as any).lastUpdate ? new Date((telemetryStore as any).lastUpdate).getTime() : 0;
            const isOffline = (now - lastUpdateDate) > 3 * 60 * 1000; // 3 minutes without data = offline

            // Set history if available
            if ((telemetryStore as any).history) {
                setHistory((telemetryStore as any).history);
            }

            // Check if this data belongs to this tenant or if we should apply it to the mock device
            if (wrapper.tenantId === tenantId || !wrapper.tenantId) {
                const updated = tenantDevices.map(d => {
                    // Match by deviceId from n8n or generic 'Smart Meter' name
                    if (d.id === wrapper.deviceId || d.name.includes('Smart Meter')) {
                        return {
                            ...d,
                            name: freshData.deviceName || freshData.name || wrapper.deviceName || wrapper.name || d.name,
                            status: isOffline ? 'offline' : 'online',
                            telemetry: {
                                ...d.telemetry,
                                temp: freshData.temperature ?? d.telemetry.temp,
                                tempMax: freshData.dailyStats?.maxTemp ?? freshData.tempMax ?? d.telemetry.tempMax,
                                tempMin: freshData.dailyStats?.minTemp ?? freshData.tempMin ?? d.telemetry.tempMin,
                                humidity: freshData.humidity ?? d.telemetry.humidity,
                                batteryVoltage: freshData.battery ?? d.telemetry.batteryVoltage,
                                inputVoltage: freshData.voltage ?? d.telemetry.inputVoltage,
                                signal: freshData.signalStrength ?? d.telemetry.signal,
                                doorOpen: freshData.doorOpen // Novo campo
                            },
                            config: wrapper.config || freshData.config || d.config
                        } as Device;
                    }
                    return d;
                });
                setDevices(updated);
            } else {
                setDevices(tenantDevices);
            }
        } else {
            setDevices(tenantDevices);
        }

    }, [tenantId, telemetryStore]);

    return { devices, history };
};
