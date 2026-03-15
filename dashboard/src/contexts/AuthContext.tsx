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
import { users as mockUsers } from '../data/mockData';

export interface AppUser {
    id: string;
    name: string;
    email: string;
    role: 'manager' | 'admin' | 'user' | 'viewer'; // Global role or active tenant role
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
            setFirebaseUser(user);
            if (user) {
                try {
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
                } catch (error: any) {
                    console.error("Error fetching user data from Firestore (using mock fallback):", error.message);
                    // Fallback for UI visualization without real Firebase creds
                    setCurrentUser({
                        id: user.uid,
                        name: user.displayName || mockUsers[0].name,
                        email: user.email || mockUsers[0].email,
                        role: user.email === 'antoniovenancio10@gmail.com' ? 'manager' : mockUsers[0].role,
                        tenantIds: ['t1', 't2']
                    });
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, pass: string) => {
        await signInWithEmailAndPassword(auth, email, pass);
    };

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
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
