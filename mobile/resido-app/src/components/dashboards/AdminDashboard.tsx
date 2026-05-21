import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, Workspace } from '../../store/authStore';
import { authApi } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../BottomNav';
import { getThemeColors } from '../../utils/theme';

export default function AdminDashboard() {
    const router = useRouter();
    const { user, workspaces, activeWorkspace, setActiveWorkspace, switchRole } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);
    const [showWS, setShowWS] = useState(false);
    const [switchingRole, setSwitchingRole] = useState(false);

    const handleSwitch = async (ws: Workspace) => {
        try {
            const defaultRole = ws.role || ws.roles?.[0];
            const currentToken = useAuthStore.getState().token || '';
            
            // Optimistically set activeWorkspace
            setActiveWorkspace({ ...ws, role: defaultRole }, currentToken);
            setShowWS(false);

            const res = await authApi.switchWorkspace(ws.tenantId, defaultRole);
            setActiveWorkspace(res.data.workspace, res.data.accessToken);
        } catch (e) {
            console.error('Switch failed', e);
        }
    };

    const handleSwitchRole = async (role: string) => {
        if (!activeWorkspace || switchingRole) return;
        const currentToken = useAuthStore.getState().token || '';
        try {
            setSwitchingRole(true);
            // Optimistically set role
            setActiveWorkspace({ ...activeWorkspace, role: role as any }, currentToken);

            const res = await authApi.switchWorkspace(activeWorkspace.tenantId, role);
            setActiveWorkspace(res.data.workspace, res.data.accessToken);
        } catch (e) {
            console.error('Failed to switch role:', e);
            setActiveWorkspace(activeWorkspace, currentToken);
        } finally {
            setSwitchingRole(false);
        }
    };

    return (
        <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
                {/* Premium Header */}
                <View style={[styles.psHeader, { backgroundColor: theme.background }]}>
                    <View style={styles.psBrandInfo}>
                        <View style={styles.psLogoBox}>
                            <Image 
                                source={activeWorkspace?.photoUrl ? { uri: activeWorkspace.photoUrl } : require('../../../assets/icon.png')} 
                                style={styles.psWorkspaceImg} 
                            />
                        </View>
                        <View style={{ marginLeft: 15 }}>
                            <Text style={styles.psBrandTitleText}>
                                {activeWorkspace?.tenantName || "Resido Admin"}
                            </Text>
                            <Text style={styles.psBrandTaglineText}>
                                {activeWorkspace?.role || "ADMINISTRATOR"}
                            </Text>
                        </View>
                    </View>

                </View>

                {/* Premium Workspace Switcher (Bubbles) */}
                <View style={styles.psWorkspaceSection}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.psWorkspaceScroll}
                    >
                        <WorkspaceBubble 
                            label="My Space" 
                            isActive={!activeWorkspace} 
                            onPress={() => setActiveWorkspace(null as any, '')} 
                            image={user?.profilePhoto || "https://i.pravatar.cc/100?u=resido"}
                        />
                        {workspaces.map((ws: any) => (
                            <WorkspaceBubble 
                                key={ws.tenantId} 
                                label={ws.tenantName} 
                                isActive={activeWorkspace?.tenantId === ws.tenantId} 
                                onPress={() => handleSwitch(ws)} 
                                image={ws.photoUrl || "https://cdn-icons-png.flaticon.com/512/9374/9374944.png"}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* Role Switcher */}
                {activeWorkspace && (activeWorkspace.roles?.length ?? 0) > 1 && (
                    <View style={styles.roleSwitcherRow}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                            {activeWorkspace.roles.map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    onPress={() => handleSwitchRole(r)}
                                    style={[
                                        styles.rolePill,
                                        activeWorkspace.role === r && styles.rolePillActive
                                    ]}
                                    disabled={switchingRole}
                                >
                                    <Text style={[
                                        styles.rolePillText,
                                        activeWorkspace.role === r && styles.rolePillTextActive
                                    ]}>
                                        {r.replace(/_/g, ' ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Search Bar */}
                <View style={styles.psSearchSection}>
                    <View style={[styles.psSearchBar, { backgroundColor: theme.surface }]}>
                        <Ionicons name="search" size={20} color="#94a3b8" />
                        <TextInput 
                            placeholder="Search management tools..." 
                            style={styles.psSearchInput}
                            placeholderTextColor="#64748b"
                        />
                    </View>
                </View>

                {/* Admin Grid */}
                <View style={styles.adminGrid}>
                    <DashboardIcon icon="stats-chart" label="Stats" color="#fff" bg="rgba(37, 99, 235, 0.2)" onPress={() => router.push('/admin-stats')} />
                    <DashboardIcon icon="construct" label="Requests" color="#fff" bg="rgba(239, 68, 68, 0.2)" onPress={() => router.push('/admin-complaints')} />
                    <DashboardIcon icon="calendar" label="Events" color="#fff" bg="rgba(59, 130, 246, 0.2)" onPress={() => router.push('/events')} />
                    <DashboardIcon icon="book" label="Rules" color="#fff" bg="rgba(245, 158, 11, 0.2)" onPress={() => router.push('/rules')} />
                    <DashboardIcon icon="settings" label="Settings" color="#fff" bg="rgba(16, 185, 129, 0.2)" onPress={() => router.push('/manage-community')} />
                    <DashboardIcon icon="cash" label="Finance" color="#fff" bg="rgba(14, 165, 233, 0.2)" onPress={() => router.push('/admin-finance')} />
                </View>

                {/* Management Sections */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>People Management</Text>
                    <View style={styles.featureGrid}>
                        <FeatureCard icon="people" title="Manage Residents" color="#fff" bg="#3182ce" onPress={() => router.push('/manage-residents')} />
                        <FeatureCard icon="people-circle" title="Manage Staff" color="#fff" bg="#10b981" onPress={() => router.push('/staff')} />
                        <FeatureCard icon="megaphone" title="Notices" color="#fff" bg="#f59e0b" onPress={() => router.push('/notices')} />


                        <FeatureCard icon="people" title="Families" color="#fff" bg="#be185d" onPress={() => router.push('/view-families')} />
                        <FeatureCard icon="shield-checkmark" title="Duty Roster" color="#fff" bg="#1d4ed8" />
                        <FeatureCard icon="document-text" title="Staff Docs" color="#fff" bg="#3b82f6" onPress={() => router.push('/staff-documents')} />
                        <FeatureCard icon="notifications" title="Reminders" color="#fff" bg="#6366f1" onPress={() => router.push('/admin-reminders')} />

                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Community Tools</Text>
                    <View style={styles.featureGrid}>
                        <FeatureCard icon="id-card" title="Visitor Reg" color="#fff" bg="#3b82f6" onPress={() => router.push('/visitor-register')} />
                        <FeatureCard icon="qr-code" title="Gatepass Scanner" color="#fff" bg="#059669" onPress={() => router.push('/gatepass-scanner')} />
                        <FeatureCard icon="log-in" title="Gatepass" color="#fff" bg="#f59e0b" onPress={() => router.push('/gatepass')} />
                        <FeatureCard icon="chatbubbles" title="Resident Chat" color="#fff" bg="#4a5568" onPress={() => router.push('/chat-list')} />
                        <FeatureCard icon="folder" title="Docs & Legal" color="#fff" bg="#2d3748" onPress={() => router.push('/documents')} />
                        <FeatureCard icon="newspaper" title="Feed Mgmt" color="#fff" bg="#1a365d" onPress={() => router.push('/thread')} />
                        <FeatureCard icon="tennisball" title="Amenities" color="#fff" bg="#6366f1" onPress={() => router.push('/amenities')} />
                        <FeatureCard icon="settings" title="Manage Community" color="#fff" bg="#ec4899" onPress={() => router.push('/manage-community')} />
                        <FeatureCard icon="cube" title="Community Assets" color="#fff" bg="#d97706" onPress={() => router.push('/admin-assets')} />
                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Community Finance</Text>
                    <View style={styles.featureGrid}>
                        <FeatureCard icon="cash" title="Maintenance" color="#fff" bg="#0ea5e9" onPress={() => router.push('/admin-maintenance')} />
                        <FeatureCard icon="trending-up" title="Comm. Income" color="#fff" bg="#10b981" onPress={() => router.push('/admin-finance')} />
                        <FeatureCard icon="trending-down" title="Comm. Expense" color="#fff" bg="#f43f5e" onPress={() => router.push('/admin-finance')} />
                        <FeatureCard icon="pie-chart" title="Finance Report" color="#fff" bg="#3b82f6" onPress={() => router.push('/admin-finance')} />
                        <FeatureCard icon="alert-circle" title="Dues Report" color="#fff" bg="#f59e0b" onPress={() => router.push('/admin-maintenance')} />
                    </View>
                </View>

            </ScrollView>
            <BottomNav activeTab="Home" />
        </View>
    );
}

// Sub-components
function WorkspaceBubble({ label, isActive, onPress, image }: any) {
    return (
        <TouchableOpacity 
            style={[styles.wsBubble, isActive && styles.wsBubbleActive]} 
            onPress={onPress}
        >
            <View style={[styles.wsBubbleImgBox, isActive && styles.wsBubbleImgBoxActive]}>
                <Image source={{ uri: image }} style={styles.wsBubbleImg} />
            </View>
            <Text style={[styles.wsBubbleLabel, isActive && styles.wsBubbleLabelActive]} numberOfLines={1}>{label}</Text>
        </TouchableOpacity>
    );
}

function DashboardIcon({ icon, label, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.dbIconItem} onPress={onPress}>
            <View style={[styles.dbIconBox, { backgroundColor: bg }]}>
                <Ionicons name={icon as any} size={28} color={color} />
            </View>
            <Text style={styles.dbIconLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function StatBox({ count, label, icon }: any) {
    return (
        <View style={styles.statBox}>
            <Ionicons name={icon as any} size={20} color="#fff" style={{ marginBottom: 4, opacity: 0.7 }} />
            <Text style={styles.statBoxCount}>{count}</Text>
            <Text style={styles.statBoxLabel}>{label}</Text>
        </View>
    );
}

function FeatureCard({ icon, title, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.featureCard} onPress={onPress}>
            <View style={[styles.fCardHeader, { backgroundColor: bg }]}>
                <Ionicons name={icon as any} size={28} color={color} />
            </View>
            <Text style={styles.fCardTitle}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    content: { paddingBottom: 110 },
    
    // Premium Header
    psHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    psBrandInfo: { flexDirection: 'row', alignItems: 'center' },
    psLogoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    psWorkspaceImg: { width: '100%', height: '100%', borderRadius: 12 },
    psBrandTitleText: { fontSize: 24, fontWeight: '900', color: '#fff' },
    psBrandTaglineText: { fontSize: 10, color: '#94a3b8', fontWeight: '800', letterSpacing: 1 },
    
    psHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    psIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    psNotifBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#ef4444', minWidth: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#000000' },
    psNotifCount: { color: '#fff', fontSize: 8, fontWeight: '900' },
    adminAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

    // Workspace Bubbles
    psWorkspaceSection: { marginBottom: 20 },
    psWorkspaceScroll: { paddingHorizontal: 20, gap: 15 },
    wsBubble: { alignItems: 'center', width: 70 },
    wsBubbleActive: { width: 85 },
    wsBubbleImgBox: { width: 60, height: 60, borderRadius: 30, padding: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'transparent' },
    wsBubbleImgBoxActive: { width: 75, height: 75, borderRadius: 37.5, borderColor: '#fff' },
    wsBubbleImg: { width: '100%', height: '100%', borderRadius: 40 },
    wsBubbleLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', marginTop: 8 },
    wsBubbleLabelActive: { color: '#fff', fontSize: 11, fontWeight: '900' },

    // Search Section
    psSearchSection: { paddingHorizontal: 20, marginBottom: 20 },
    psSearchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 15, height: 48, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    psSearchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#fff', fontWeight: '600' },

    // Admin Grid
    adminGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 25 },
    dbIconItem: { width: '18%', alignItems: 'center' },
    dbIconBox: { width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    dbIconLabel: { color: '#fff', fontSize: 9, fontWeight: '800', textAlign: 'center' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 30, backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statBox: { alignItems: 'center', flex: 1 },
    statBoxCount: { fontSize: 16, fontWeight: '900', color: '#fff' },
    statBoxLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700', marginTop: 2 },

    sectionContainer: { paddingHorizontal: 20, marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 15 },
    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'space-between' },
    featureCard: { width: '30%', alignItems: 'center', marginBottom: 15 },
    fCardHeader: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    fCardTitle: { color: '#fff', fontSize: 11, fontWeight: '800', textAlign: 'center' },

    // Role Switcher
    roleSwitcherRow: { marginBottom: 15 },
    rolePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    rolePillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    rolePillText: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
    rolePillTextActive: { color: '#fff' },
});
