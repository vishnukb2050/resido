import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function CleaningDashboard() {
    const { activeWorkspace, user } = useAuthStore();

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header section matched to mockup */}
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{(user?.name || 'P')[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.headerTitles}>
                        <View style={styles.workspaceRow}>
                            <Text style={styles.apartment}>{activeWorkspace?.tenantName || 'Greenwood Residency'}</Text>
                            <Text style={styles.chevron}> ⌄</Text>
                        </View>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>Cleaning Staff</Text>
                        </View>
                        <Text style={styles.greeting}>Welcome back, {user?.name?.split(' ')[0] || 'Priya'} 👋</Text>
                    </View>
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Text style={styles.iconText}>🔔</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton}>
                        <Text style={styles.iconText}>💬</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Today's Schedule Card */}
            <View style={styles.scheduleCard}>
                <View style={styles.scheduleLeft}>
                    <Text style={styles.scheduleIcon}>📅</Text>
                    <View>
                        <Text style={styles.scheduleTitle}>Today's Schedule</Text>
                        <Text style={styles.scheduleSub}>2 Areas Assigned</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.viewScheduleBtn}>
                    <Text style={styles.viewScheduleText}>📅 View Schedule</Text>
                </TouchableOpacity>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statIconBadgePurp}>📅</Text>
                    <Text style={styles.statNumber}>18</Text>
                    <Text style={styles.statLabel}>Cleanings</Text>
                    <Text style={styles.statSub}>This Month</Text>
                </View>
                <View style={styles.statBoxMid}>
                    <Text style={styles.statIconBadgeGreen}>✓</Text>
                    <Text style={styles.statNumber}>16</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                    <Text style={styles.statSub}>This Month</Text>
                </View>
                <View style={styles.statBoxMid}>
                    <Text style={styles.statIconBadgeOrng}>🕒</Text>
                    <Text style={styles.statNumber}>2</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                    <Text style={styles.statSub}>Today</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statIconBadgeBlue}>⭐</Text>
                    <Text style={styles.statNumber}>4.8</Text>
                    <Text style={styles.statLabel}>Rating</Text>
                    <Text style={styles.statSub}>This Month</Text>
                </View>
            </View>

            {/* My Cleaning Tasks */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Cleaning Tasks</Text>
                <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
            </View>

            <View style={styles.taskCard}>
                <View style={styles.taskIconGreen}><Text style={{ fontSize: 20 }}>🏢</Text></View>
                <View style={styles.taskContent}>
                    <View style={styles.taskTitleRow}>
                        <Text style={styles.taskTitle}>Tower A - Lobby & Corridor</Text>
                        <Text style={styles.dailyBadge}>Daily</Text>
                    </View>
                    <Text style={styles.taskDetail}>🕒 10 May 2024, 8:00 AM</Text>
                    <Text style={styles.taskDetail}>📍 Ground Floor, Lobby Area</Text>
                </View>
                <View style={styles.statusCompleted}><Text style={styles.statusCompletedText}>Completed</Text></View>
                <Text style={styles.arrowIcon}>›</Text>
            </View>

            <View style={styles.taskCard}>
                <View style={styles.taskIconPurp}><Text style={{ fontSize: 20 }}>🪜</Text></View>
                <View style={styles.taskContent}>
                    <View style={styles.taskTitleRow}>
                        <Text style={styles.taskTitle}>Tower A - Staircase</Text>
                        <Text style={styles.dailyBadge}>Daily</Text>
                    </View>
                    <Text style={styles.taskDetail}>🕒 10 May 2024, 10:00 AM</Text>
                    <Text style={styles.taskDetail}>📍 Staircase 1 to 5</Text>
                </View>
                <View style={styles.statusPending}><Text style={styles.statusPendingText}>Pending</Text></View>
                <Text style={styles.arrowIcon}>›</Text>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
                <TouchableOpacity style={styles.actionBlock}>
                    <Text style={styles.actionIconGreen}>📷</Text>
                    <Text style={styles.actionText}>Upload Photo</Text>
                    <Text style={styles.actionText}>of Cleaning</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBlock}>
                    <Text style={styles.actionIconBlue}>📋</Text>
                    <Text style={styles.actionText}>Update Cleaning</Text>
                    <Text style={styles.actionText}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBlock}>
                    <Text style={styles.actionIconPurp}>📝</Text>
                    <Text style={styles.actionText}>View My</Text>
                    <Text style={styles.actionText}>Tasks</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBlock}>
                    <Text style={styles.actionIconOrng}>🕒</Text>
                    <Text style={styles.actionText}>Cleaning</Text>
                    <Text style={styles.actionText}>History</Text>
                </TouchableOpacity>
            </View>

            {/* Recent Cleaning Records */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Cleaning Records</Text>
                <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
            </View>

            <View style={styles.recordCard}>
                <View style={styles.recordImgPlaceholder}></View>
                <View style={styles.recordContent}>
                    <Text style={styles.recordTitle}>Lobby & Reception Area</Text>
                    <Text style={styles.recordDetail}>🕒 09 May 2024, 8:15 AM</Text>
                    <Text style={styles.recordDetail}>👤 Cleaned by {user?.name?.split(' ')[0] || 'Priya'}</Text>
                </View>
                <View style={styles.statusCompleted}><Text style={styles.statusCompletedText}>Completed</Text></View>
                <Text style={styles.arrowIcon}>›</Text>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    content: { padding: 16, paddingTop: 50, paddingBottom: 100 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#cbe2f1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { fontSize: 20, color: '#333' },
    headerTitles: { flex: 1 },
    workspaceRow: { flexDirection: 'row', alignItems: 'center' },
    apartment: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    chevron: { fontSize: 18, color: '#1a1a1a' },
    roleBadge: { backgroundColor: '#e6f7ef', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, marginBottom: 4 },
    roleText: { color: '#0d945b', fontSize: 10, fontWeight: '600' },
    greeting: { fontSize: 12, color: '#555' },
    headerIcons: { flexDirection: 'row', gap: 10 },
    iconButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center' },
    iconText: { fontSize: 16 },

    scheduleCard: { backgroundColor: '#f0f9f4', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    scheduleLeft: { flexDirection: 'row', alignItems: 'center' },
    scheduleIcon: { fontSize: 24, marginRight: 12 },
    scheduleTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
    scheduleSub: { fontSize: 12, color: '#555' },
    viewScheduleBtn: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e6e6e6' },
    viewScheduleText: { fontSize: 12, color: '#0d945b', fontWeight: '600' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#f0f0f0' },
    statBox: { flex: 1, alignItems: 'center' },
    statBoxMid: { flex: 1, alignItems: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f0f0f0' },
    statIconBadgePurp: { fontSize: 20, marginBottom: 4 },
    statIconBadgeGreen: { fontSize: 20, marginBottom: 4, color: '#0d945b' },
    statIconBadgeOrng: { fontSize: 20, marginBottom: 4, color: '#e67300' },
    statIconBadgeBlue: { fontSize: 20, marginBottom: 4, color: '#2563eb' },
    statNumber: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    statLabel: { fontSize: 10, color: '#555', marginTop: 2 },
    statSub: { fontSize: 9, color: '#999' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 10 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
    viewAllText: { fontSize: 12, color: '#6366f1', fontWeight: '600' },

    taskCard: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 12 },
    taskIconGreen: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#e6f7ef', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    taskIconPurp: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    taskContent: { flex: 1 },
    taskTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    taskTitle: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginRight: 8 },
    dailyBadge: { fontSize: 9, color: '#0d945b', backgroundColor: '#e6f7ef', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    taskDetail: { fontSize: 11, color: '#777', marginBottom: 2 },
    statusCompleted: { backgroundColor: '#e6f7ef', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
    statusCompletedText: { fontSize: 10, color: '#0d945b', fontWeight: '600' },
    statusPending: { backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
    statusPendingText: { fontSize: 10, color: '#e67300', fontWeight: '600' },
    arrowIcon: { fontSize: 18, color: '#a0a0a0' },

    quickActionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, marginTop: 12 },
    actionBlock: { width: '23%', aspectRatio: 0.9, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', padding: 4 },
    actionIconGreen: { fontSize: 24, color: '#0d945b', marginBottom: 8 },
    actionIconBlue: { fontSize: 24, color: '#2563eb', marginBottom: 8 },
    actionIconPurp: { fontSize: 24, color: '#8b5cf6', marginBottom: 8 },
    actionIconOrng: { fontSize: 24, color: '#e67300', marginBottom: 8 },
    actionText: { fontSize: 9, color: '#1a1a1a', textAlign: 'center', fontWeight: '500' },

    recordCard: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 12 },
    recordImgPlaceholder: { width: 50, height: 40, borderRadius: 8, backgroundColor: '#e0e0e0', marginRight: 12 },
    recordContent: { flex: 1 },
    recordTitle: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
    recordDetail: { fontSize: 11, color: '#777', marginBottom: 2 },
});
