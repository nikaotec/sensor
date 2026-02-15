import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const AuthContext = createContext(null);

// Axios instance with auth interceptor
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('tenant');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [tenant, setTenant] = useState(() => {
        const saved = localStorage.getItem('tenant');
        return saved ? JSON.parse(saved) : null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/auth/me')
                .then((res) => {
                    setUser(res.data.user);
                    setTenant(res.data.tenant);
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                    localStorage.setItem('tenant', JSON.stringify(res.data.tenant));
                })
                .catch(() => {
                    logout();
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        localStorage.setItem('tenant', JSON.stringify(res.data.tenant));
        setUser(res.data.user);
        setTenant(res.data.tenant);
        return res.data;
    };

    const register = async (data) => {
        const res = await api.post('/auth/register', data);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        localStorage.setItem('tenant', JSON.stringify(res.data.tenant));
        setUser(res.data.user);
        setTenant(res.data.tenant);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tenant');
        setUser(null);
        setTenant(null);
    };

    return (
        <AuthContext.Provider value={{ user, tenant, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

export { api };
export default AuthContext;
