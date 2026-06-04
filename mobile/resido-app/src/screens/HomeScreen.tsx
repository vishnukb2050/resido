import React, { Suspense } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

// Dashboards are lazy-loaded so cold start only evaluates the module for the
// dashboard the current user actually lands on (each of these screens has a
// large StyleSheet + component tree). The others are loaded on demand if the
// user switches roles/workspaces.
const AdminDashboard = React.lazy(() => import('../components/dashboards/AdminDashboard'));
const CleaningDashboard = React.lazy(() => import('../components/dashboards/CleaningDashboard'));
const SecurityDashboard = React.lazy(() => import('../components/dashboards/SecurityDashboard'));
const ServiceStaffDashboard = React.lazy(() => import('../components/dashboards/ServiceStaffDashboard'));
const DefaultDashboard = React.lazy(() => import('../components/dashboards/DefaultDashboard'));
const MemberDashboard = React.lazy(() => import('../components/dashboards/MemberDashboard'));

export default function HomeScreen() {
    const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
    const isHydrated = useAuthStore((s) => s.isHydrated);
    const user = useAuthStore((s) => s.user);
    const router = useRouter();
    const role = activeWorkspace?.role;

    // Mandatory profile setup gate. A signed-in user without a display name
    // OR username is bounced to /onboarding-profile before they ever see any
    // dashboard (MySpace, Admin, etc.). Covers app restarts, OS-killed
    // sessions, and legacy accounts created before this requirement existed.
    const needsOnboarding = !!user && (!user.name?.trim() || !user.profileName?.trim());
    React.useEffect(() => {
        if (isHydrated && needsOnboarding) {
            router.replace('/onboarding-profile');
        }
    }, [isHydrated, needsOnboarding]);

    const loader = (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
    );

    if (!isHydrated || needsOnboarding) {
        return loader;
    }

    let Dashboard: React.ComponentType;
    if (!activeWorkspace || !role) {
        Dashboard = DefaultDashboard;
    } else if (role === 'CLEANING_STAFF') {
        Dashboard = CleaningDashboard;
    } else if (role === 'SECURITY_STAFF') {
        Dashboard = SecurityDashboard;
    } else if (['SERVICE_STAFF', 'STAFF', 'MAINTENANCE_STAFF'].includes(role)) {
        Dashboard = ServiceStaffDashboard;
    } else if (['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF', 'ACCOUNTS_STAFF'].includes(role)) {
        Dashboard = AdminDashboard;
    } else if (role === 'RESIDENT') {
        Dashboard = DefaultDashboard;
    } else if ((role as string) === 'MEMBER') {
        Dashboard = MemberDashboard;
    } else {
        Dashboard = AdminDashboard;
    }

    return (
        <Suspense fallback={loader}>
            <Dashboard />
        </Suspense>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
});

