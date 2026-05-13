export interface ReportValidationResult {
    isValid: boolean;
    errors: {
        tenant?: string;
        device?: string;
    };
}

/**
 * Valida o formulário de relatório garantindo que uma empresa e dispositivo foram selecionados
 * @param tenantId O ID da empresa selecionada (usado para isPrivileged -> exigido)
 * @param deviceId O ID do dispositivo selecionado
 * @param isPrivileged Se for verdadeiro, exige explicitamente o tenantId primeiro
 * @returns Resultado detalhando a validade e possíveis erros a exibir
 */
export function validateReportSelection(
    tenantId: string | undefined | null,
    deviceId: string | undefined | null,
    isPrivileged: boolean
): ReportValidationResult {
    const errors: { tenant?: string; device?: string } = {};

    if (isPrivileged) {
        if (!tenantId || tenantId.trim() === '') {
            errors.tenant = '* É necessário selecionar uma Empresa para gerar o relatório.';
        }
    }

    // Se for privilegiado e não selecionou o tenant ainda, o dispositivo nem pode ser avaliado direito,
    // mas o requisito do cliente é: "selecionar uma empresa e um dispositivo".
    if (!deviceId || deviceId.trim() === '') {
        if (!isPrivileged || (isPrivileged && tenantId)) {
            errors.device = '* É necessário selecionar um Dispositivo para gerar o relatório.';
        } else {
            // Privilegiado e sem tenant: mostrar ambos ou o erro do device adaptado
            errors.device = '* Selecione a Empresa para liberar os dispositivos.';
        }
    }

    const isValid = Object.keys(errors).length === 0;

    return {
        isValid,
        errors
    };
}
