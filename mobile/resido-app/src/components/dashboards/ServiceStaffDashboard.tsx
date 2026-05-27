import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WorkspaceBubble } from '../WorkspaceBubble';
import { getThemeColors } from '../../utils/theme';
import { useProfileRefresh } from '../../hooks/useProfileRefresh';

export default function ServiceStaffDashboard() {
    const { activeWorkspace, user, workspaces, setActiveWorkspace, switchRole } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);
    const router = useRouter();
    const [switchingRole, setSwitchingRole] = React.useState(false);
    const imageTimestamp = useProfileRefresh();

    const handleSwitch = async (ws: any) => {
        try {
            if (activeWorkspace?.tenantId === ws.tenantId) {
                return;
            }
            const defaultRole = ws.role || ws.roles?.[0];
            const currentToken = useAuthStore.getState().token || '';
            
            // Optimistically set activeWorkspace
            setActiveWorkspace({ ...ws, role: defaultRole }, currentToken);

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
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>

                {/* Header */}
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
                                {activeWorkspace?.tenantName || 'Resido'}
                            </Text>
                            <Text style={styles.psBrandTaglineText}>
                                {activeWorkspace?.role?.replace(/_/g, ' ') || 'MAINTENANCE STAFF'}
                            </Text>
                        </View>
                    </View>

                </View>

                {/* Workspace Switcher Bubbles */}
                <View style={styles.psWorkspaceSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.psWorkspaceScroll}>
                        <WorkspaceBubble
                            label="My Space"
                            isActive={!activeWorkspace}
                            onPress={() => setActiveWorkspace(null as any, '')}
                            imageUri={user?.profilePhoto}
                            initial={user?.name}
                            cacheBust={imageTimestamp}
                        />
                        {workspaces?.map((ws: any) => (
                            <WorkspaceBubble
                                key={ws.tenantId}
                                label={ws.tenantName}
                                isActive={activeWorkspace?.tenantId === ws.tenantId}
                                onPress={() => handleSwitch(ws)}
                                imageUri={ws.photoUrl}
                                fallbackSource={require('../../../assets/greenwoods_logo.jpg')}
                                cacheBust={imageTimestamp}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* Role Switcher Pills */}
                {activeWorkspace && (activeWorkspace.roles?.length ?? 0) > 1 && (
                    <View style={styles.roleSwitcherRow}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                            {activeWorkspace.roles.map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    onPress={() => handleSwitchRole(r)}
                                    style={[styles.rolePill, activeWorkspace.role === r && styles.rolePillActive]}
                                    disabled={switchingRole}
                                >
                                    <Text style={[styles.rolePillText, activeWorkspace.role === r && styles.rolePillTextActive]}>
                                        {r.replace(/_/g, ' ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Quick Icon Grid */}
                <View style={styles.gridContainer}>
                    <DashboardIcon icon="construct" label="Requests & Complaints" color="#fff" bg="#ea580c" onPress={() => router.push('/admin-complaints')} />
                    <DashboardIcon icon="clipboard" label="Task Log" color="#fff" bg="#2563eb" />
                    <DashboardIcon icon="call" label="Contact Admin" color="#fff" bg="#059669" onPress={() => router.push('/staff-contacts')} />
                    <DashboardIcon icon="finger-print" label="Attendance" color="#fff" bg="#a855f7" onPress={() => router.push('/staff-attendance')} />
                    <DashboardIcon icon="notifications" label="Reminders" color="#fff" bg="#6366f1" onPress={() => router.push('/my-reminders')} />
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <StatBox count="–" label="Pending" icon="time-outline" />
                    <StatBox count="–" label="In Progress" icon="construct-outline" />
                    <StatBox count="–" label="Done Today" icon="checkmark-circle-outline" />
                    <StatBox count="–" label="High Priority" icon="warning-outline" highlight />
                </View>

                {/* Restricted Banner */}
                <View style={styles.restrictedBanner}>
                    <View style={styles.lockIconBox}>
                        <Ionicons name="lock-closed" size={18} color="#fff" />
                    </View>
                    <Text style={styles.restrictedText}>
                        Community features like Chat and Finance are restricted for staff roles.
                    </Text>
                </View>

                {/* Daily Operations */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Maintenance Tools</Text>
                    <View style={styles.featureGrid}>
                        <FeatureCard icon="construct" title="Requests & Complaints" color="#fff" bg="#ea580c" onPress={() => router.push('/admin-complaints')} />
                        <FeatureCard icon="clipboard" title="Task Log" color="#fff" bg="#2563eb" />
                        <FeatureCard icon="call" title="Contact Admin" color="#fff" bg="#059669" onPress={() => router.push('/staff-contacts')} />
                        <FeatureCard icon="calendar" title="Events" color="#fff" bg="#1d4ed8" onPress={() => router.push('/events')} />
                        <FeatureCard icon="megaphone" title="Notice Board" color="#fff" bg="#f59e0b" onPress={() => router.push('/notices')} />
                        <FeatureCard icon="book" title="Rules & Regulations" color="#fff" bg="#475569" onPress={() => router.push('/rules')} />
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
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

function StatBox({ count, label, icon, highlight }: any) {
    return (
        <View style={styles.statBox}>
            <Ionicons
                name={icon as any}
                size={20}
                color={highlight ? '#f59e0b' : '#fff'}
                style={{ marginBottom: 4, opacity: highlight ? 1 : 0.7 }}
            />
            <Text style={[styles.statBoxCount, highlight && { color: '#f59e0b' }]}>{count}</Text>
            <Text style={styles.statBoxLabel}>{label}</Text>
        </View>
    );
}

function FeatureCard({ icon, title, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={[styles.featureCard, { backgroundColor: bg }]} onPress={onPress}>
            <View style={styles.fCardHeader}>
                <Ionicons name={icon as any} size={24} color={color} />
            </View>
            <Text style={styles.fCardTitle}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    content: { paddingBottom: 110 },

    // Header
    psHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    psBrandInfo: { flexDirection: 'row', alignItems: 'center' },
    psLogoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    psWorkspaceImg: { width: '100%', height: '100%', borderRadius: 12 },
    psBrandTitleText: { fontSize: 24, fontWeight: '900', color: '#2D2445' },
    psBrandTaglineText: { fontSize: 10, color: '#94a3b8', fontWeight: '800', letterSpacing: 1 },
    psHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    psIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    profileBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    profileImg: { width: '100%', height: '100%' },

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

    // Quick Icon Grid
    gridContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 25 },
    dbIconItem: { width: '18%', alignItems: 'center' },
    dbIconBox: { width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    dbIconLabel: { color: '#2D2445', fontSize: 9, fontWeight: '800', textAlign: 'center' },

    // Stats Row
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 30, backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statBox: { alignItems: 'center', flex: 1 },
    statBoxCount: { fontSize: 16, fontWeight: '900', color: '#2D2445' },
    statBoxLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700', marginTop: 2 },

    // Restricted Banner
    restrictedBanner: { marginHorizontal: 20, backgroundColor: 'rgba(234, 88, 12, 0.08)', padding: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(234, 88, 12, 0.2)' },
    lockIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#ea580c', alignItems: 'center', justifyContent: 'center' },
    restrictedText: { flex: 1, fontSize: 11, color: '#94a3b8', fontWeight: '600', lineHeight: 16 },

    // Feature Cards
    sectionContainer: { paddingHorizontal: 20, marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#2D2445', marginBottom: 15 },
    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    featureCard: { width: '48%', height: 100, borderRadius: 20, padding: 15, justifyContent: 'space-between' },
    fCardHeader: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
    fCardTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },

    // Role Switcher
    roleSwitcherRow: { marginBottom: 15 },
    rolePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    rolePillActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
    rolePillText: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
    rolePillTextActive: { color: '#fff' },
});
