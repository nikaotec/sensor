import { useState } from 'react';
import { supabase } from '../supabase/config';

// Constante para a URL do webhook
export const REPORT_WEBHOOK_URL = 'https://n8n.nikaotech.com/webhook/generate-report';

export interface ReportForm {
    type: string;
    tenant_id: string;
    device_id: string;
    start_date: string;
    end_date: string;
    start_time: string;
    end_time: string;
    report_preset: string;
    selected_hours: string[];
    use_all_hours: boolean;
    mensage_tipo: string[];
}

export const getDefaultReportDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);

    // Usar data local de São Paulo para evitar virada de dia UTC precoce
    const formatSP = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

    return {
        start_date: formatSP(start),
        end_date: formatSP(end),
        start_time: '00:00',
        end_time: '23:59',
        selected_hours: [],
        use_all_hours: true,
        mensage_tipo: ['periodico', 'relatorio_diario', 'ALERTA_TEMP_ALTA', 'ALERTA_TEMP_BAIXA', 'TEMP_NORMALIZADA']
    };
};

export const useReportGenerator = (
    currentTenant: any,
    availableTenants: any[],
    supabaseDevices: any[],
    displayDevices: any[],
    userRole?: string
) => {
    const [reportForm, setReportForm] = useState<ReportForm>({
        type: 'company',
        tenant_id: '',
        device_id: '',
        start_date: getDefaultReportDates().start_date,
        end_date: getDefaultReportDates().end_date,
        start_time: getDefaultReportDates().start_time,
        end_time: getDefaultReportDates().end_time,
        report_preset: '',
        selected_hours: [],
        use_all_hours: true,
        mensage_tipo: ['periodico', 'relatorio_diario', 'ALERTA_TEMP_ALTA', 'ALERTA_TEMP_BAIXA', 'TEMP_NORMALIZADA']
    });

    const [generatingReport, setGeneratingReport] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    const openReportModal = () => {
        const dates = getDefaultReportDates();
        setReportForm({
            type: 'company',
            tenant_id: currentTenant?.id && currentTenant.id !== 'all' ? currentTenant.id : '',
            device_id: '',
            start_date: dates.start_date,
            end_date: dates.end_date,
            start_time: dates.start_time,
            end_time: dates.end_time,
            report_preset: '',
            selected_hours: [],
            use_all_hours: true,
            mensage_tipo: ['periodico', 'relatorio_diario', 'ALERTA_TEMP_ALTA', 'ALERTA_TEMP_BAIXA', 'TEMP_NORMALIZADA']
        });
        setShowReportModal(true);
    };

    const formatDateTime = (dateStr: string, timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const [year, month, day] = dateStr.split('-').map(Number);

        // Força o fuso horário de Brasília (-03:00) explicitamente na string ISO
        const pad = (num: number) => num.toString().padStart(2, '0');
        return `${year}-${pad(month)}-${pad(day)}T${pad(hours || 0)}:${pad(minutes || 0)}:00-03:00`;
    };

    const applyPreset = (presetId: string) => {
        const now = new Date();
        const formatSP = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
        const today = formatSP(now);

        let updates: Partial<ReportForm> = { report_preset: presetId };

        if (presetId === 'daily_8_16') {
            updates = {
                ...updates,
                start_date: today,
                end_date: today,
                use_all_hours: false,
                selected_hours: ['08:00', '16:00']
            };
        } else if (presetId === 'month_8_16') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            updates = {
                ...updates,
                start_date: formatSP(firstDay),
                end_date: formatSP(lastDay),
                use_all_hours: false,
                selected_hours: ['08:00', '16:00']
            };
        } else if (presetId === 'geral') {
            const dates = getDefaultReportDates();
            updates = {
                ...updates,
                ...dates,
                report_preset: 'geral',
                use_all_hours: true
            };
        }

        setReportForm(prev => ({ ...prev, ...updates }));
    };

    const handleGenerateReport = async () => {
        const selectedTenant = availableTenants.find(t => t.id === reportForm.tenant_id) || (currentTenant.id !== 'all' ? currentTenant : null);
        const tenantId = selectedTenant?.id;
        const companyName = selectedTenant?.name || 'Geral';

        const effectiveType = reportForm.report_preset === 'daily_8_16'
            ? 'diario'
            : reportForm.device_id ? 'device' : 'company';

        setGeneratingReport(true);
        try {
            const startISO = formatDateTime(reportForm.start_date, reportForm.start_time);
            const endISO = formatDateTime(reportForm.end_date, reportForm.end_time);

            let targetDeviceIds: string[] = [];
            const targetTenantId = reportForm.tenant_id || (currentTenant.id !== 'all' ? currentTenant.id : '');

            if (effectiveType === 'device') {
                targetDeviceIds = reportForm.device_id ? [reportForm.device_id] : [];
            } else {
                const companyDevices = (targetTenantId && targetTenantId !== '')
                    ? supabaseDevices.filter(d => d.tenantId === targetTenantId)
                    : displayDevices;
                targetDeviceIds = companyDevices.map(d => d.id);
            }

            if (targetDeviceIds.length === 0) {
                alert(`Nenhum dispositivo encontrado. Adicione dispositivos ou escolha outra empresa.`);
                setGeneratingReport(false);
                return;
            }

            // Lógica de Filtragem Separada (Evita que um modo interfira no outro)
            let telemetryRows: any[] = [];
            let fetchError: any = null;

            const isPreset816 = reportForm.report_preset === 'daily_8_16' || reportForm.report_preset === 'month_8_16';

            if (isPreset816) {
                // CAMINHO PRESETS (08/16): Apenas registros periódicos dos horários exatos
                const selectedHourNums = reportForm.selected_hours.map(h => parseInt(String(h).split(':')[0]));

                const { data, error } = await supabase
                    .from('telemetry')
                    .select('*')
                    .in('device_id', targetDeviceIds)
                    .gte('data_registro', reportForm.start_date)
                    .lte('data_registro', reportForm.end_date)
                    .in('mensage_tipo', ['periodico', 'relatorio_diario']) // Apenas periódicos, remove ruído de alertas
                    .order('data_registro', { ascending: true })
                    .order('hora_registro', { ascending: true })
                    .limit(10000);

                telemetryRows = data || [];
                fetchError = error;

                // Filtro rigoroso no JS para garantir apenas as horas 08 e 16 (independente de segundos)
                telemetryRows = telemetryRows.filter(row => {
                    if (!row.hora_registro) return false;
                    const rowHour = parseInt(row.hora_registro.split(':')[0]);
                    return selectedHourNums.includes(rowHour);
                });
            } else {
                // CAMINHO MANUAL: Precisão de minutos via timestamp ISO completo
                const standardTypes = ['periodico', 'relatorio_diario', 'ALERTA_TEMP_ALTA', 'ALERTA_TEMP_BAIXA', 'TEMP_NORMALIZADA'];

                const { data, error } = await supabase
                    .from('telemetry')
                    .select('*')
                    .in('device_id', targetDeviceIds)
                    .gte('timestamp', startISO)
                    .lte('timestamp', endISO)
                    .in('mensage_tipo', standardTypes)
                    .order('timestamp', { ascending: true })
                    .limit(10000);

                telemetryRows = data || [];
                fetchError = error;
            }

            if (fetchError) console.error('Erro ao buscar registros:', fetchError);

            if (!telemetryRows || telemetryRows.length === 0) {
                alert(`Nenhum registro de telemetria encontrado para o período ou horários selecionados.`);
                setGeneratingReport(false);
                return;
            }

            // Os dados já saem filtrados dos blocos acima
            let filteredRows = telemetryRows;

            if (filteredRows.length === 0) {
                alert(`Nenhum registro encontrado para os horários selecionados no período.`);
                setGeneratingReport(false);
                return;
            }

            // Enriquecer dados com nomes/locais para facilitar o PDF
            const enrichedRows = filteredRows.map(row => {
                const dev = supabaseDevices.find(d => d.id === row.device_id);
                return {
                    ...row,
                    device_name: dev?.name || row.device_id,
                    location: dev?.location || 'Não informada'
                };
            });

            const payload: any = {
                type: effectiveType,
                start_date: startISO,
                end_date: endISO,
                company_name: companyName,
                selected_hours: reportForm.use_all_hours ? [] : reportForm.selected_hours,
                use_all_hours: reportForm.use_all_hours,
                report_preset: reportForm.report_preset,
                mensage_tipo: reportForm.mensage_tipo,
                is_gestor: userRole === 'manager' || userRole === 'gestor',
                telemetry_data: enrichedRows // Enviando dados já filtrados e processados
            };

            if (tenantId) payload.tenant_id = tenantId;

            if (effectiveType === 'device') {
                const device = enrichedRows.find(d => d.device_id === reportForm.device_id) || { device_name: reportForm.device_id };
                payload.device_id = reportForm.device_id;
                payload.device_name = device.device_name;
            } else {
                payload.device_ids = targetDeviceIds;
                payload.device_name = 'Todos os dispositivos';
                payload.ala = 'Geral';
            }

            const response = await fetch(REPORT_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const responseText = await response.text();
                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Erro ao processar resposta JSON do n8n:', responseText);
                    alert("O servidor retornou uma resposta inválida. O relatório pode não ter sido gerado.");
                    setGeneratingReport(false);
                    return;
                }

                if (result.pdf_base64) {
                    const linkSource = `data:application/pdf;base64,${result.pdf_base64}`;
                    const downloadLink = document.createElement("a");
                    const todaySP = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
                    const fileName = `relatorio_${reportForm.device_id || 'geral'}_${todaySP}.pdf`;
                    downloadLink.href = linkSource;
                    downloadLink.download = fileName;
                    downloadLink.click();
                    alert("Relatório gerado e baixado com sucesso!");
                } else {
                    alert("Relatório gerado com sucesso!");
                }
            } else {
                const errorText = await response.text();
                console.error('Erro no webhook (status ' + response.status + '):', errorText);
                alert(`Erro ao gerar relatório (${response.status}). Verifique os dados e tente novamente.`);
            }
            setShowReportModal(false);
        } catch (err) {
            console.error('Error generating report:', err);
            alert("Erro ao gerar relatório.");
        } finally {
            setGeneratingReport(false);
        }
    };

    return {
        reportForm,
        setReportForm,
        applyPreset,
        generatingReport,
        showReportModal,
        setShowReportModal,
        openReportModal,
        handleGenerateReport
    };
};
