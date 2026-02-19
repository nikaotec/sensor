import { useState, useEffect } from 'react';
import { devices as initialDevices } from '../data/mockData';
import type { Device } from '../data/mockData';

export const useMqtt = (tenantId: string) => {
    const [devices, setDevices] = useState<Device[]>(initialDevices);

    useEffect(() => {
        // Filtrar dispositivos iniciais por tenant
        setDevices(initialDevices.filter(d => d.tenantId === tenantId));

        // Em um cenário real, o n8n ou um backend enviaria eventos SSE
        // Exemplo de como seria a conexão:
        /*
        const eventSource = new EventSource(`http://backend-api.com/telemetry/stream?tenantId=${tenantId}`);
        
        eventSource.onmessage = (event) => {
            const freshData = JSON.parse(event.data);
            setDevices(prev => prev.map(d => 
                d.id === freshData.id ? { ...d, telemetry: freshData.telemetry, status: 'online' } : d
            ));
        };

        return () => eventSource.close();
        */

        // Para fins de demonstração offline do fluxo n8n:
        const interval = setInterval(() => {
            // Simulação de pulso de dados em tempo real
            setDevices(prev => prev.map(d => ({
                ...d,
                telemetry: {
                    ...d.telemetry,
                    temp: (d.telemetry?.temp || 25) + (Math.random() * 0.4 - 0.2)
                }
            })));
        }, 5000);

        return () => clearInterval(interval);

    }, [tenantId]);

    return { devices };
};
