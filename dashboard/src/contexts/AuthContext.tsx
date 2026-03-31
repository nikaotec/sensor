import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import { supabase } from '../supabase/config';

export interface AppUser {
    id: string;
    name: string;
    email: string;
    role: 'manager' | 'gestor' | 'admin' | 'user' | 'viewer'; // Global role or active tenant role
    avatarUrl?: string;
    tenantIds: string[]; // List of companies the user has access to (managers ignore this)
}

interface AuthContextType {
    currentUser: AppUser | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    signup: (email: string, pass: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
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
                    // Buscar perfil por UID
                    const { data: userDoc, error: uidError } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', user.uid)
                        .maybeSingle();

                    if (uidError) throw uidError;

                    // Buscar possível pré-provisionamento por email
                    const { data: emailDoc } = user.email
                        ? await supabase
                            .from('users')
                            .select('*')
                            .eq('email', user.email.toLowerCase())
                            .neq('id', user.uid)
                            .maybeSingle()
                        : { data: null };

                    if (userDoc) {
                        let userData = userDoc as any;

                        // Se existe um documento pré-provisionado por email, mescla as empresas e atualiza
                        if (emailDoc) {
                            const mergedTenants = Array.from(new Set([
                                ...(userData.tenant_ids || []),
                                ...(emailDoc.tenant_ids || [])
                            ]));

                            userData = {
                                ...userData,
                                role: emailDoc.role || userData.role,
                                tenant_ids: mergedTenants
                            };

                            await supabase
                                .from('users')
                                .update({ role: userData.role, tenant_ids: mergedTenants })
                                .eq('id', user.uid);

                            // Remove documento temporário indexado por email
                            await supabase
                                .from('users')
                                .delete()
                                .eq('id', emailDoc.id);
                        }

                        setCurrentUser({
                            id: user.uid,
                            name: userData.name,
                            email: userData.email,
                            role: userData.role,
                            avatarUrl: userData.avatar_url,
                            tenantIds: userData.tenant_ids || []
                        });
                    } else {
                        // Não achou por UID. Verifica se foi pré-provisionado por EMAIL pelo Gestor
                        if (emailDoc) {
                            const newUser: AppUser = {
                                id: user.uid,
                                name: user.displayName || 'Novo Administrador',
                                email: user.email || '',
                                role: emailDoc.role || 'admin',
                                tenantIds: emailDoc.tenant_ids || []
                            };

                            await supabase.from('users').upsert({
                                id: user.uid,
                                name: newUser.name,
                                email: newUser.email,
                                role: newUser.role,
                                tenant_ids: newUser.tenantIds
                            });

                            // Deleta o de email temporário
                            await supabase.from('users').delete().eq('id', emailDoc.id);
                            setCurrentUser(newUser);
                        } else {
                            // Totalmente novo (ex: primeiro login manual)
                            const newUser: AppUser = {
                                id: user.uid,
                                name: user.displayName || 'Novo Usuário',
                                email: user.email || '',
                                role: user.email === 'antoniovenancio10@gmail.com' ? 'manager' : 'admin',
                                tenantIds: []
                            };
                            await supabase.from('users').upsert({
                                id: user.uid,
                                name: newUser.name,
                                email: newUser.email,
                                role: newUser.role,
                                tenant_ids: newUser.tenantIds
                            });
                            setCurrentUser(newUser);
                        }
                    }
                } catch (error: any) {
                    console.error("❌ Erro ao buscar dados do Supabase:", error.message);
                    // Fallback para não travar a UI
                    setCurrentUser({
                        id: user.uid,
                        name: user.displayName || 'Usuário (Offline/Mock)',
                        email: user.email || '',
                        role: user.email === 'antoniovenancio10@gmail.com' ? 'manager' : 'admin',
                        tenantIds: []
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
        // Create standard user profile in Supabase
        const newUser: AppUser = {
            id: res.user.uid,
            name,
            email,
            role: 'admin',
            tenantIds: [] // Needs to create a company after signup
        };
        try {
            await supabase.from('users').upsert({
                id: res.user.uid,
                name,
                email,
                role: 'admin',
                tenant_ids: []
            });
        } catch (e: any) {
            console.error("Warning: could not save to Supabase", e.message);
        }
        setCurrentUser(newUser);
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ currentUser, firebaseUser, loading, login, loginWithGoogle, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};



