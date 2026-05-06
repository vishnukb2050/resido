import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function ServiceStaffDashboard() {
    const { activeWorkspace, user } = useAuthStore();

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{(user?.name || 'M')[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.headerTitles}>
                        <Text style={styles.apartment}>{activeWorkspace?.tenantName || 'Maintenance Team'}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>Maintenance / Service Staff</Text>
                        </View>
                        <Text style={styles.greeting}>Welcome, {user?.name || 'Staff Member'} 🛠️</Text>
                    </View>
                </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>5</Text>
                    <Text style={styles.statLabel}>Pending Tasks</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>12</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>2</Text>
                    <Text style={styles.statLabel}>High Priority</Text>
                </View>
            </View>

            {/* Tasks Section */}
            <Text style={styles.sectionTitle}>My Work Orders</Text>
            <View style={styles.taskList}>
                {[
                    { id: 1, title: 'Electrical Fix - Block B', loc: 'Flat 402', priority: 'HIGH' },
                    { id: 2, title: 'Plumbing Leakage', loc: 'Corridor Level 2', priority: 'MEDIUM' },
                ].map((task) => (
                    <View key={task.id} style={styles.taskItem}>
                        <View style={styles.taskHeader}>
                            <Text style={styles.taskTitle}>{task.title}</Text>
                            <View style={[styles.priorityBadge, { backgroundColor: task.priority === 'HIGH' ? '#fee2e2' : '#fef9c3' }]}>
                                <Text style={[styles.priorityText, { color: task.priority === 'HIGH' ? '#b91c1c' : '#854d0e' }]}>{task.priority}</Text>
                            </View>
                        </View>
                        <Text style={styles.taskLoc}>📍 {task.loc}</Text>
                        <TouchableOpacity style={styles.updateBtn}>
                            <Text style={styles.updateText}>Update Status</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            {/* Tools Grid */}
            <Text style={styles.sectionTitle}>Resources</Text>
            <View style={styles.toolGrid}>
                <TouchableOpacity style={styles.toolCard}>
                    <Text style={styles.toolIcon}>📋</Text>
                    <Text style={styles.toolLabel}>Inventory</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolCard}>
                    <Text style={styles.toolIcon}>🗺️</Text>
                    <Text style={styles.toolLabel}>Building Map</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolCard}>
                    <Text style={styles.toolIcon}>📞</Text>
                    <Text style={styles.toolLabel}>Contact Admin</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fdfcfb' },
    content: { padding: 20, paddingTop: 60 },
    headerRow: { marginBottom: 24 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
    headerTitles: { flex: 1 },
    apartment: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    roleBadge: { backgroundColor: '#ffedd5', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    roleText: { color: '#9a3412', fontSize: 10, fontWeight: '700' },
    greeting: { fontSize: 12, color: '#64748b', marginTop: 4 },
    statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
    statBox: { flex: 1, alignItems: 'center' },
    statNumber: { fontSize: 20, fontWeight: '800', color: '#ea580c' },
    statLabel: { fontSize: 10, color: '#64748b', marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
    taskList: { gap: 12, marginBottom: 24 },
    taskItem: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    taskTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    priorityText: { fontSize: 10, fontWeight: '700' },
    taskLoc: { fontSize: 13, color: '#64748b', marginBottom: 12 },
    updateBtn: { backgroundColor: '#ea580c', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    updateText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    toolGrid: { flexDirection: 'row', gap: 10 },
    toolCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    toolIcon: { fontSize: 24, marginBottom: 8 },
    toolLabel: { fontSize: 12, fontWeight: '600', color: '#1e293b' },
});
