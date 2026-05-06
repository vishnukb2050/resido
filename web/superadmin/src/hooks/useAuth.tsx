import { useState, createContext, useContext, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
    isAuthenticated: boolean;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(
        localStorage.getItem('resido_superadmin_token'),
    );

    const isAuthenticated = !!token;

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    const login = async (email: string, password: string) => {
        const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/login`,
            { email, password },
        );
        const { accessToken } = res.data;
        setToken(accessToken);
        localStorage.setItem('resido_superadmin_token', accessToken);
    };

    const logout = () => {
        setToken(null);
        localStorage.removeItem('resido_superadmin_token');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
