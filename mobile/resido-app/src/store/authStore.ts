import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// Custom storage wrapper for Expo SecureStore
const secureStorage = {
    getItem: async (name: string): Promise<string | null> => {
        return await SecureStore.getItemAsync(name);
    },
    setItem: async (name: string, value: string): Promise<void> => {
        await SecureStore.setItemAsync(name, value);
    },
    removeItem: async (name: string): Promise<void> => {
        await SecureStore.deleteItemAsync(name);
    },
};

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
    role: UserRole;       // currently active role
    roles: UserRole[];    // all roles this user holds in this community
    memberId: string;
    dbName: string;
    photoUrl?: string;
}

interface AuthState {
    phone: string | null;
    token: string | null;
    personalToken: string | null;
    refreshToken: string | null;
    user: { id: string; name?: string; username?: string; email?: string; profileName?: string; phoneVisibility?: string; phone: string; profilePhoto?: string; role?: string; age?: number; description?: string; location?: string; instagram?: string; linkedin?: string; website?: string } | null;
    workspaces: Workspace[];
    activeWorkspace: Workspace | null;
    isHydrated: boolean;
    setOtpVerified: (data: {
        token: string;
        refreshToken: string;
        user: any;
        workspaces: Workspace[];
    }) => void;
    updateUser: (user: any) => void;
    setActiveWorkspace: (ws: Workspace, token: string) => void;
    setWorkspaces: (workspaces: Workspace[]) => void;
    switchRole: (role: UserRole, token: string) => void;
    logout: () => void;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            phone: null,
            token: null,
            personalToken: null,
            refreshToken: null,
            user: null,
            workspaces: [],
            activeWorkspace: null,
            isHydrated: false,

            setOtpVerified: (data) =>
                set({
                    token: data.token,
                    personalToken: data.token,
                    refreshToken: data.refreshToken,
                    user: data.user,
                    // Normalise: ensure every workspace has a roles array
                    workspaces: data.workspaces.map((ws: any) => ({
                        ...ws,
                        roles: ws.roles || [ws.role],
                    })),
                    activeWorkspace: null,
                }),

            updateUser: (updatedFields) => set((state) => ({ 
                user: state.user ? { ...state.user, ...updatedFields } : updatedFields 
            })),

            setActiveWorkspace: (ws, token) =>
                set((state) => ({
                    activeWorkspace: ws ? { ...ws, roles: ws.roles || [ws.role] } : null,
                    token: ws === null ? state.personalToken || state.token : token
                })),

            setWorkspaces: (workspaces) => set({
                workspaces: workspaces.map((ws: any) => ({
                    ...ws,
                    roles: ws.roles || [ws.role],
                }))
            }),

            // Switch role within the current active workspace (already switched community)
            switchRole: (role, token) =>
                set((state) => ({
                    activeWorkspace: state.activeWorkspace
                        ? { ...state.activeWorkspace, role }
                        : null,
                    token,
                })),

            logout: () =>
                set({
                    phone: null,
                    token: null,
                    personalToken: null,
                    refreshToken: null,
                    user: null,
                    workspaces: [],
                    activeWorkspace: null,
                }),
            
            setHasHydrated: (state) => set({ isHydrated: state }),
        }),
        {
            name: 'resido-auth-secure-storage',
            storage: createJSONStorage(() => secureStorage),
            onRehydrateStorage: (state) => {
                return () => state?.setHasHydrated(true);
            },
        }
    )
);
