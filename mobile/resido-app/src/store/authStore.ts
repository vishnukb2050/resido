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
    role: UserRole;
    memberId: string;
    dbName: string;
}

interface AuthState {
    phone: string | null;
    token: string | null;
    refreshToken: string | null;
    user: { id: string; name?: string; username?: string; email?: string; profileName?: string; phoneVisibility?: string; phone: string; profilePhoto?: string; role?: string; age?: number; description?: string; location?: string; instagram?: string; linkedin?: string; website?: string } | null;
    workspaces: Workspace[];
    activeWorkspace: Workspace | null;
    isHydrated: boolean; // Track if store has loaded from storage
    setOtpVerified: (data: {
        token: string;
        refreshToken: string;
        user: any;
        workspaces: Workspace[];
    }) => void;
    updateUser: (user: any) => void;
    setActiveWorkspace: (ws: Workspace, token: string) => void;
    setWorkspaces: (workspaces: Workspace[]) => void;
    logout: () => void;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            phone: null,
            token: null,
            refreshToken: null,
            user: null,
            workspaces: [],
            activeWorkspace: null,
            isHydrated: false,

            setOtpVerified: (data) =>
                set({
                    token: data.token,
                    refreshToken: data.refreshToken,
                    user: data.user,
                    workspaces: data.workspaces,
                    activeWorkspace: null, // Always start in Personal Space
                }),

            updateUser: (user) => set({ user }),

            setActiveWorkspace: (ws, token) =>
                set({ activeWorkspace: ws, token }),

            setWorkspaces: (workspaces) => set({ workspaces }),

            logout: () =>
                set({
                    phone: null,
                    token: null,
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
