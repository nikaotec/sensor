// Removed unused Device import

export interface NormalizedMqttUpdate {
    deviceId: string;
    company: string;
    deviceName?: string;
    telemetry: {
        temp?: number;
        tempExt?: number;
        tempMax?: number;
        tempMin?: number;
        batteryVoltage?: number;
        inputVoltage?: number;
        signal?: number;
        humidity?: number;
        doorOpen?: boolean;
        relay?: 'on' | 'off';
        setpoint?: number;
        mode?: string;
        is_auto?: boolean;
        buzzer?: boolean;
        alarmMax?: number;
        alarmMin?: number;
        voltMaxLimit?: number;
        voltMinLimit?: number;
        batMinLimit?: number;
        doorMaxTime?: number;
        tempOn?: number;
        tempOff?: number;
        chkVolt?: boolean;
        chkBat?: boolean;
        chkTemp?: boolean;
        chkDoor?: boolean;
        fwVersion?: string;
    };
    alertType?: string;
    rawPayload: any;
}

export class MqttPayloadNormalizer {
    /**
     * Normalizes a raw MQTT payload into a structured update.
     * Supports various naming conventions used by different hardware versions.
     */
    static normalize(payload: any): NormalizedMqttUpdate | null {
        if (!payload || typeof payload !== 'object') return null;

        // 1. Extract Device ID
        const deviceId = payload.id || payload.ID_DISPOSITIVO || payload.ID || payload.deviceId || payload.device_id || payload.MAC;
        if (!deviceId) {
            console.warn('[MqttPayloadNormalizer] ⚠️ Payload sem Device ID:', payload);
            return null;
        }

        // 2. Extract Company/Tenant
        const company = payload.company || payload.EMPRESA || payload.empresa || payload.tenant || payload.tenant_id || payload.tenantId || 'Unknown';

        // 3. Extract Device Name
        const deviceName = payload.device_name || payload.DISPOSITIVO || payload.NOME || payload.name || payload.deviceName || payload.device_id;

        // 4. Normalize Telemetry
        const telemetry = {
            temp: this.parseNumber(payload.temp ?? payload.TEMP ?? payload.TEMP_ATUAL ?? payload.TEMP_C ?? payload.temperature ?? payload.temperatura),
            tempExt: this.parseNumber(payload.tempExt ?? payload.TEMP_EXT ?? payload.AMB ?? payload.ambiente),
            tempMax: this.parseNumber(payload.tempMax ?? payload.MAX ?? payload.TEMP_MAX),
            tempMin: this.parseNumber(payload.tempMin ?? payload.MIN ?? payload.TEMP_MIN),
            batteryVoltage: this.parseNumber(payload.batteryVoltage ?? payload.BATERIA ?? payload.BAT ?? payload.volt_bat),
            inputVoltage: this.parseNumber(payload.inputVoltage ?? payload.VOLTAGEM ?? payload.VOLT ?? payload.volt_in),
            signal: this.parseNumber(payload.signal ?? payload.RSSI ?? payload.sinal),
            humidity: this.parseNumber(payload.UMIDADE ?? payload.HUM ?? payload.humidity ?? payload.umidade ?? payload.umid),
            doorOpen: payload.PORTA_ABERTA !== undefined ? Boolean(payload.PORTA_ABERTA) : (payload.PORTA !== undefined ? Boolean(payload.PORTA) : (payload.door !== undefined ? Boolean(payload.door) : undefined)),
            relay: this.parseRelay(payload.rele ?? payload.relay ?? payload.RELAY),
            setpoint: this.parseNumber(payload.setpoint ?? payload.SETPOINT),
            mode: payload.mode || payload.MODO,
            is_auto: payload.is_auto !== undefined ? Boolean(payload.is_auto) : (payload.AUTO !== undefined ? Boolean(payload.AUTO) : undefined),
            buzzer: payload.buzzer !== undefined ? Boolean(payload.buzzer) : (payload.BUZZ !== undefined ? Boolean(payload.BUZZ) : undefined),
            alarmMax: this.parseNumber(payload.ALARM_MAX ?? payload.alarmMax),
            alarmMin: this.parseNumber(payload.ALARM_MIN ?? payload.alarmMin),
            voltMaxLimit: this.parseNumber(payload.VOLT_MAX_LIMIT ?? payload.voltMaxLimit),
            voltMinLimit: this.parseNumber(payload.VOLT_MIN_LIMIT ?? payload.voltMinLimit),
            batMinLimit: this.parseNumber(payload.BAT_MIN_LIMIT ?? payload.batMinLimit),
            doorMaxTime: this.parseNumber(payload.TEMPO_PORTA ?? payload.doorMaxTime),
            tempOn: this.parseNumber(payload.R0_TEMP_ON ?? payload.tempOn ?? payload.temp_on),
            tempOff: this.parseNumber(payload.R0_TEMP_OFF ?? payload.tempOff ?? payload.temp_off),
            chkVolt: payload.CHK_VOLT !== undefined ? Boolean(payload.CHK_VOLT) : undefined,
            chkBat: payload.CHK_BAT !== undefined ? Boolean(payload.CHK_BAT) : undefined,
            chkTemp: payload.CHK_TEMP !== undefined ? Boolean(payload.CHK_TEMP) : undefined,
            chkDoor: payload.CHK_DOOR !== undefined ? Boolean(payload.CHK_DOOR) : undefined,
            fwVersion: payload.FW_VERSION || payload.fw_version || payload.VER || payload.version,
        };

        return {
            deviceId: String(deviceId),
            company: String(company),
            deviceName: deviceName ? String(deviceName) : undefined,
            telemetry,
            alertType: payload.TIPO?.startsWith('ALERTA_') ? payload.TIPO : undefined,
            rawPayload: payload
        };
    }

    private static parseNumber(val: any): number | undefined {
        if (val === undefined || val === null) return undefined;
        const num = typeof val === 'number' ? val : parseFloat(String(val));
        return isNaN(num) ? undefined : num;
    }

    private static parseRelay(val: any): 'on' | 'off' | undefined {
        if (val === undefined || val === null) return undefined;
        if (val === true || val === 1 || String(val).toLowerCase() === 'on' || String(val).toLowerCase() === 'lig') return 'on';
        if (val === false || val === 0 || String(val).toLowerCase() === 'off' || String(val).toLowerCase() === 'desl') return 'off';
        return undefined;
    }
}
