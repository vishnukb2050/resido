import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';

// Dashboards
import AdminDashboard from '../components/dashboards/AdminDashboard';
import CleaningDashboard from '../components/dashboards/CleaningDashboard';
import SecurityDashboard from '../components/dashboards/SecurityDashboard';
import ServiceStaffDashboard from '../components/dashboards/ServiceStaffDashboard';
import DefaultDashboard from '../components/dashboards/DefaultDashboard';

export default function HomeScreen() {
    const { activeWorkspace, user } = useAuthStore();
    const role = activeWorkspace?.role;

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

    if (['APARTMENT_ADMIN', 'RESIDENT', 'CARETAKER', 'ADMIN_STAFF', 'ACCOUNTS_STAFF'].includes(role)) {
        return <AdminDashboard />;
    }

    return <AdminDashboard />;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a' },
});

