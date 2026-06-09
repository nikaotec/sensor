import { deleteFirebaseUser } from './firebaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nikaotech.com/api';

/**
 * Exclui um usuário completamente do sistema, garantindo consistência
 * entre o Firebase Auth (autenticação) e a base de dados via API Java.
 */
export const deleteUserCompletely = async (userId: string) => {
    console.log(`[userService] Iniciando exclusão completa do usuário: ${userId}`);

    // 1. Tenta excluir no Firebase via API Node.js do painel
    const fbResult = await deleteFirebaseUser(userId);
    if (!fbResult.success) {
        console.error(`[userService] Falha no Firebase:`, fbResult.error);
        throw new Error(`Falha ao excluir no Firebase Auth: ${fbResult.error || 'Erro desconhecido'}`);
    }
    console.log(`[userService] Sucesso no Firebase:`, fbResult.warning || 'OK');

    // 2. Remove dependências na tabela users_devices (alertas WhatsApp) e o usuário no banco via API Java REST
    try {
        console.log(`[userService] Removendo registro principal e dependências na API Java para: ${userId}`);
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Falha ao remover usuário na API: ${errText || response.statusText}`);
        }
        console.log(`[userService] Usuário e vínculos removidos com sucesso via API Java.`);
    } catch (e: any) {
        console.error(`[userService] Erro ao deletar usuário do banco de dados:`, e);
        throw new Error(`Erro ao remover usuário do banco de dados (API Java): ${e.message}`);
    }

    return { success: true, warning: fbResult.warning };
};
