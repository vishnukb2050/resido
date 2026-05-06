import { create } from 'zustand';

export type UserRole =
    | 'APARTMENT_ADMIN'
    | 'RESIDENT'
    | 'CLEANING_STAFF'
    | 'CARETAKER'
    | 'SECURITY_STAFF'
    | 'ACCOUNTS_STAFF'
    | 'MAINTENANCE_STAFF'
    | 'ADMIN_STAFF'
    | 'STAFF'
    | 'SERVICE_STAFF';

export interface Workspace {
    tenantId: string;
    tenantName: string;
    role: UserRole;
    memberId: string;
    dbName: string;
}

interface AuthState {
    phone: string | null;
    token: string | null;
    refreshToken: string | null;
    user: { id: string; name?: string; phone: string; profilePhoto?: string; role?: string } | null;
    workspaces: Workspace[];
    activeWorkspace: Workspace | null;
    setOtpVerified: (data: {
        token: string;
        refreshToken: string;
        user: any;
        workspaces: Workspace[];
    }) => void;
    updateUser: (user: any) => void;
    setActiveWorkspace: (ws: Workspace, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    phone: null,
    token: null,
    refreshToken: null,
    user: null,
    workspaces: [],
    activeWorkspace: null,

    setOtpVerified: (data) =>
        set({
            token: data.token,
            refreshToken: data.refreshToken,
            user: data.user,
            workspaces: data.workspaces,
            // Auto-select first workspace if only one
            activeWorkspace: data.workspaces.length === 1 ? data.workspaces[0] : null,
        }),

    updateUser: (user) => set({ user }),

    setActiveWorkspace: (ws, token) =>
        set({ activeWorkspace: ws, token }),

    logout: () =>
        set({
            phone: null,
            token: null,
            refreshToken: null,
            user: null,
            workspaces: [],
            activeWorkspace: null,
        }),
}));
