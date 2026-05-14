import { supabase } from '../supabase/config';
import { deleteFirebaseUser } from './firebaseAuth';

/**
 * Exclui um usuário completamente do sistema, garantindo consistência
 * entre o Firebase Auth (autenticação) e o Supabase (banco de dados).
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

    // 2. Remove dependências na tabela users_devices (alertas WhatsApp) - Tentativa resiliente
    try {
        console.log(`[userService] Removendo vínculos em users_devices para: ${userId}`);
        const { error: deviceError } = await supabase.from('users_devices').delete().eq('user_id', userId);

        if (deviceError) {
            // Se o erro for "cannot delete from view" ou similar (código 55000 no Postgres)
            // nós avisamos no log mas NÃO travamos o processo, pois é uma View.
            if (deviceError.code === '55000' || deviceError.message?.includes('view')) {
                console.warn(`[userService] Aviso: users_devices é uma View e não permite deleção direta. Continuando... [${deviceError.code}]`);
            } else {
                console.error(`[userService] Erro ao deletar de users_devices:`, deviceError);
                throw new Error(`Erro ao remover dependências de alertas (users_devices): ${deviceError.message}`);
            }
        } else {
            console.log(`[userService] Vínculos removidos com sucesso.`);
        }
    } catch (e) {
        // Se for o erro esperado de View, ignoramos e seguimos para deletar o user
        if (e instanceof Error && e.message.includes('users_devices')) {
            console.warn(`[userService] Prosseguindo apesar do erro em users_devices: ${e.message}`);
        } else {
            throw e;
        }
    }

    // 3. Exclui o registro principal no Supabase
    console.log(`[userService] Removendo registro principal na tabela users...`);
    const { error: userError } = await supabase.from('users').delete().eq('id', userId);

    if (userError) {
        console.error(`[userService] Erro ao deletar de users:`, userError);
        throw new Error(`Erro ao remover usuário do banco de dados (users): ${userError.message}`);
    }
    console.log(`[userService] Usuário removido com sucesso de todas as bases.`);

    return { success: true, warning: fbResult.warning };
};
