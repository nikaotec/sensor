import { supabase } from '../supabase/config';
import { deleteFirebaseUser } from './firebaseAuth';

/**
 * Exclui um usuário completamente do sistema, garantindo consistência
 * entre o Firebase Auth (autenticação) e o Supabase (banco de dados).
 */
export const deleteUserCompletely = async (userId: string) => {
    // 1. Tenta excluir no Firebase via API Node.js do painel
    const fbResult = await deleteFirebaseUser(userId);
    if (!fbResult.success) {
        throw new Error(`Falha ao excluir no Firebase Auth: ${fbResult.error || 'Erro desconhecido'}`);
    }

    // 2. Remove dependências na tabela users_devices (alertas WhatsApp)
    const { error: deviceError } = await supabase.from('users_devices').delete().eq('user_id', userId);
    if (deviceError) {
        throw new Error(`Erro ao remover dependências de alertas: ${deviceError.message}`);
    }

    // 3. Exclui o registro principal no Supabase
    const { error: userError } = await supabase.from('users').delete().eq('id', userId);
    if (userError) {
        throw new Error(`Erro ao remover usuário do banco de dados: ${userError.message}`);
    }

    return { success: true, warning: fbResult.warning };
};
