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
import { auth, db } from '../firebase/config';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

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
                    console.log("🔍 Buscando perfil no Firestore para:", user.uid);
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);
                    const emailDocRef = doc(db, 'users', user.email || 'no-email');
                    const emailDocSnap = user.email ? await getDoc(emailDocRef) : null;

                    if (userDoc.exists()) {
                        let userData = userDoc.data() as AppUser;

                        // Se existe um documento pré-provisionado por email, mescla as empresas e atualiza
                        if (emailDocSnap && emailDocSnap.exists()) {
                            const preProvisioned = emailDocSnap.data();
                            const mergedTenants = Array.from(new Set([
                                ...(userData.tenantIds || []),
                                ...(preProvisioned.tenantIds || [])
                            ]));

                            userData = {
                                ...userData,
                                role: preProvisioned.role || userData.role,
                                tenantIds: mergedTenants
                            };

                            await setDoc(userDocRef, userData);
                            await deleteDoc(emailDocRef); // Remove documento temporário indexado por email
                        }

                        setCurrentUser({ ...userData, id: user.uid });
                    } else {
                        // Não achou por UID em Firestore. Verifica se foi pré-provisionado por EMAIL pelo Gestor
                        if (emailDocSnap && emailDocSnap.exists()) {
                            const preProvisioned = emailDocSnap.data();
                            const newUser: AppUser = {
                                id: user.uid,
                                name: user.displayName || 'Novo Administrador',
                                email: user.email || '',
                                role: preProvisioned.role || 'admin',
                                tenantIds: preProvisioned.tenantIds || []
                            };

                            await setDoc(userDocRef, newUser);
                            await deleteDoc(emailDocRef); // Deleta o de email temporário
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
                            await setDoc(userDocRef, newUser);
                            setCurrentUser(newUser);
                        }
                    }
                    console.log("✅ Perfil carregado com sucesso.");
                } catch (error: any) {
                    console.error("❌ Erro ao buscar dados do Firestore:", error.message);
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
        // Create standard user profile in Firestore
        const newUser: AppUser = {
            id: res.user.uid,
            name,
            email,
            role: 'admin',
            tenantIds: [] // Needs to create a company after signup
        };
        try {
            await setDoc(doc(db, 'users', res.user.uid), newUser);
        } catch (e: any) {
            console.error("Warning: could not save to Firestore (invalid creds?)", e.message);
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
