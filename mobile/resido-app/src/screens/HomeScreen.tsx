import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store/authStore';

// Dashboards
import AdminDashboard from '../components/dashboards/AdminDashboard';
import CleaningDashboard from '../components/dashboards/CleaningDashboard';
import SecurityDashboard from '../components/dashboards/SecurityDashboard';
import ServiceStaffDashboard from '../components/dashboards/ServiceStaffDashboard';
import DefaultDashboard from '../components/dashboards/DefaultDashboard';
import CommunityDashboard from '../components/dashboards/CommunityDashboard';
import MemberDashboard from '../components/dashboards/MemberDashboard';

export default function HomeScreen() {
    const { activeWorkspace, isHydrated } = useAuthStore();
    const role = activeWorkspace?.role;

    if (!isHydrated) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    if (!activeWorkspace || !role) {
        return <DefaultDashboard />;
    }

    if (role === 'CLEANING_STAFF') {
        return <CleaningDashboard />;
    }

    if (role === 'SECURITY_STAFF') {
        return <SecurityDashboard />;
    }

    if (['SERVICE_STAFF', 'STAFF', 'MAINTENANCE_STAFF'].includes(role)) {
        return <ServiceStaffDashboard />;
    }

    if (['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF', 'ACCOUNTS_STAFF'].includes(role)) {
        return <AdminDashboard />;
    }

    if (role === 'RESIDENT') {
        return <DefaultDashboard />;
    }

    if ((role as string) === 'MEMBER') {
        return <MemberDashboard />;
    }

    return <AdminDashboard />;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a' },
});

