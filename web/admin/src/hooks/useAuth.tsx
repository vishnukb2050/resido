import { useState, createContext, useContext, useEffect } from 'react';
import axios from 'axios';

interface AuthContextType {
    isAuthenticated: boolean;
    token: string | null;
    role: string | null;
    client: any | null;
    staff: any | null;
    login: (email: string, password: string) => Promise<void>;
    acceptInvite: (inviteToken: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
    const [role, setRole] = useState<string | null>(localStorage.getItem('admin_role'));
    const [staff, setStaff] = useState<any | null>(JSON.parse(localStorage.getItem('admin_staff') || 'null'));
    const [client, setClient] = useState<any | null>(JSON.parse(localStorage.getItem('admin_client') || 'null'));

    const isAuthenticated = !!token;

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    const login = async (email: string, password: string) => {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/staff/login`, { email, password });
        const { accessToken, staff: staffData, client: clientData } = res.data;

        setToken(accessToken);
        setRole(staffData.role);
        setStaff(staffData);
        setClient(clientData);

        localStorage.setItem('admin_token', accessToken);
        localStorage.setItem('admin_role', staffData.role);
        localStorage.setItem('admin_staff', JSON.stringify(staffData));
        localStorage.setItem('admin_client', JSON.stringify(clientData));
    };

    const acceptInvite = async (inviteToken: string, password: string) => {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/staff/accept-invite`, { inviteToken, password });
        const { accessToken, staff: staffData, client: clientData } = res.data;

        setToken(accessToken);
        setRole(staffData.role);
        setStaff(staffData);
        setClient(clientData);

        localStorage.setItem('admin_token', accessToken);
        localStorage.setItem('admin_role', staffData.role);
        localStorage.setItem('admin_staff', JSON.stringify(staffData));
        localStorage.setItem('admin_client', JSON.stringify(clientData));
    };

    const logout = () => {
        setToken(null);
        setRole(null);
        setStaff(null);
        setClient(null);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_role');
        localStorage.removeItem('admin_staff');
        localStorage.removeItem('admin_client');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, token, role, staff, client, login, acceptInvite, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
