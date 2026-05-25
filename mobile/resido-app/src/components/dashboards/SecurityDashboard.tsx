import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { authApi, visitorApi, communityApi } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getThemeColors } from '../../utils/theme';

export default function SecurityDashboard() {
    const { activeWorkspace, user, workspaces, setActiveWorkspace, switchRole } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);
    const router = useRouter();
    const [switchingRole, setSwitchingRole] = React.useState(false);

    // Live stats state
    const [stats, setStats] = React.useState({ entries: 0, deliveries: 0, cabs: 0, alerts: 0 });
    const [statsLoading, setStatsLoading] = React.useState(true);

    React.useEffect(() => {
        fetchTodayStats();
    }, []);

    const fetchTodayStats = async () => {
        try {
            setStatsLoading(true);
            const today = new Date();
            const start = new Date(today);
            start.setHours(0, 0, 0, 0);
            const end = new Date(today);
            end.setHours(23, 59, 59, 999);

            const { data: entries } = await visitorApi.getEntries({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            });

            const list: any[] = entries || [];
            const deliveryCount = list.filter((e: any) => e.category === 'Delivery').length;
            const cabCount = list.filter((e: any) =>
                e.category === 'Cab' || (e.vehicleNumber && e.category === 'Visitor')
            ).length;

            // Alerts: pending gatepasses not yet approved
            let alertCount = 0;
            try {
                const { data: gatepasses } = await communityApi.getVisitors('');
                alertCount = (gatepasses || []).filter((g: any) => g.status === 'PENDING').length;
            } catch (_) {}

            setStats({
                entries: list.length,
                deliveries: deliveryCount,
                cabs: cabCount,
                alerts: alertCount,
            });
        } catch (e) {
            console.error('Failed to fetch security stats:', e);
        } finally {
            setStatsLoading(false);
        }
    };

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
                                {activeWorkspace?.tenantName || 'Resido Security'}
                            </Text>
                            <Text style={styles.psBrandTaglineText}>
                                {activeWorkspace?.role || 'SECURITY STAFF'}
                            </Text>
                        </View>
                    </View>

                </View>

                {/* Workspace Switcher */}
                <View style={styles.psWorkspaceSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.psWorkspaceScroll}>
                        <WorkspaceBubble
                            label="My Space"
                            isActive={!activeWorkspace}
                            onPress={() => setActiveWorkspace(null as any, '')}
                            image={user?.profilePhoto || 'https://i.pravatar.cc/100?u=resido'}
                        />
                        {workspaces?.map((ws: any) => (
                            <WorkspaceBubble
                                key={ws.tenantId}
                                label={ws.tenantName}
                                isActive={activeWorkspace?.tenantId === ws.tenantId}
                                onPress={() => handleSwitch(ws)}
                                image={ws.photoUrl || 'https://cdn-icons-png.flaticon.com/512/9374/9374944.png'}
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
                    <DashboardIcon icon="scan-circle" label="Scanner" color="#fff" bg="#1d4ed8" onPress={() => router.push('/gatepass-scanner')} />
                    <DashboardIcon icon="person-add" label="Add Visitor" color="#fff" bg="#10b981" onPress={() => router.push('/add-visitor')} />
                    <DashboardIcon icon="id-card" label="Visitor Register" color="#fff" bg="#3b82f6" onPress={() => router.push('/visitor-register')} />
                    <DashboardIcon icon="car" label="Vehicle Log" color="#fff" bg="#f59e0b" onPress={() => router.push('/vehicle-log')} />
                    <DashboardIcon icon="construct" label="Requests & Complaints" color="#fff" bg="#ea580c" onPress={() => router.push('/admin-complaints')} />
                </View>

                {/* Live Security Stats Row */}
                <View style={styles.statsRow}>
                    <StatBox count={statsLoading ? '–' : String(stats.entries)} label="Entries" icon="walk" />
                    <StatBox count={statsLoading ? '–' : String(stats.deliveries)} label="Deliveries" icon="bicycle" />
                    <StatBox count={statsLoading ? '–' : String(stats.cabs)} label="Cabs" icon="car" />
                    <StatBox count={statsLoading ? '–' : String(stats.alerts)} label="Alerts" icon="warning" highlight={stats.alerts > 0} />
                </View>

                {/* Restricted Access Banner */}
                <View style={styles.restrictedBanner}>
                    <View style={styles.lockIconBox}>
                        <Ionicons name="lock-closed" size={18} color="#fff" />
                    </View>
                    <Text style={styles.restrictedText}>
                        Community features like Chat and Gallery are restricted for staff roles.
                    </Text>
                </View>

                {/* Daily Operations */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Daily Operations</Text>
                    <View style={styles.featureGrid}>
                        <FeatureCard icon="car-sport" title="Vehicle Logs" color="#fff" bg="#2c5282" onPress={() => router.push('/vehicle-log')} />
                        <FeatureCard icon="scan-circle" title="Gate Scanner" color="#fff" bg="#1d4ed8" onPress={() => router.push('/gatepass-scanner')} />
                        <FeatureCard icon="log-in" title="Gatepass" color="#fff" bg="#f59e0b" onPress={() => router.push('/gatepass')} />
                        <FeatureCard icon="id-card" title="Visitor Register" color="#fff" bg="#10b981" onPress={() => router.push('/visitor-register')} />
                        <FeatureCard icon="construct" title="Requests & Complaints" color="#fff" bg="#ea580c" onPress={() => router.push('/admin-complaints')} />
                        <FeatureCard icon="megaphone" title="Notices" color="#fff" bg="#f59e0b" onPress={() => router.push('/notices')} />
                        <FeatureCard icon="book" title="Rules" color="#fff" bg="#475569" onPress={() => router.push('/rules')} />
                        <FeatureCard icon="calendar" title="Events" color="#fff" bg="#3b82f6" onPress={() => router.push('/events')} />
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// Sub-components
function WorkspaceBubble({ label, isActive, onPress, image }: any) {
    return (
        <TouchableOpacity style={[styles.wsBubble, isActive && styles.wsBubbleActive]} onPress={onPress}>
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

function StatBox({ count, label, icon, highlight }: any) {
    return (
        <View style={styles.statBox}>
            <Ionicons
                name={icon as any}
                size={20}
                color={highlight ? '#ef4444' : '#fff'}
                style={{ marginBottom: 4, opacity: highlight ? 1 : 0.7 }}
            />
            <Text style={[styles.statBoxCount, highlight && { color: '#ef4444' }]}>{count}</Text>
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
    psBrandTitleText: { fontSize: 24, fontWeight: '900', color: '#fff' },
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

    // Grid Icons
    gridContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 25 },
    dbIconItem: { width: '18%', alignItems: 'center' },
    dbIconBox: { width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    dbIconLabel: { color: '#fff', fontSize: 9, fontWeight: '800', textAlign: 'center' },

    // Stats
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 30, backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statBox: { alignItems: 'center', flex: 1 },
    statBoxCount: { fontSize: 16, fontWeight: '900', color: '#fff' },
    statBoxLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700', marginTop: 2 },

    // Restricted Banner
    restrictedBanner: { marginHorizontal: 20, backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(37, 99, 235, 0.2)' },
    lockIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
    restrictedText: { flex: 1, fontSize: 11, color: '#94a3b8', fontWeight: '600', lineHeight: 16 },

    // Feature Cards
    sectionContainer: { paddingHorizontal: 20, marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 15 },
    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    featureCard: { width: '48%', height: 100, borderRadius: 20, padding: 15, justifyContent: 'space-between' },
    fCardHeader: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
    fCardTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },

    // Role Switcher
    roleSwitcherRow: { marginBottom: 15 },
    rolePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    rolePillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    rolePillText: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
    rolePillTextActive: { color: '#fff' },
});
