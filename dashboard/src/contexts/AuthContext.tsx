import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    updatePassword
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://nikaotech.com/api';

export interface AppUser {
    id: string;
    name: string;
    email: string;
    role: 'manager' | 'gestor' | 'admin' | 'user' | 'viewer'; // Global role or active tenant role
    avatarUrl?: string;
    tenantIds: string[]; // List of companies the user has access to (managers ignore this)
    allowedDevices?: string[]; // List of specific device IDs the user has access to
    dailyReportsEnabled?: boolean;
    dailyReportDeviceIds?: string[];
    dailyReportTime?: string;
}

interface AuthContextType {
    currentUser: AppUser | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    signup: (email: string, pass: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log("🔥 Auth State Changed:", user ? `Logado (${user.email})` : "Deslogado");
            setFirebaseUser(user);
            if (user) {
                try {
                    // Buscar perfil por UID via API Java REST
                    const response = await fetch(`${API_BASE_URL}/users/${user.uid}`);
                    let userDoc = null;
                    if (response.ok) {
                        userDoc = await response.json();
                    }

                    // Buscar possível pré-provisionamento por email via API Java REST
                    let emailDoc = null;
                    if (user.email) {
                        const emailRes = await fetch(`${API_BASE_URL}/users/by-email/${encodeURIComponent(user.email.toLowerCase())}`);
                        if (emailRes.ok) {
                            const resDoc = await emailRes.json();
                            if (resDoc && resDoc.id !== user.uid) {
                                emailDoc = resDoc;
                            }
                        }
                    }

                    if (userDoc) {
                        let userData = userDoc as any;

                        // Se existe um documento pré-provisionado por email, mescla as empresas e atualiza
                        if (emailDoc) {
                            const mergedTenants = Array.from(new Set([
                                ...(userData.tenantIds || userData.tenant_ids || []),
                                ...(emailDoc.tenantIds || emailDoc.tenant_ids || [])
                            ]));

                            userData = {
                                ...userData,
                                role: emailDoc.role || userData.role,
                                tenantIds: mergedTenants
                            };

                            await fetch(`${API_BASE_URL}/users/${user.uid}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ role: userData.role, tenantIds: mergedTenants })
                            });

                            // Remove documento temporário indexado por email
                            await fetch(`${API_BASE_URL}/users/${emailDoc.id}`, {
                                method: 'DELETE'
                            });
                        }

                        setCurrentUser({
                            id: user.uid,
                            name: userData.name,
                            email: userData.email,
                            role: userData.role,
                            avatarUrl: userData.avatarUrl || userData.avatar_url,
                            tenantIds: userData.tenantIds || userData.tenant_ids || [],
                            allowedDevices: userData.allowedDevices || userData.allowed_devices || [],
                            dailyReportsEnabled: userData.dailyReportsEnabled !== undefined ? userData.dailyReportsEnabled : (userData.daily_reports_enabled || false),
                            dailyReportDeviceIds: userData.dailyReportDeviceIds || userData.daily_report_device_ids || [],
                            dailyReportTime: userData.dailyReportTime || userData.daily_report_time || '17:05'
                        });
                    } else {
                        // Não achou por UID. Verifica se foi pré-provisionado por EMAIL pelo Gestor
                        if (emailDoc) {
                            const newUser: AppUser = {
                                id: user.uid,
                                name: user.displayName || 'Novo Administrador',
                                email: user.email || '',
                                role: emailDoc.role || 'admin',
                                tenantIds: emailDoc.tenantIds || emailDoc.tenant_ids || [],
                                allowedDevices: emailDoc.allowedDevices || emailDoc.allowed_devices || [],
                                dailyReportsEnabled: emailDoc.dailyReportsEnabled || emailDoc.daily_reports_enabled || false,
                                dailyReportDeviceIds: emailDoc.dailyReportDeviceIds || emailDoc.daily_report_device_ids || [],
                                dailyReportTime: emailDoc.dailyReportTime || emailDoc.daily_report_time || '17:05'
                            };

                            await fetch(`${API_BASE_URL}/users`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    id: user.uid,
                                    name: newUser.name,
                                    email: newUser.email,
                                    role: newUser.role,
                                    tenantIds: newUser.tenantIds,
                                    allowedDevices: newUser.allowedDevices
                                })
                            });

                            // Deleta o de email temporário
                            await fetch(`${API_BASE_URL}/users/${emailDoc.id}`, {
                                method: 'DELETE'
                            });
                            setCurrentUser(newUser);
                        } else {
                            // Totalmente novo (ex: primeiro login manual)
                            const newUser: AppUser = {
                                id: user.uid,
                                name: user.displayName || 'Novo Usuário',
                                email: user.email || '',
                                role: user.email === 'antoniovenancio10@gmail.com' ? 'manager' : 'admin',
                                tenantIds: [],
                                allowedDevices: [],
                                dailyReportsEnabled: false,
                                dailyReportDeviceIds: [],
                                dailyReportTime: '17:05'
                            };
                            await fetch(`${API_BASE_URL}/users`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    id: user.uid,
                                    name: newUser.name,
                                    email: newUser.email,
                                    role: newUser.role,
                                    tenantIds: newUser.tenantIds,
                                    allowedDevices: newUser.allowedDevices
                                })
                            });
                            setCurrentUser(newUser);
                        }
                    }
                } catch (error: any) {
                    console.error("❌ Erro ao buscar dados da API:", error.message);
                    // Fallback para não travar a UI
                    setCurrentUser({
                        id: user.uid,
                        name: user.displayName || 'Usuário (Offline/Mock)',
                        email: user.email || '',
                        role: user.email === 'antoniovenancio10@gmail.com' ? 'manager' : 'admin',
                        tenantIds: [],
                        allowedDevices: [],
                        dailyReportsEnabled: false,
                        dailyReportDeviceIds: [],
                        dailyReportTime: '17:05'
                    });
                }
            } else {
                setCurrentUser(null);
            }
            console.log("🏁 Finalizando estado de carregamento.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, pass: string) => {
        await signInWithEmailAndPassword(auth, email, pass);
    };

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            console.error("Erro detalhado no Login Google:", error.code, error.message);
            if (error.code === 'auth/unauthorized-domain') {
                alert("Domínio não autorizado no Firebase. Por favor, adicione a URL do ngrok no Console do Firebase.");
            }
            throw error;
        }
    };

    const signup = async (email: string, pass: string, name: string) => {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        const newUser: AppUser = {
            id: res.user.uid,
            name,
            email,
            role: 'admin',
            tenantIds: [],
            allowedDevices: [],
            dailyReportsEnabled: false,
            dailyReportDeviceIds: [],
            dailyReportTime: '17:05'
        };
        try {
            await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: res.user.uid,
                    name,
                    email,
                    role: 'admin',
                    tenantIds: [],
                    allowedDevices: []
                })
            });
        } catch (e: any) {
            console.error("Warning: could not save to API", e.message);
        }
        setCurrentUser(newUser);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const changePassword = async (newPassword: string) => {
        if (!auth.currentUser) throw new Error("Usuário não autenticado no Firebase");
        await updatePassword(auth.currentUser, newPassword);
    };

    return (
        <AuthContext.Provider value={{ currentUser, firebaseUser, loading, login, loginWithGoogle, signup, logout, changePassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};



