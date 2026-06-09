import { initializeApp, deleteApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    setPersistence
} from 'firebase/auth';

// Configuração recebida via props ou importada
const firebaseConfig = {
    apiKey: "AIzaSyA-UtBDh8WJTpcjNsn5iw5gSe_3km_si1c",
    authDomain: "smartrf-f9962.firebaseapp.com",
    projectId: "smartrf-f9962",
    storageBucket: "smartrf-f9962.firebasestorage.app",
    messagingSenderId: "1051120826846",
    appId: "1:1051120826846:web:b7245cb911b4b7435f854f",
    measurementId: "G-1LRDWFQNML"
};

/**
 * Cria um usuário no Firebase Auth sem deslogar o usuário atual.
 * Utiliza uma instância secundária do Firebase App.
 */
export const provisionFirebaseUser = async (email: string, pass: string) => {
    const appName = `Provisioner-${Date.now()}`;
    let secondaryApp;

    try {
        secondaryApp = initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);

        // Importante: Desabilitar persistência para não interferir com a aba atual
        // No client-side React, usamos null ou session
        await setPersistence(secondaryAuth, { type: 'none' } as any).catch(() => { });

        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
        const uid = userCredential.user.uid;

        // Limpa a instância secundária
        await deleteApp(secondaryApp);

        return { success: true, uid };
    } catch (error: any) {
        if (secondaryApp) await deleteApp(secondaryApp);

        // Traduzir erros comuns
        let message = error.message;
        if (error.code === 'auth/email-already-in-use') {
            message = 'Este e-mail já está cadastrado no sistema.';
        } else if (error.code === 'auth/weak-password') {
            message = 'A senha gerada é muito fraca.';
        } else if (error.code === 'auth/invalid-email') {
            message = 'O e-mail fornecido é inválido.';
        }

        return { success: false, error: message, code: error.code };
    }
};

/**
 * Gera uma senha aleatória segura para o primeiro acesso.
 */
export const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Constante para o endpoint de tarefas administrativas no próprio servidor
const DELETE_USER_ADMIN_URL = '/admin/delete-user';

/**
 * Solicita a exclusão de um usuário no Firebase Auth via Webhook n8n.
 * O Dashboard não pode excluir usuários diretamente por segurança.
 */
export const deleteFirebaseUser = async (uid: string) => {
    try {
        const response = await fetch(DELETE_USER_ADMIN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid })
        });

        if (!response.ok) {
            let errorText = response.statusText;
            try {
                const data = await response.json();
                if (data.error) errorText = data.error;
            } catch (e) {
                // Ignore parse errors if response doesn't have json
            }
            throw new Error(`Erro na API de exclusão: ${errorText}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Falha ao deletar do Firebase Auth');
        }

        return { success: true, warning: data.warning };
    } catch (error: any) {
        console.error('Erro ao solicitar exclusão no Firebase:', error);
        return { success: false, error: error.message };
    }
};
