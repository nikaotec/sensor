import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Device } from '../data/mockData';

export interface DeviceEvent {
    id: string;
    deviceId: string;
    type: string;
    msg: string;
    timestamp: string;
    tenantId: string;
}

export const useFirebaseData = (tenantId: string, deviceId?: string) => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [history, setHistory] = useState<{ time: string, value: number, timestamp?: number }[]>([]);
    const [events, setEvents] = useState<DeviceEvent[]>([]);

    useEffect(() => {
        // Listen to "devices_status" collection for registered devices in real-time
        const qDevices = query(collection(db, "devices_status"));

        const unsubscribeDevices = onSnapshot(qDevices, (snapshot) => {
            const freshDevices: Device[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();

                // Mapeia dailyStats caso o n8n grave em subcampo
                const dailyStats = data.dailyStats || {};

                freshDevices.push({
                    id: doc.id,
                    name: data.name || data.deviceName || doc.id,
                    tenantId: data.tenantId,
                    type: 'sensor_temp',
                    status: data.status || 'offline',
                    location: data.location || data.locationId || '',
                    lastSeen: data.lastSeen || data.updatedAt || '',
                    telemetry: {
                        // Usa undefined quando o campo não existe (sem fallback hardcoded)
                        temp: data.temperature !== undefined ? data.temperature : undefined,
                        humidity: data.humidity !== undefined ? data.humidity : undefined,
                        batteryVoltage: data.battery !== undefined ? data.battery : undefined,
                        inputVoltage: data.voltage !== undefined ? data.voltage : undefined,
                        signal: data.signal !== undefined ? data.signal : (data.signalStrength !== undefined ? data.signalStrength : undefined),
                        doorOpen: data.doorOpen !== undefined ? data.doorOpen : undefined,
                        // Máxima e mínima diárias (gravadas pelo n8n em dailyStats)
                        tempMax: data.tempMax !== undefined ? data.tempMax
                            : (dailyStats.maxTemp !== undefined ? dailyStats.maxTemp : undefined),
                        tempMin: data.tempMin !== undefined ? data.tempMin
                            : (dailyStats.minTemp !== undefined ? dailyStats.minTemp : undefined),
                    }
                } as Device);
            });

            const filteredDevices = tenantId === 'all'
                ? freshDevices
                : freshDevices.filter(d => d.tenantId === tenantId);

            setDevices(filteredDevices);
        }, (error) => {
            console.error("Firebase Snapshot Error (devices):", error);
        });

        // Listen to historical telemetry for charts (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const qHistory = deviceId
            ? query(
                collection(db, "telemetry"),
                where("deviceId", "==", deviceId),
                where("timestamp", ">=", twentyFourHoursAgo),
                orderBy("timestamp", "asc")
            )
            : query(
                collection(db, "telemetry"),
                where("timestamp", ">=", twentyFourHoursAgo),
                orderBy("timestamp", "asc")
            );

        const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
            const hist: any[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                hist.push({
                    time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    value: data.temperature !== undefined ? data.temperature : (data.temp !== undefined ? data.temp : 0),
                    timestamp: data.timestamp
                });
            });
            setHistory(hist);
        }, (error) => {
            console.error("Firebase Snapshot Error (history):", error);
        });

        // Listen to events
        const qEvents = deviceId
            ? query(collection(db, "events"), where("deviceId", "==", deviceId), orderBy("timestamp", "desc"), limit(10))
            : query(collection(db, "events"), orderBy("timestamp", "desc"), limit(10));

        const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
            const freshEvents: DeviceEvent[] = [];
            snapshot.forEach((doc) => {
                freshEvents.push({ id: doc.id, ...doc.data() } as DeviceEvent);
            });
            setEvents(freshEvents);
        }, (error) => {
            console.error("Firebase Snapshot Error (events):", error);
        });

        return () => {
            unsubscribeDevices();
            unsubscribeHistory();
            unsubscribeEvents();
        };
    }, [tenantId, deviceId]);

    return { devices, history, events };
};
