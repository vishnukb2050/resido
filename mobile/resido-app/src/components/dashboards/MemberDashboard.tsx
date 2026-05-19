import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, Dimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, Workspace } from '../../store/authStore';
import { authApi } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../BottomNav';
import { getThemeColors } from '../../utils/theme';

const { width } = Dimensions.get('window');

export default function MemberDashboard() {
    const router = useRouter();
    const { user, workspaces, activeWorkspace, setActiveWorkspace } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);

    const handleSwitch = async (ws: Workspace) => {
        try {
            const res = await authApi.switchWorkspace(ws.tenantId);
            setActiveWorkspace(res.data.workspace, res.data.accessToken);
        } catch (e) {
            console.error('Switch failed', e);
        }
    };

    return (
        <View style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Premium Header */}
                <View style={[styles.psHeader, { backgroundColor: theme.background }]}>
                    <View style={styles.psBrandInfo}>
                        <View style={styles.psLogoBox}>
                            <Image source={require('../../../assets/icon.png')} style={styles.psWorkspaceImg} />
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
                    <View style={styles.psHeaderActions}>
                        <TouchableOpacity style={styles.psIconBtn}>
                            <Ionicons name="notifications" size={22} color="#fff" />
                        </TouchableOpacity>
                        <Image 
                            source={{ uri: user?.profilePhoto || 'https://i.pravatar.cc/150?u=member' }} 
                            style={styles.adminAvatar} 
                        />
                    </View>
                </View>

                {/* Workspace Switcher (Bubbles) */}
                <View style={styles.psWorkspaceSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.psWorkspaceScroll}>
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
                                image="https://cdn-icons-png.flaticon.com/512/9374/9374944.png"
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* Member Feature Grid (As Requested) */}
                <View style={styles.gridContainer}>
                    <DashboardIcon icon="megaphone" label="Notices" color="#fff" bg="#f59e0b" onPress={() => router.push('/notices')} />
                    <DashboardIcon icon="chatbubbles" label="Chats" color="#fff" bg="#4c1d95" onPress={() => router.push('/chat-list')} />
                    <DashboardIcon icon="notifications-circle" label="Announce" color="#fff" bg="#10b981" onPress={() => router.push('/thread')} />
                    <DashboardIcon icon="document-text" label="Notes" color="#fff" bg="#8b5cf6" onPress={() => router.push('/notes')} />
                    <DashboardIcon icon="folder" label="Documents" color="#fff" bg="#3b82f6" onPress={() => router.push('/documents')} />
                    <DashboardIcon icon="call" label="Contacts" color="#fff" bg="#10b981" onPress={() => router.push('/staff-contacts')} />
                    <DashboardIcon icon="construct" label="Requests" color="#fff" bg="#ef4444" onPress={() => router.push('/complaints')} />
                    <DashboardIcon icon="book" label="Rules" color="#fff" bg="#475569" onPress={() => router.push('/rules')} />
                    <DashboardIcon icon="cash" label="Payments" color="#fff" bg="#ec4899" onPress={() => router.push('/resident-payments')} />
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
        </View>
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
                <Ionicons name={icon as any} size={26} color={color} />
            </View>
            <Text style={styles.dbIconLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function RuleItem({ icon, label }: any) {
    return (
        <View style={styles.ruleItem}>
            <Ionicons name={icon as any} size={18} color="#4c1d95" />
            <Text style={styles.ruleText}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    content: { paddingBottom: 110 },
    psHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    psBrandInfo: { flexDirection: 'row', alignItems: 'center' },
    psLogoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    psWorkspaceImg: { width: '100%', height: '100%', borderRadius: 12 },
    psBrandTitleText: { fontSize: 22, fontWeight: '900', color: '#fff' },
    psBrandTaglineText: { fontSize: 10, color: '#4c1d95', fontWeight: '800', letterSpacing: 1 },
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
    wsBubbleLabelActive: { color: '#fff', fontSize: 11, fontWeight: '900' },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', paddingHorizontal: 15, marginBottom: 25, gap: 12 },
    dbIconItem: { width: '30%', alignItems: 'center', marginBottom: 15 },
    dbIconBox: { width: 65, height: 65, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    dbIconLabel: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
    sectionContainer: { paddingHorizontal: 20, marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 15 },
    announcementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    annIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(245, 158, 11, 0.1)', alignItems: 'center', justifyContent: 'center' },
    annTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
    annSub: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    rulesGrid: { backgroundColor: 'rgba(99, 102, 241, 0.05)', borderRadius: 22, padding: 20, gap: 12, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.1)' },
    ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    ruleText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' }
});
