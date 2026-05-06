import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function SecurityDashboard() {
    const { activeWorkspace, user } = useAuthStore();

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{(user?.name || 'S')[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.headerTitles}>
                        <Text style={styles.apartment}>{activeWorkspace?.tenantName || 'Security Team'}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>Security Staff</Text>
                        </View>
                        <Text style={styles.greeting}>On Duty: {user?.name || 'Officer'} 🛡️</Text>
                    </View>
                </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>12</Text>
                    <Text style={styles.statLabel}>Visitors Today</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>4</Text>
                    <Text style={styles.statLabel}>Gate Passes</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>8</Text>
                    <Text style={styles.statLabel}>Parcels</Text>
                </View>
            </View>

            {/* Main Actions */}
            <Text style={styles.sectionTitle}>Gate Control</Text>
            <View style={styles.actionGrid}>
                <TouchableOpacity style={styles.actionCard}>
                    <Text style={styles.actionIcon}>🎟️</Text>
                    <Text style={styles.actionLabel}>Verify Pass</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCard}>
                    <Text style={styles.actionIcon}>👤</Text>
                    <Text style={styles.actionLabel}>Log Visitor</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCard}>
                    <Text style={styles.actionIcon}>📦</Text>
                    <Text style={styles.actionLabel}>Add Parcel</Text>
                </TouchableOpacity>
            </View>

            {/* Recent Log */}
            <Text style={styles.sectionTitle}>Recent Logins</Text>
            <View style={styles.logList}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.logItem}>
                        <Text style={styles.logTitle}>Visitor Entry - Delivery</Text>
                        <Text style={styles.logTime}>10:45 AM • Gate 1</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 20, paddingTop: 60 },
    headerRow: { marginBottom: 24 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
    headerTitles: { flex: 1 },
    apartment: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    roleBadge: { backgroundColor: '#fee2e2', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    roleText: { color: '#b91c1c', fontSize: 10, fontWeight: '700' },
    greeting: { fontSize: 12, color: '#64748b', marginTop: 4 },
    statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
    statBox: { flex: 1, alignItems: 'center' },
    statNumber: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    statLabel: { fontSize: 10, color: '#64748b', marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
    actionGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    actionIcon: { fontSize: 24, marginBottom: 8 },
    actionLabel: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
    logList: { gap: 10 },
    logItem: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    logTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
    logTime: { fontSize: 12, color: '#64748b', marginTop: 4 },
});
