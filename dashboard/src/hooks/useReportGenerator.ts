import { useState, useCallback } from 'react';
import { supabase } from '../supabase/config';
import { filterTelemetryByTargetHours, getTargetDeviceIds, prepareQueryByReportType } from '../services/telemetryProcessor';

// Chave de persistência no localStorage para horários do relatório Diário
const DAILY_HOURS_KEY = 'nikaotec_daily_report_hours';

const loadDailyHours = (): string[] => {
    try {
        const saved = localStorage.getItem(DAILY_HOURS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as string[];
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch { /* ignora erro de parse */ }
    return ['08:00', '16:00']; // Padrão
};

const saveDailyHoursToStorage = (hours: string[]) => {
    try { localStorage.setItem(DAILY_HOURS_KEY, JSON.stringify(hours)); }
    catch { /* ignora erro de cota */ }
};

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
    report_preset: string; // Usado para compatibilidade com presets antigos se necessário
    report_type: 'daily' | 'monthly' | 'custom' | 'detailed';
    selected_hours: string[];
    use_all_hours: boolean;
    mensage_tipo: string[];
    selected_variables: string[];
    detailed_hour_start: string;
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
        report_type: 'custom',
        selected_hours: ['08:00', '16:00'],
        use_all_hours: true,
        mensage_tipo: ['periodico', 'relatorio_diario', 'ALERTA_TEMP_ALTA', 'ALERTA_TEMP_BAIXA', 'TEMP_NORMALIZADA'],
        selected_variables: ['temperature', 'humidity', 'voltage'],
        detailed_hour_start: '08:00'
    });

    const [generatingReport, setGeneratingReport] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    const openReportModal = () => {
        const dates = getDefaultReportDates();
        const savedDailyHours = loadDailyHours();
        setReportForm({
            type: 'company',
            tenant_id: currentTenant?.id && currentTenant.id !== 'all' ? currentTenant.id : '',
            device_id: '',
            start_date: dates.start_date,
            end_date: dates.end_date,
            start_time: dates.start_time,
            end_time: dates.end_time,
            report_preset: '',
            report_type: 'custom',
            selected_hours: savedDailyHours,
            use_all_hours: true,
            mensage_tipo: ['periodico', 'relatorio_diario', 'ALERTA_TEMP_ALTA', 'ALERTA_TEMP_BAIXA', 'TEMP_NORMALIZADA'],
            selected_variables: ['temperature', 'temp_max', 'temp_min', 'temp_ext', 'humidity', 'voltage', 'battery'],
            detailed_hour_start: '08:00'
        });
        setShowReportModal(true);
    };

    // Persiste os horários ao serem alterados no modo Diário
    const saveDailyHours = useCallback((hours: string[]) => {
        saveDailyHoursToStorage(hours);
        setReportForm(prev => ({ ...prev, selected_hours: hours, use_all_hours: false }));
    }, []);

    const formatDateTime = (dateStr: string, timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const [year, month, day] = dateStr.split('-').map(Number);

        // Força o fuso horário de Brasília (-03:00) explicitamente na string ISO
        const pad = (num: number) => num.toString().padStart(2, '0');
        return `${year}-${pad(month)}-${pad(day)}T${pad(hours || 0)}:${pad(minutes || 0)}:00-03:00`;
    };


    const handleGenerateReport = async () => {
        const selectedTenant = availableTenants.find(t => t.id === reportForm.tenant_id) || (currentTenant.id !== 'all' ? currentTenant : null);
        const tenantId = selectedTenant?.id;
        const companyName = selectedTenant?.name || 'Geral';

        setGeneratingReport(true);
        try {
            // Modularização: Prepara parâmetros baseado no tipo de relatório
            const queryParams = prepareQueryByReportType(reportForm.report_type, reportForm);

            const startISO = formatDateTime(queryParams.startDate, queryParams.startTime);
            const endISO = formatDateTime(queryParams.endDate, queryParams.endTime);

            const targetTenantId = reportForm.tenant_id || (currentTenant.id !== 'all' ? currentTenant.id : null);
            const targetDeviceIds = getTargetDeviceIds(
                reportForm.device_id || null,
                targetTenantId,
                supabaseDevices
            );

            if (targetDeviceIds.length === 0) {
                alert(`Nenhum dispositivo encontrado.`);
                setGeneratingReport(false);
                return;
            }

            // BUSCA NO SUPABASE (Modularizada via queryParams)
            const { data, error } = await supabase
                .from('telemetry')
                .select('*')
                .in('device_id', targetDeviceIds)
                .gte('timestamp', startISO)
                .lte('timestamp', endISO)
                .order('timestamp', { ascending: true })
                .limit(queryParams.limit);

            if (error) throw error;

            let telemetryRows = data || [];

            // Filtro de Horas (Snap-to-time) via Serviço Modular
            if (queryParams.useSelectedHoursFilter && queryParams.selectedHours.length > 0) {
                telemetryRows = filterTelemetryByTargetHours(telemetryRows, queryParams.selectedHours);
            }

            if (!telemetryRows || telemetryRows.length === 0) {
                alert(`Nenhum registro de telemetria encontrado para o período ou horários selecionados.`);
                setGeneratingReport(false);
                return;
            }

            // Enriquecer dados com nomes/locais para facilitar o PDF
            const enrichedRows = telemetryRows.map(row => {
                const dev = supabaseDevices.find(d => d.id === row.device_id);
                return {
                    ...row,
                    device_name: dev?.name || row.device_id,
                    location: dev?.location || 'Não informada'
                };
            });

            const payload: any = {
                report_type: reportForm.report_type,
                start_date: startISO,
                end_date: endISO,
                company_name: companyName,
                selected_hours: queryParams.selectedHours,
                use_all_hours: reportForm.use_all_hours,
                mensage_tipo: reportForm.mensage_tipo,
                selected_variables: reportForm.selected_variables,
                is_gestor: userRole === 'manager' || userRole === 'gestor',
                telemetry_data: enrichedRows
            };

            if (tenantId) payload.tenant_id = tenantId;

            if (reportForm.device_id) {
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
            // Modal permanece aberto — usuário fecha manualmente pelo X ou Cancelar
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
        saveDailyHours,
        generatingReport,
        showReportModal,
        setShowReportModal,
        openReportModal,
        handleGenerateReport
    };
};
