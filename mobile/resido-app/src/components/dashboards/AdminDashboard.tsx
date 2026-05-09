import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, Workspace } from '../../store/authStore';
import { authApi } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../BottomNav';

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
        <View style={{ flex: 1, backgroundColor: '#fcfcfd' }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Header Section */}
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logoCircle}>
                            <Image source={require('../../../assets/icon.png')} style={styles.logoMini} />
                        </View>
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.residoBrand}>Resido</Text>
                            <Text style={styles.welcomeAdmin}>Welcome, Admin <Ionicons name="shield-checkmark" size={14} color="#6366f1" /></Text>
                            <Text style={styles.roleSubtext}>Caretaker / Administrator</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.headerIconBtn}>
                            <Ionicons name="notifications-outline" size={24} color="#1e293b" />
                            <View style={styles.redDot}><Text style={styles.dotText}>3</Text></View>
                        </TouchableOpacity>
                        <Image 
                            source={{ uri: user?.profilePhoto || 'https://i.pravatar.cc/150?u=admin' }} 
                            style={styles.adminAvatar} 
                        />
                    </View>
                </View>

                {/* Workspace Selector Card */}
                <TouchableOpacity 
                    style={styles.workspaceCard}
                    onPress={() => workspaces.length > 1 && setShowWS(true)}
                >
                    <View style={styles.wsCardLeft}>
                        <Text style={styles.wsCardTitle}>Community Workspace</Text>
                        <Text style={styles.wsCardDesc}>Manage your community from one place</Text>
                        <View style={styles.loginBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                            <Text style={styles.loginBadgeText}>You are logged in as Admin</Text>
                        </View>
                    </View>
                    <View style={styles.wsSelectorBtn}>
                        <View style={styles.wsIconBox}>
                            <Ionicons name="business" size={20} color="#6366f1" />
                        </View>
                        <Text style={styles.wsNameText} numberOfLines={1}>
                            {activeWorkspace?.tenantName || 'Green Valley Residency'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#64748b" />
                    </View>
                </TouchableOpacity>

                {/* Quick Stats Row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={{ paddingRight: 20 }}>
                    <StatCard icon="document-text" count="12" label="Pending Complaints" color="#8b5cf6" />
                    <StatCard icon="wallet" count="₹1,25,000" label="Pending Payments" color="#10b981" />
                    <StatCard icon="people" count="34" label="Visitors Today" color="#f59e0b" />
                    <StatCard icon="id-card" count="18" label="Staff Present" color="#3b82f6" />
                </ScrollView>

                {/* Community Management Grid */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Community Management</Text>
                    <TouchableOpacity><Text style={styles.editLink}>Edit</Text></TouchableOpacity>
                </View>

                <View style={styles.managementGrid}>
                    <ManagementItem icon="megaphone" label="Noticeboard" sub="Create & manage notices" bg="#eff6ff" icColor="#3b82f6" onPress={() => router.push('/notices')} />
                    <ManagementItem icon="warning" label="Complaints" sub="Manage & track complaints" bg="#fff7ed" icColor="#f59e0b" onPress={() => router.push('/complaints')} />
                    <ManagementItem icon="people" label="Members" sub="Manage residents & tenants" bg="#f0fdf4" icColor="#10b981" onPress={() => router.push('/members')} />
                    <ManagementItem icon="person-circle" label="Staff Management" sub="Manage staff, attendance & tasks" bg="#eff6ff" icColor="#3b82f6" onPress={() => router.push('/staff')} />
                    
                    <ManagementItem icon="wallet" label="Finance & Billing" sub="Income, expenses & billing" bg="#f0fdf4" icColor="#10b981" onPress={() => {}} />
                    <ManagementItem icon="shield-checkmark" label="Gatepass" sub="Visitor & delivery management" bg="#fff1f2" icColor="#ef4444" onPress={() => router.push('/visitor-entry')} />
                    <ManagementItem icon="calendar" label="Events & Calendar" sub="Manage events & amenities" bg="#f5f3ff" icColor="#8b5cf6" onPress={() => router.push('/calendar')} />
                    <ManagementItem icon="folder" label="Documents" sub="Manage community documents" bg="#fff7ed" icColor="#f59e0b" onPress={() => router.push('/documents')} />
                    <ManagementItem icon="document-text" label="Notes" sub="Personal & community notes" bg="#fdf2f8" icColor="#ec4899" onPress={() => router.push('/notes')} />

                    <ManagementItem icon="chatbubbles" label="Community Chat" sub="Chat with residents & groups" bg="#fdf2f8" icColor="#ec4899" onPress={() => router.push('/chat-list')} />
                    <ManagementItem icon="images" label="Gallery" sub="Photos & videos management" bg="#eff6ff" icColor="#3b82f6" onPress={() => router.push('/gallery')} />
                    
                    {/* Addons: Threads & Flares */}
                    <ManagementItem icon="newspaper" label="Threads" sub="Social feed & discussions" bg="#f5f3ff" icColor="#6366f1" onPress={() => router.push('/thread')} />
                    <ManagementItem icon="play-circle" label="Flares" sub="Short community videos" bg="#fff1f2" icColor="#ef4444" onPress={() => router.push('/flares')} />
                </View>

                {/* Quick Actions */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
                    <QuickAction icon="megaphone-outline" label="Create Notice" onPress={() => {}} />
                    <QuickAction icon="person-add-outline" label="Add Member" onPress={() => router.push('/create-member')} />
                    <QuickAction icon="wallet-outline" label="Add Expense" onPress={() => {}} />
                    <QuickAction icon="receipt-outline" label="Create Bill" onPress={() => {}} />
                    <QuickAction icon="ellipsis-horizontal" label="More" onPress={() => {}} />
                </ScrollView>

                {/* Recent Activities */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Activities</Text>
                    <TouchableOpacity><Text style={styles.viewAllLink}>View all</Text></TouchableOpacity>
                </View>
                <View style={styles.activitiesList}>
                    <ActivityItem icon="warning" color="#ef4444" title="New complaint submitted in Block A" sub="Plumbing issue in Flat A-101" time="10 mins ago" />
                    <ActivityItem icon="wallet" color="#10b981" title="Maintenance fee collected from Flat B-202" sub="₹5,000" time="45 mins ago" />
                    <ActivityItem icon="person" color="#3b82f6" title="New visitor entry at Main Gate" sub="Rahul Sharma - Flat C-303" time="1 hour ago" />
                </View>

            </ScrollView>

            <BottomNav activeTab="Home" />

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
        </View>
    );
}

function StatCard({ icon, count, label, color }: any) {
    return (
        <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.statCount}>{count}</Text>
            <Text style={styles.statLabelText}>{label}</Text>
            <TouchableOpacity><Text style={[styles.viewLink, { color }]}>View all ›</Text></TouchableOpacity>
        </View>
    );
}

function ManagementItem({ icon, label, sub, bg, icColor, onPress }: any) {
    return (
        <TouchableOpacity style={styles.mgmtItem} onPress={onPress}>
            <View style={[styles.mgmtIconWrap, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={22} color={icColor} />
            </View>
            <Text style={styles.mgmtLabel}>{label}</Text>
            <Text style={styles.mgmtSub}>{sub}</Text>
        </TouchableOpacity>
    );
}

function QuickAction({ icon, label, onPress }: any) {
    return (
        <TouchableOpacity style={styles.quickAction} onPress={onPress}>
            <Ionicons name={icon} size={18} color="#6366f1" />
            <Text style={styles.quickActionLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function ActivityItem({ icon, color, title, sub, time }: any) {
    return (
        <TouchableOpacity style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={16} color={color} />
            </View>
            <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{title}</Text>
                <Text style={styles.activitySub}>{sub}</Text>
            </View>
            <View style={styles.activityRight}>
                <Text style={styles.activityTime}>{time}</Text>
                <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
            </View>
        </TouchableOpacity>
    );
}

function NavItem({ icon, label, active, onPress }: any) {
    return (
        <TouchableOpacity style={styles.navItem} onPress={onPress}>
            <Ionicons name={icon} size={24} color={active ? '#6366f1' : '#94a3b8'} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, paddingTop: 60, paddingBottom: 110 },
    
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    logoCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
    logoMini: { width: 28, height: 28 },
    residoBrand: { fontSize: 24, fontWeight: '900', color: '#6366f1' },
    welcomeAdmin: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 2 },
    roleSubtext: { fontSize: 11, color: '#64748b', marginTop: 1 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1, borderColor: '#f1f5f9' },
    redDot: { position: 'absolute', top: 8, right: 8, backgroundColor: '#ef4444', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    dotText: { color: '#fff', fontSize: 8, fontWeight: '900' },
    adminAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#f1f5f9' },

    workspaceCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
    wsCardLeft: { marginBottom: 15 },
    wsCardTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    wsCardDesc: { fontSize: 12, color: '#64748b', marginTop: 4 },
    loginBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
    loginBadgeText: { fontSize: 11, color: '#10b981', fontWeight: '700' },
    wsSelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    wsIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    wsNameText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1e293b' },

    statsScroll: { marginBottom: 30 },
    statCard: { width: 160, backgroundColor: '#fff', borderRadius: 20, padding: 16, marginRight: 15, borderWidth: 1, borderColor: '#f1f5f9' },
    statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    statCount: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
    statLabelText: { fontSize: 11, color: '#64748b', marginBottom: 12, fontWeight: '600' },
    viewLink: { fontSize: 11, fontWeight: '800' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
    editLink: { fontSize: 13, color: '#6366f1', fontWeight: '700' },

    managementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    mgmtItem: { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', textAlign: 'center' },
    mgmtIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    mgmtLabel: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
    mgmtSub: { fontSize: 10, color: '#94a3b8', textAlign: 'center', fontWeight: '500' },

    quickActionsScroll: { marginBottom: 30 },
    quickAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginRight: 10, borderWidth: 1, borderColor: '#f1f5f9', gap: 8 },
    quickActionLabel: { fontSize: 13, fontWeight: '700', color: '#1e293b' },

    viewAllLink: { fontSize: 13, color: '#6366f1', fontWeight: '700' },
    activitiesList: { backgroundColor: '#fff', borderRadius: 24, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    activityItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    activityContent: { flex: 1 },
    activityTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
    activitySub: { fontSize: 11, color: '#64748b', marginTop: 2 },
    activityRight: { alignItems: 'flex-end', gap: 4 },
    activityTime: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },

    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 25, borderTopWidth: 1, borderTopColor: '#f1f5f9', borderTopLeftRadius: 35, borderTopRightRadius: 35, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.04, shadowRadius: 15, elevation: 20 },
    navItem: { alignItems: 'center', justifyContent: 'center' },
    navLabel: { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: '700' },
    navLabelActive: { color: '#6366f1' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 20, textAlign: 'center' },
    wsOption: { padding: 18, borderRadius: 16, backgroundColor: '#f8fafc', marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    wsOptionActive: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#6366f1' },
    wsOptionText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    wsOptionRole: { fontSize: 12, color: '#64748b', fontWeight: '600' },
});
