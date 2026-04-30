/**
 * Serviço modular para processamento e filtragem de telemetria.
 * Segue princípios SOLID para garantir consistência entre diferentes tipos de relatórios.
 */

export interface TelemetryRow {
    id: string;
    device_id: string;
    timestamp: string;
    hora_registro?: string;
    data_registro?: string;
    [key: string]: any;
}

export interface HourGoal {
    hourString: string;
    hNum: number;
    mNum: number;
}

export interface QueryParams {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    selectedHours: string[];
    useSelectedHoursFilter: boolean;
    limit: number;
}

/**
 * Filtra registros de telemetria selecionando o mais próximo de cada horário alvo (snap-to-time).
 * Garante que cada dispositivo tenha apenas um registro por dia para cada horário solicitado.
 */
export const filterTelemetryByTargetHours = (
    rows: TelemetryRow[],
    targetHours: string[]
): TelemetryRow[] => {
    if (!targetHours || targetHours.length === 0) return rows;

    const hourGoals: HourGoal[] = targetHours.map(h => {
        const [hh, mm] = h.split(':').map(Number);
        return { hourString: h, hNum: hh, mNum: mm || 0 };
    });

    const hourNums = hourGoals.map(hg => hg.hNum);

    // 1. Filtragem inicial por hora cheia para performance
    const filteredByHour = rows.filter(row => {
        if (!row.hora_registro) return false;
        const rowHour = parseInt(row.hora_registro.split(':')[0]);
        return hourNums.includes(rowHour);
    });

    // 2. Agrupamento por Dispositivo -> Data -> Hora
    const grouped = new Map<string, TelemetryRow[]>();
    for (const row of filteredByHour) {
        const rowDate = row.timestamp ? row.timestamp.substring(0, 10) : (row.data_registro || 'unknown');
        const rowHour = parseInt(row.hora_registro!.split(':')[0]);

        const key = `${row.device_id}_${rowDate}_${rowHour}`;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key)!.push(row);
    }

    // 3. Seleção do melhor registro (mais próximo do minuto alvo) para cada grupo
    const result: TelemetryRow[] = [];
    for (const groupRows of Array.from(grouped.values())) {
        const firstRow = groupRows[0];
        const rowHour = parseInt(firstRow.hora_registro!.split(':')[0]);
        const goal = hourGoals.find(hg => hg.hNum === rowHour);

        if (!goal) continue;

        let bestRow = groupRows[0];
        let minDiff = Infinity;

        for (const r of groupRows) {
            const [, mStr] = r.hora_registro!.split(':');
            const rowMinute = parseInt(mStr || '0');
            const diff = Math.abs(rowMinute - goal.mNum);

            if (diff < minDiff) {
                minDiff = diff;
                bestRow = r;
            }
        }

        // Ajusta a hora para a string exata do alvo para exibição limpa no relatório
        result.push({
            ...bestRow,
            hora_registro: goal.hourString
        });
    }

    return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

/**
 * Constrói a lista consistente de IDs de dispositivos.
 */
export const getTargetDeviceIds = (
    specificDeviceId: string | null,
    targetTenantId: string | null,
    allDevices: any[]
): string[] => {
    if (specificDeviceId) {
        return [specificDeviceId];
    }

    if (targetTenantId && targetTenantId !== 'all') {
        return allDevices
            .filter(d => d.tenantId === targetTenantId)
            .map(d => d.id);
    }

    return allDevices.map(d => d.id);
};

/**
 * Prepara os parâmetros de consulta baseados no tipo de relatório.
 * Isolamento da lógica de negócio de datas e horários.
 */
export const prepareQueryByReportType = (
    reportType: 'daily' | 'monthly' | 'custom' | 'detailed',
    form: { start_date: string; end_date: string; start_time: string; end_time: string; selected_hours: string[]; use_all_hours: boolean; detailed_hour_start: string }
): QueryParams => {
    const formatSP = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const now = new Date();
    const today = formatSP(now);

    switch (reportType) {
        case 'daily':
            return {
                startDate: today,
                endDate: today,
                startTime: '00:00',
                endTime: '23:59',
                selectedHours: form.selected_hours?.length > 0 ? form.selected_hours : ['08:00', '16:00'],
                useSelectedHoursFilter: true,
                limit: 10000
            };

        case 'monthly':
            const firstDay = new Date();
            // Primeiro dia do mês atual às 00:00:00 no horário local (São Paulo)
            firstDay.setHours(0, 0, 0, 0);
            firstDay.setDate(1);
            return {
                startDate: formatSP(firstDay),
                endDate: today,
                startTime: '00:00',
                endTime: '23:59',
                selectedHours: form.selected_hours?.length > 0 ? form.selected_hours : ['08:00', '16:00'],
                useSelectedHoursFilter: true,
                limit: 10000
            };

        case 'detailed':
            const [h] = form.detailed_hour_start.split(':').map(Number);
            const endTimeDetailed = `${(h + 1).toString().padStart(2, '0')}:${form.detailed_hour_start.split(':')[1]}`;
            return {
                startDate: form.start_date,
                endDate: form.start_date,
                startTime: form.detailed_hour_start,
                endTime: endTimeDetailed,
                selectedHours: [],
                useSelectedHoursFilter: false,
                limit: 2000
            };

        case 'custom':
        default:
            return {
                startDate: form.start_date,
                endDate: form.end_date,
                startTime: form.start_time,
                endTime: form.end_time,
                selectedHours: form.selected_hours,
                useSelectedHoursFilter: !form.use_all_hours,
                limit: 10000
            };
    }
};
