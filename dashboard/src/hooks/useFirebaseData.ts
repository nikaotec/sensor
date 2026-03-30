import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Device } from '../data/mockData';

export interface DeviceEvent {
    id: string;
    deviceId: string;
    type: string;
    msg?: string;
    message?: string;
    timestamp: string;
    tenantId: string;
}

export const useFirebaseData = (tenantId: string, deviceId?: string, userRole?: string) => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [history, setHistory] = useState<{ time: string, value: number, timestamp?: number }[]>([]);
    const [events, setEvents] = useState<DeviceEvent[]>([]);

    const isManager = userRole === 'manager' || userRole === 'gestor';

    useEffect(() => {
        // Listen to devices with Role-based access
        let qDevices;

        if (isManager && tenantId === 'all') {
            // Gestores podem ver todos os dispositivos
            qDevices = query(collection(db, "devices_status"));
        } else if (tenantId && tenantId !== 'all') {
            // Outros usuários ou quando tenantId é específico: filtra por empresa
            qDevices = query(collection(db, "devices_status"), where("tenantId", "==", tenantId));
        } else {
            // Caso padrão ou fallback, talvez sem resultados se tenantId for 'all' e não for manager
            // Ou se tenantId for undefined/null. Pode-se ajustar para um array vazio ou uma query que não retorne nada.
            // Por enquanto, vamos manter uma query que não filtra por tenantId, e o filtro será feito no cliente.
            // A filtragem no cliente já existe, então esta query pode ser a mais abrangente.
            qDevices = query(collection(db, "devices_status"));
        }

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
                        tempMax: data.tempMax !== undefined ? data.tempMax
                            : (dailyStats.maxTemp !== undefined ? dailyStats.maxTemp : undefined),
                        tempMin: data.tempMin !== undefined ? data.tempMin
                            : (dailyStats.minTemp !== undefined ? dailyStats.minTemp : undefined),
                        tempExt: data.tempExt !== undefined ? data.tempExt : (data.externalTemperature !== undefined ? data.externalTemperature : undefined),
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
        const dateLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const twentyFourHoursAgoTS = Timestamp.fromDate(dateLimit);

        const qHistory = deviceId
            ? query(
                collection(db, "telemetry"),
                where("deviceId", "==", deviceId),
                where("timestamp", ">=", twentyFourHoursAgoTS),
                orderBy("timestamp", "asc")
            )
            : query(
                collection(db, "telemetry"),
                where("timestamp", ">=", twentyFourHoursAgoTS),
                orderBy("timestamp", "asc")
            );

        const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
            const hist: any[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                let date: Date;

                if (data.timestamp?.seconds) {
                    date = new Date(data.timestamp.seconds * 1000);
                } else if (typeof data.timestamp === 'string') {
                    date = new Date(data.timestamp);
                } else {
                    date = new Date();
                }

                hist.push({
                    time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    value: data.temperature ?? data.temp ?? data.TEMP_ATUAL ?? data.temp_atual ?? 0,
                    timestamp: data.timestamp
                });
            });
            setHistory(hist);
        }, (error: any) => {
            console.error("Firebase Snapshot Error (history):", error);
            if (error.code === 'failed-precondition' || error.message?.includes('index')) {
                console.warn("⚠️ Firestore: Esta query requer um índice composto (deviceId: asc, timestamp: asc). Verifique o link no console do Firebase.");
            }
        });

        // Listen to events with Role-based access
        let qEvents;

        if (deviceId) {
            // Se deviceId for especificado, mostra eventos desse dispositivo específico
            qEvents = query(collection(db, "events"), where("deviceId", "==", deviceId), orderBy("timestamp", "desc"), limit(50));
        } else if (isManager && tenantId === 'all') {
            // Gestores podem ver tudo se selecionarem 'all'
            qEvents = query(collection(db, "events"), orderBy("timestamp", "desc"), limit(50));
        } else {
            // Outros usuários ou quando tenantId é específico: filtra por empresa
            // Se tenantId for 'all' mas não for gestor, devíamos forçar um ID? 
            // Vamos assumir que o tenantId passado já é o correto do usuário se não for 'all'
            const finalTenantId = (tenantId === 'all') ? 'none' : tenantId;
            qEvents = query(collection(db, "events"), where("tenantId", "==", finalTenantId), orderBy("timestamp", "desc"), limit(50));
        }

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

export const useUsers = (userRole?: string) => {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userRole !== 'manager' && userRole !== 'gestor') {
            setIsLoading(false);
            return;
        }

        const q = query(collection(db, 'users'), orderBy('email'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersList: any[] = [];
            snapshot.forEach((doc) => {
                usersList.push({ id: doc.id, ...doc.data() });
            });
            setUsers(usersList);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao carregar usuários:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userRole]);

    return { users, isLoading };
};
