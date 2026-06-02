import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore, Workspace } from '../../store/authStore';
import { authApi } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../BottomNav';
import { WorkspaceBubble } from '../WorkspaceBubble';
import { getThemeColors } from '../../utils/theme';
import { useProfileRefresh } from '../../hooks/useProfileRefresh';

const { width } = Dimensions.get('window');

export default function MemberDashboard() {
    const router = useRouter();
    const { user, workspaces, activeWorkspace, setActiveWorkspace } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);
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
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
            <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                                {activeWorkspace?.tenantName || "Community Member"}
                            </Text>
                            <Text style={styles.psBrandTaglineText}>
                                OFFICIAL MEMBER
                            </Text>
                        </View>
                    </View>

                </View>

                {/* Workspace Switcher (Bubbles) */}
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
                        {workspaces.map((ws: any) => (
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

                {/* Role Switcher — shown only when active workspace has multiple roles */}
                {activeWorkspace && (activeWorkspace.roles?.length ?? 0) > 1 && (
                    <View style={styles.roleSwitcherRow}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                            {activeWorkspace.roles.map((r) => (
                                <TouchableOpacity
                                    key={r}
                                    onPress={() => handleSwitchRole(r)}
                                    style={[
                                        styles.rolePill,
                                        activeWorkspace.role === r && [styles.rolePillActive, { backgroundColor: theme.primary, borderColor: theme.primary }]
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

                {/* Member Feature Grid (As Requested) */}
                <View style={styles.gridContainer}>
                    <DashboardIcon icon="megaphone" label="Notice Board" color="#fff" bg="#f59e0b" onPress={() => router.push('/notices')} />
                    <DashboardIcon icon="notifications" label="Reminders" color="#fff" bg="#6366f1" onPress={() => router.push('/my-reminders')} />
                    <DashboardIcon icon="chatbubbles" label="Chats" color="#fff" bg="#1d4ed8" onPress={() => router.push('/chat-list')} />
                    <DashboardIcon icon="document-text" label="Notes" color="#fff" bg="#3b82f6" onPress={() => router.push('/notes')} />
                    <DashboardIcon icon="folder" label="Documents" color="#fff" bg="#3b82f6" onPress={() => router.push('/documents')} />
                    <DashboardIcon icon="call" label="Contacts" color="#fff" bg="#10b981" onPress={() => router.push('/staff-contacts')} />
                    <DashboardIcon icon="construct" label="Requests & Complaints" color="#fff" bg="#ef4444" onPress={() => router.push('/complaints')} />
                    <DashboardIcon icon="book" label="Rules & Regulations" color="#fff" bg="#475569" onPress={() => router.push('/rules')} />
                    <DashboardIcon icon="calendar" label="Events" color="#fff" bg="#3b82f6" onPress={() => router.push('/events')} />
                    <DashboardIcon icon="cash" label="Community Payments" color="#fff" bg="#ec4899" onPress={() => router.push('/resident-payments')} />
                </View>

                {/* Community Highlights */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Community Announcements</Text>
                    <TouchableOpacity style={styles.announcementCard}>
                        <View style={styles.annIconBox}><Ionicons name="alert-circle" size={24} color="#f59e0b" /></View>
                        <View style={{ flex: 1, marginLeft: 15 }}>
                            <Text style={styles.annTitle}>Water Supply Notice</Text>
                            <Text style={styles.annSub}>Maintenance scheduled for tomorrow 2PM - 4PM</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* Rules Quick View */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Quick Rules</Text>
                    <View style={styles.rulesGrid}>
                        <RuleItem icon="volume-mute" label="No Noise after 10PM" />
                        <RuleItem icon="car" label="Parking in allotted slots only" />
                        <RuleItem icon="leaf" label="Keep common areas clean" />
                    </View>
                </View>

            </ScrollView>
            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

function DashboardIcon({ icon, label, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.dbIconItem} onPress={onPress}>
            <View style={[styles.dbIconBox, { backgroundColor: bg }]}>
                <Ionicons name={icon as any} size={26} color={color} />
            </View>
            <Text style={styles.dbIconLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function RuleItem({ icon, label }: any) {
    return (
        <View style={styles.ruleItem}>
            <Ionicons name={icon as any} size={18} color="#1d4ed8" />
            <Text style={styles.ruleText}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    content: { paddingBottom: 110 },
    psHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
    psBrandInfo: { flexDirection: 'row', alignItems: 'center' },
    psLogoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    psWorkspaceImg: { width: '100%', height: '100%', borderRadius: 12 },
    psBrandTitleText: { fontSize: 22, fontWeight: '900', color: '#2D2445' },
    psBrandTaglineText: { fontSize: 10, color: '#1d4ed8', fontWeight: '800', letterSpacing: 1 },
    psHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    psIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    adminAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    psWorkspaceSection: { marginBottom: 25 },
    psWorkspaceScroll: { paddingHorizontal: 20, gap: 15 },
    wsBubble: { alignItems: 'center', width: 70 },
    wsBubbleActive: { width: 85 },
    wsBubbleImgBox: { width: 60, height: 60, borderRadius: 30, padding: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'transparent' },
    wsBubbleImgBoxActive: { width: 75, height: 75, borderRadius: 37.5, borderColor: '#fff' },
    wsBubbleImg: { width: '100%', height: '100%', borderRadius: 40 },
    wsBubbleLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', marginTop: 8 },
    wsBubbleLabelActive: { color: '#2D2445', fontSize: 11, fontWeight: '900' },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', paddingHorizontal: 15, marginBottom: 25, gap: 12 },
    dbIconItem: { width: '30%', alignItems: 'center', marginBottom: 15 },
    dbIconBox: { width: 65, height: 65, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    dbIconLabel: { color: '#2D2445', fontSize: 11, fontWeight: '700', textAlign: 'center' },
    sectionContainer: { paddingHorizontal: 20, marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#2D2445', marginBottom: 15 },
    announcementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    annIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(245, 158, 11, 0.1)', alignItems: 'center', justifyContent: 'center' },
    annTitle: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    annSub: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    rulesGrid: { backgroundColor: 'rgba(37, 99, 235, 0.05)', borderRadius: 22, padding: 20, gap: 12, borderWidth: 1, borderColor: 'rgba(37, 99, 235, 0.1)' },
    ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    ruleText: { color: '#64748b', fontSize: 13, fontWeight: '600' },

    // Role Switcher
    roleSwitcherRow: { marginBottom: 20 },
    rolePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    rolePillActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    rolePillText: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
    rolePillTextActive: { color: '#2D2445' }
});
