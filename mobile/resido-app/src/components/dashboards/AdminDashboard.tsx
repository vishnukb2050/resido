import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, Workspace } from '../../store/authStore';
import { authApi } from '../../services/api';

export default function AdminDashboard() {
    const router = useRouter();
    const { user, workspaces, activeWorkspace, setActiveWorkspace } = useAuthStore();
    const [showWS, setShowWS] = useState(false);

    const handleSwitch = async (ws: Workspace) => {
        try {
            const res = await authApi.switchWorkspace(ws.tenantId);
            setActiveWorkspace(res.data.workspace, res.data.accessToken);
            setShowWS(false);
        } catch (e) {
            console.error('Switch failed', e);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header with Dropdown */}
            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <TouchableOpacity 
                        style={styles.workspaceSelector} 
                        onPress={() => workspaces.length > 1 && setShowWS(true)}
                    >
                        <Text style={styles.greeting}>
                            {activeWorkspace?.tenantName || 'Resido Personal'}
                        </Text>
                        {workspaces.length > 1 && <Text style={styles.dropdownIcon}> ⌵</Text>}
                    </TouchableOpacity>
                    <Text style={styles.subGreeting}>Welcome back, {user?.name?.split(' ')[0] || 'John'} 👋</Text>
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Text style={styles.iconText}>🔔</Text>
                        <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/chat-list')}>
                        <Text style={styles.iconText}>💬</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Workspace Selection Modal */}
            <Modal visible={showWS} transparent animationType="fade" onRequestClose={() => setShowWS(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowWS(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Switch Community</Text>
                        {workspaces.map((ws) => (
                            <TouchableOpacity 
                                key={ws.tenantId} 
                                style={[styles.wsOption, activeWorkspace?.tenantId === ws.tenantId && styles.wsOptionActive]}
                                onPress={() => handleSwitch(ws)}
                            >
                                <Text style={styles.wsOptionText}>{ws.tenantName}</Text>
                                <Text style={styles.wsOptionRole}>{ws.role}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statIconBadgeBlue}>👥</Text>
                    <Text style={styles.statNum}>128</Text>
                    <Text style={styles.statTitle}>Members</Text>
                    <Text style={styles.statLinkBlue}>View all</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={styles.statIconBadgeGreen}>📣</Text>
                    <Text style={styles.statNum}>5</Text>
                    <Text style={styles.statTitle}>Notices</Text>
                    <Text style={styles.statLinkGreen}>View all</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={styles.statIconBadgeOrng}>📅</Text>
                    <Text style={styles.statNum}>2</Text>
                    <Text style={styles.statTitle}>Events</Text>
                    <Text style={styles.statLinkOrng}>View all</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={styles.statIconBadgeRed}>🔧</Text>
                    <Text style={styles.statNum}>3</Text>
                    <Text style={styles.statTitle}>Complaints</Text>
                    <Text style={styles.statLinkRed}>View all</Text>
                </View>
            </View>

            {/* Explore Features */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Explore Features</Text>
            </View>
            <View style={styles.featuresGrid}>
                {[
                    { icon: '💬', label: 'Community\nChat', bg: '#f3e8ff', route: '/chat-list' },
                    { icon: '👥', label: 'Neighbors', bg: '#e6f7ef', route: '/members' },
                    { icon: '📅', label: 'Calendar', bg: '#fff7ed', route: '/calendar' },
                    { icon: '📣', label: 'Noticeboard', bg: '#ffedd5', route: '/notices' },
                    { icon: '🔧', label: 'Complaints', bg: '#fee2e2', route: '/complaints' },
                    { icon: '🖼️', label: 'Gallery', bg: '#dcfce7', route: '/gallery' },
                    { icon: '📇', label: 'Contacts', bg: '#e0e7ff', route: '/contacts' },
                    { icon: '📊', label: 'Polls', bg: '#ffe4e6', route: '/polls' },
                ].map((f, i) => (
                    <TouchableOpacity 
                        key={i} 
                        style={styles.featureItem}
                        onPress={() => f.route && router.push(f.route as any)}
                    >
                        <View style={[styles.featureIconWrap, { backgroundColor: f.bg }]}>
                            <Text style={styles.featureIcon}>{f.icon}</Text>
                        </View>
                        <Text style={styles.featureLabel}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Info Cards */}
            <View style={styles.cardsRow}>
                <View style={[styles.infoCard, { backgroundColor: '#f4faff' }]}>
                    <Text style={styles.cardTitleBlue}>Upcoming Event</Text>
                    <Text style={styles.eventTitle}>Community Meeting</Text>
                    <Text style={styles.eventSub}>🕒 Sun, 25 May</Text>
                </View>

                <View style={[styles.infoCard, { backgroundColor: '#f0fdf4' }]}>
                    <Text style={styles.cardTitleGreen}>Recent Notice</Text>
                    <Text style={styles.noticeTitle}>Water Supply</Text>
                    <Text style={styles.noticeDesc} numberOfLines={2}>Maintenance on May 20th.</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 16, paddingTop: 50, paddingBottom: 100 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    workspaceSelector: { flexDirection: 'row', alignItems: 'center' },
    greeting: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
    dropdownIcon: { fontSize: 18, color: '#6366f1', marginLeft: 4 },
    subGreeting: { fontSize: 13, color: '#64748b', marginTop: 2 },
    headerIcons: { flexDirection: 'row', gap: 12 },
    iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    iconText: { fontSize: 20 },
    badge: { position: 'absolute', top: -2, right: -4, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 20, textAlign: 'center' },
    wsOption: { padding: 16, borderRadius: 12, backgroundColor: '#f8fafc', marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    wsOptionActive: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#3b82f6' },
    wsOptionText: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
    wsOptionRole: { fontSize: 12, color: '#64748b', fontWeight: '500' },
    statsContainer: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 28 },
    statItem: { alignItems: 'center', flex: 1 },
    divider: { width: 1, height: '60%', backgroundColor: '#e2e8f0' },
    statIconBadgeBlue: { fontSize: 20, color: '#3b82f6', marginBottom: 4 },
    statIconBadgeGreen: { fontSize: 20, color: '#10b981', marginBottom: 4 },
    statIconBadgeOrng: { fontSize: 20, color: '#f59e0b', marginBottom: 4 },
    statIconBadgeRed: { fontSize: 20, color: '#ef4444', marginBottom: 4 },
    statNum: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    statTitle: { fontSize: 10, color: '#64748b', marginTop: 2, marginBottom: 4 },
    statLinkBlue: { fontSize: 9, color: '#3b82f6', fontWeight: '600' },
    statLinkGreen: { fontSize: 9, color: '#10b981', fontWeight: '600' },
    statLinkOrng: { fontSize: 9, color: '#f59e0b', fontWeight: '600' },
    statLinkRed: { fontSize: 9, color: '#ef4444', fontWeight: '600' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 20 },
    featureItem: { width: '22%', alignItems: 'center', marginBottom: 4 },
    featureIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    featureIcon: { fontSize: 22 },
    featureLabel: { fontSize: 10, color: '#475569', fontWeight: '500', textAlign: 'center', lineHeight: 12 },
    cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    infoCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
    cardTitleBlue: { fontSize: 12, fontWeight: '700', color: '#1d4ed8', marginBottom: 6 },
    cardTitleGreen: { fontSize: 12, fontWeight: '700', color: '#15803d', marginBottom: 6 },
    eventTitle: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
    eventSub: { fontSize: 10, color: '#64748b' },
    noticeTitle: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
    noticeDesc: { fontSize: 10, color: '#475569', lineHeight: 14 },
});
