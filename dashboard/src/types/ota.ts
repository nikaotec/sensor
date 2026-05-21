// ============================================================
// OTA Types — Single Responsibility: only type contracts here
// ============================================================

export type OtaPhase =
    | 'idle'
    | 'pending'     // Comando enviado, aguardando o dispositivo responder
    | 'downloading' // Firmware baixando (OTA_PROGRESS)
    | 'installing'  // Gravando na flash (OTA_PROGRESS >= 100)
    | 'success'     // OTA_SUCCESS
    | 'error';      // OTA_ERROR

export interface OtaStatus {
    phase: OtaPhase;
    progress: number;       // 0–100
    version?: string;       // versão recebida no OTA_SUCCESS
    targetVersion?: string; // versão que se espera instalar
    errorMsg?: string;
    updatedAt: number;      // timestamp ms
}

export interface OtaCommand {
    deviceId: string;
    url: string;
    hash?: string;
}

/** Indexed by deviceId */
export type OtaProgressMap = Record<string, OtaStatus>;

export interface OtaMqttProgressPayload {
    TIPO: 'OTA_PROGRESS' | 'OTA_SUCCESS' | 'OTA_ERROR';
    ID_DISPOSITIVO: string;
    PROGRESSO?: number;
    VERSAO?: string;
    ERRO?: string;
}
