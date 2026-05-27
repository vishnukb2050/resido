import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WorkspaceBubble } from '../WorkspaceBubble';
import { getThemeColors } from '../../utils/theme';
import { useProfileRefresh } from '../../hooks/useProfileRefresh';

export default function CleaningDashboard() {
    const { activeWorkspace, user, setActiveWorkspace, workspaces, switchRole } = useAuthStore();
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
                                {activeWorkspace?.tenantName || "Resido Cleaning"}
                            </Text>
                            <Text style={styles.psBrandTaglineText}>
                                {activeWorkspace?.role || "CLEANING STAFF"}
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

                {/* Task Grid (Matching Image) */}
                <View style={styles.gridContainer}>
                    <DashboardIcon icon="clipboard" label="Register" color="#fff" bg="rgba(37, 99, 235, 0.2)" />
                    <DashboardIcon icon="construct" label="Requests & Complaints" color="#fff" bg="rgba(239, 68, 68, 0.2)" onPress={() => router.push('/admin-complaints')} />
                    <DashboardIcon icon="camera" label="Photos" color="#fff" bg="rgba(16, 185, 129, 0.2)" />
                    <DashboardIcon icon="warning" label="Report" color="#fff" bg="rgba(245, 158, 11, 0.2)" />
                    <DashboardIcon icon="help-buoy" label="Support" color="#fff" bg="rgba(59, 130, 246, 0.2)" />
                    <DashboardIcon icon="finger-print" label="Attendance" color="#fff" bg="rgba(168, 85, 247, 0.2)" onPress={() => router.push('/staff-attendance')} />
                    <DashboardIcon icon="notifications" label="Reminders" color="#fff" bg="rgba(99, 102, 241, 0.2)" onPress={() => router.push('/my-reminders')} />
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

                {/* Cleaning Sections */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Daily Tasks</Text>
                    <View style={styles.featureGrid}>
                        <FeatureCard icon="water" title="Floor Cleaning" color="#fff" bg="#3182ce" />
                        <FeatureCard icon="trash" title="Waste Mgmt" color="#fff" bg="#38a169" />
                        <FeatureCard icon="leaf" title="Garden Care" color="#fff" bg="#2c5282" />
                        <FeatureCard icon="construct" title="Equip Check" color="#fff" bg="#744210" />
                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>All Tools</Text>
                    <View style={styles.featureGrid}>
                        <FeatureCard icon="scan" title="Scanner" color="#fff" bg="#4a5568" />
                        <FeatureCard icon="document-text" title="Manuals" color="#fff" bg="#2d3748" />
                        <FeatureCard icon="chatbubble-ellipses" title="Staff Chat" color="#fff" bg="#1a365d" />
                        <FeatureCard icon="settings" title="Profile" color="#fff" bg="#2d3748" />
                        <FeatureCard icon="megaphone" title="Notice Board" color="#fff" bg="#f59e0b" onPress={() => router.push('/notices')} />
                        <FeatureCard icon="book" title="Rules & Regulations" color="#fff" bg="#475569" onPress={() => router.push('/rules')} />
                        <FeatureCard icon="calendar" title="Events" color="#fff" bg="#3b82f6" onPress={() => router.push('/events')} />
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
    safeArea: { flex: 1, backgroundColor: '#F8F5FF' },
    container: { flex: 1 },
    content: { paddingBottom: 110 },
    
    psHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    psBrandInfo: { flexDirection: 'row', alignItems: 'center' },
    psLogoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFE9F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C4B5DC' },
    psWorkspaceImg: { width: '100%', height: '100%', borderRadius: 12 },
    psBrandTitleText: { fontSize: 24, fontWeight: '900', color: '#2D2445' },
    psBrandTaglineText: { fontSize: 10, color: '#9A8EBA', fontWeight: '800', letterSpacing: 1 },
    
    psHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    psIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFE9F8', alignItems: 'center', justifyContent: 'center' },
    profileBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#C4B5DC' },
    profileImg: { width: '100%', height: '100%' },

    psWorkspaceSection: { marginBottom: 20 },
    psWorkspaceScroll: { paddingHorizontal: 20, gap: 15 },
    wsBubble: { alignItems: 'center', width: 70 },
    wsBubbleActive: { width: 85 },
    wsBubbleImgBox: { width: 60, height: 60, borderRadius: 30, padding: 2, backgroundColor: '#F4EEFC', borderWidth: 2, borderColor: 'transparent' },
    wsBubbleImgBoxActive: { width: 75, height: 75, borderRadius: 37.5, borderColor: '#fff' },
    wsBubbleImg: { width: '100%', height: '100%', borderRadius: 40 },
    wsBubbleLabel: { color: '#9A8EBA', fontSize: 10, fontWeight: '800', marginTop: 8 },
    wsBubbleLabelActive: { color: '#2D2445', fontSize: 11, fontWeight: '900' },

    gridContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 25 },
    dbIconItem: { width: '18%', alignItems: 'center' },
    dbIconBox: { width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#C4B5DC' },
    dbIconLabel: { color: '#2D2445', fontSize: 9, fontWeight: '800', textAlign: 'center' },

    restrictedBanner: { marginHorizontal: 20, backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(37, 99, 235, 0.2)' },
    lockIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
    restrictedText: { flex: 1, fontSize: 11, color: '#9A8EBA', fontWeight: '600', lineHeight: 16 },

    sectionContainer: { paddingHorizontal: 20, marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#2D2445', marginBottom: 15 },
    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    featureCard: { width: '48%', height: 100, borderRadius: 20, padding: 15, justifyContent: 'space-between' },
    fCardHeader: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
    fCardTitle: { color: '#2D2445', fontSize: 13, fontWeight: '800' },

    // Role Switcher
    roleSwitcherRow: { marginBottom: 15 },
    rolePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#EFE9F8', borderWidth: 1, borderColor: '#C4B5DC' },
    rolePillActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
    rolePillText: { fontSize: 11, fontWeight: '700', color: '#9A8EBA', textTransform: 'uppercase', letterSpacing: 0.5 },
    rolePillTextActive: { color: '#2D2445' },
});
