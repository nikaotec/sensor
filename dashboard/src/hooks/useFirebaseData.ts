import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Device } from '../data/mockData';

export const useFirebaseData = (tenantId: string) => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [history, setHistory] = useState<{ time: string, value: number, timestamp?: number }[]>([]);

    useEffect(() => {
        // Listen to "devices_status" collection for registered devices in real-time
        const qDevices = query(collection(db, "devices_status"));

        const unsubscribeDevices = onSnapshot(qDevices, (snapshot) => {
            const freshDevices: Device[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                freshDevices.push({
                    id: doc.id,
                    name: data.name || 'Dispositivo',
                    tenantId: data.tenantId,
                    type: 'sensor_temp',
                    status: data.status || 'offline',
                    location: data.location || '',
                    telemetry: {
                        temp: data.temperature !== undefined ? data.temperature : 22.5,
                        humidity: data.humidity !== undefined ? data.humidity : 55,
                        batteryVoltage: data.battery !== undefined ? data.battery : 3.6,
                        inputVoltage: data.voltage !== undefined ? data.voltage : 5.0,
                        signal: data.signal !== undefined ? data.signal : -65,
                        doorOpen: data.doorOpen !== undefined ? data.doorOpen : false
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

        // Listen to historical telemetry for charts (limit 20 for example)
        const qHistory = query(collection(db, "telemetry"), orderBy("timestamp", "desc"), limit(20));

        const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
            const hist: any[] = [];
            snapshot.forEach((doc) => {
                hist.push({ id: doc.id, ...doc.data() });
            });
            // Reverse so oldest is first
            setHistory(hist.reverse().map(h => ({
                time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                value: h.temperature || 0,
                timestamp: h.timestamp
            })));
        }, (error) => {
            console.error("Firebase Snapshot Error (history):", error)
        });

        return () => {
            unsubscribeDevices();
            unsubscribeHistory();
        };
    }, [tenantId]);

    return { devices, history };
};
