import type { Device } from '../data/mockData';

export type DeviceTelemetry = Device['telemetry'];

export class TelemetryService {
    /**
     * Normaliza o payload recebido via MQTT para o formato padrão do sistema.
     * Suporta múltiplas versões de firmware (campos em maiúsculas e minúsculas).
     */
    static normalizePayload(payload: any): Partial<DeviceTelemetry> & { id?: string, company?: string, device_name?: string, ala?: string } {
        const normalized: any = {};

        // Helper para adicionar apenas valores definidos
        const addIfDefined = (key: string, value: any) => {
            if (value !== undefined && value !== null) {
                normalized[key] = value;
            }
        };

        // Identificadores base
        addIfDefined('id', payload.id || payload.ID_DISPOSITIVO);
        addIfDefined('company', payload.company || payload.EMPRESA);
        addIfDefined('device_name', payload.device_name || payload.DISPOSITIVO);
        addIfDefined('ala', payload.ala !== undefined ? payload.ala : payload.ALA);

        // Temperaturas
        addIfDefined('temp', this.parseNumber(payload.temp ?? payload.temperature ?? payload.TEMP ?? payload.TEMP_ATUAL ?? payload.TEMP_C));
        addIfDefined('tempMax', this.parseNumber(payload.tempMax ?? payload.temp_max ?? payload.TEMP_MAX ?? payload.MAX));
        addIfDefined('tempMin', this.parseNumber(payload.tempMin ?? payload.temp_min ?? payload.TEMP_MIN ?? payload.MIN));
        addIfDefined('tempExt', this.parseNumber(payload.tempExt ?? payload.temp_ext ?? payload.TEMP_EXTERNA));

        // Sensores e Energia
        addIfDefined('batteryVoltage', this.parseNumber(payload.batteryVoltage ?? payload.battery ?? payload.BATERIA));
        addIfDefined('inputVoltage', this.parseNumber(payload.inputVoltage ?? payload.voltage ?? payload.VOLTAGEM));
        addIfDefined('signal', this.parseNumber(payload.signal ?? payload.RSSI));
        addIfDefined('humidity', this.parseNumber(payload.humidity ?? payload.UMIDADE));

        // Limites de Alerta (Suporte Supabase snake_case + MQTT UPPER_CASE)
        addIfDefined('alarmMax', this.parseNumber(payload.alarmMax ?? payload.temp_max ?? payload.ALARM_MAX));
        addIfDefined('alarmMin', this.parseNumber(payload.alarmMin ?? payload.temp_min ?? payload.ALARM_MIN));
        addIfDefined('voltMaxLimit', this.parseNumber(payload.voltMaxLimit ?? payload.volt_max ?? payload.VOLT_MAX_LIMIT));
        addIfDefined('voltMinLimit', this.parseNumber(payload.voltMinLimit ?? payload.volt_min ?? payload.VOLT_MIN_LIMIT));
        addIfDefined('batMinLimit', this.parseNumber(payload.batMinLimit ?? payload.bat_min ?? payload.BAT_MIN_LIMIT));
        addIfDefined('doorMaxTime', this.parseNumber(payload.doorMaxTime ?? payload.tempo_porta ?? payload.TEMPO_PORTA));

        // Estado de Monitoramento (CHK_*)
        if (payload.chk_volt !== undefined) addIfDefined('chkVolt', !!payload.chk_volt);
        else if (payload.CHK_VOLT !== undefined) addIfDefined('chkVolt', !!payload.CHK_VOLT);

        if (payload.chk_bat !== undefined) addIfDefined('chkBat', !!payload.chk_bat);
        else if (payload.CHK_BAT !== undefined) addIfDefined('chkBat', !!payload.CHK_BAT);

        if (payload.chk_temp !== undefined) addIfDefined('chkTemp', !!payload.chk_temp);
        else if (payload.CHK_TEMP !== undefined) addIfDefined('chkTemp', !!payload.CHK_TEMP);

        if (payload.chk_door !== undefined) addIfDefined('chkDoor', !!payload.chk_door);
        else if (payload.CHK_DOOR !== undefined) addIfDefined('chkDoor', !!payload.CHK_DOOR);

        // Porta
        if (payload.door_open !== undefined) addIfDefined('doorOpen', !!payload.door_open);
        else if (payload.PORTA_ABERTA !== undefined) addIfDefined('doorOpen', !!payload.PORTA_ABERTA);

        addIfDefined('secondsOpen', this.parseNumber(payload.secondsOpen ?? payload.SEC_ABERTA));

        if (payload.silenciado !== undefined) addIfDefined('silenced', !!payload.silenciado);
        else if (payload.SILENCIADO !== undefined) addIfDefined('silenced', !!payload.SILENCIADO);

        // Relés e Histerese
        if (payload.RELES?.R0 !== undefined) addIfDefined('rele0', !!payload.RELES.R0);
        else if (payload.rele0 !== undefined) addIfDefined('rele0', !!payload.rele0);
        else if (payload.rele !== undefined) addIfDefined('rele0', !!payload.rele);

        if (payload.RELES?.R1 !== undefined) addIfDefined('rele1', !!payload.RELES.R1);
        else if (payload.rele1 !== undefined) addIfDefined('rele1', !!payload.rele1);

        if (payload.RELES?.R2 !== undefined) addIfDefined('rele2', !!payload.RELES.R2);
        else if (payload.rele2 !== undefined) addIfDefined('rele2', !!payload.rele2);

        if (payload.RELES?.R3 !== undefined) addIfDefined('rele3', !!payload.RELES.R3);
        else if (payload.rele3 !== undefined) addIfDefined('rele3', !!payload.rele3);

        // Campos de Sincronia de Histerese
        addIfDefined('R0_TEMP_ON', this.parseNumber(payload.R0_TEMP_ON ?? payload.r0_temp_on));
        addIfDefined('R0_TEMP_OFF', this.parseNumber(payload.R0_TEMP_OFF ?? payload.r0_temp_off));
        addIfDefined('R0_FUNC', payload.R0_FUNC ?? payload.r0_func);

        // Info Técnica
        addIfDefined('ip', payload.IP_LOCAL ?? payload.ip);
        addIfDefined('uptime', this.parseNumber(payload.UPTIME ?? payload.uptime));
        addIfDefined('protocolo', payload.PROTOCOLO ?? payload.protocolo);
        addIfDefined('modo', payload.MODO ?? payload.modo);
        addIfDefined('saude', payload.SAUDE_SENSORES ?? payload.saude);
        addIfDefined('version', payload.version ?? payload.VERSAO ?? payload.VERSION);

        // Fallback para chave legado 'rele'
        if (normalized.rele0 !== undefined) {
            normalized.rele = normalized.rele0;
        }

        return normalized;
    }

    private static parseNumber(val: any): number | undefined {
        if (val === undefined || val === null) return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? undefined : num;
    }
}
