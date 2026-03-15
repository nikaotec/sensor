import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Device } from '../data/mockData';

export const useFirebaseData = (tenantId: string) => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [history, setHistory] = useState<{ time: string, value: number, timestamp?: number }[]>([]);

    useEffect(() => {
        // Listen to "devices" collection for registered devices in real-time
        const qDevices = query(collection(db, "devices"));

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
                    location: data.location || 'Sede',
                    telemetry: data.telemetry || {
                        temp: 22.5, // values can be populated by MQTT hook
                        humidity: 55,
                        batteryVoltage: 3.6,
                        inputVoltage: 5.0,
                        signal: -65,
                        doorOpen: false
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
