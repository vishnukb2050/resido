import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getThemeColors } from '../../utils/theme';

export default function CleaningDashboard() {
    const { activeWorkspace, user, setActiveWorkspace, workspaces } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);
    const router = useRouter();

    const handleSwitch = async (ws: any) => {
        try {
            const res = await authApi.switchWorkspace(ws.tenantId);
            setActiveWorkspace(res.data.workspace, res.data.accessToken);
        } catch (e) {
            console.error('Switch failed', e);
        }
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
                {/* Premium Header */}
                <View style={[styles.psHeader, { backgroundColor: theme.background }]}>
                    <View style={styles.psBrandInfo}>
                        <View style={styles.psLogoBox}>
                            <Image source={require('../../../assets/icon.png')} style={styles.psWorkspaceImg} />
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
                    <View style={styles.psHeaderActions}>
                        <TouchableOpacity style={styles.psIconBtn}>
                            <Ionicons name="notifications" size={22} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.profileBtn}>
                            <Image 
                                source={{ uri: user?.profilePhoto || 'https://i.pravatar.cc/150?u=cleaning' }} 
                                style={styles.profileImg} 
                            />
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
                        {workspaces?.map((ws: any) => (
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

                {/* Task Grid (Matching Image) */}
                <View style={styles.gridContainer}>
                    <DashboardIcon icon="clipboard" label="Register" color="#fff" bg="rgba(99, 102, 241, 0.2)" />
                    <DashboardIcon icon="construct" label="My Tasks" color="#fff" bg="rgba(239, 68, 68, 0.2)" onPress={() => router.push('/admin-complaints')} />
                    <DashboardIcon icon="camera" label="Photos" color="#fff" bg="rgba(16, 185, 129, 0.2)" />
                    <DashboardIcon icon="warning" label="Report" color="#fff" bg="rgba(245, 158, 11, 0.2)" />
                    <DashboardIcon icon="help-buoy" label="Support" color="#fff" bg="rgba(59, 130, 246, 0.2)" />
                </View>

                {/* Restricted Access Banner */}
                <View style={styles.restrictedBanner}>
                    <View style={styles.lockIconBox}>
                        <Ionicons name="lock-closed" size={18} color="#fff" />
                    </View>
                    <Text style={styles.restrictedText}>
                        Community features like Notices, Chat, and Gallery are restricted for staff roles.
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
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

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
    safeArea: { flex: 1, backgroundColor: '#0f172a' },
    container: { flex: 1 },
    content: { paddingBottom: 110 },
    
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

    psWorkspaceSection: { marginBottom: 20 },
    psWorkspaceScroll: { paddingHorizontal: 20, gap: 15 },
    wsBubble: { alignItems: 'center', width: 70 },
    wsBubbleActive: { width: 85 },
    wsBubbleImgBox: { width: 60, height: 60, borderRadius: 30, padding: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'transparent' },
    wsBubbleImgBoxActive: { width: 75, height: 75, borderRadius: 37.5, borderColor: '#fff' },
    wsBubbleImg: { width: '100%', height: '100%', borderRadius: 40 },
    wsBubbleLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', marginTop: 8 },
    wsBubbleLabelActive: { color: '#fff', fontSize: 11, fontWeight: '900' },

    gridContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 25 },
    dbIconItem: { width: '18%', alignItems: 'center' },
    dbIconBox: { width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    dbIconLabel: { color: '#fff', fontSize: 9, fontWeight: '800', textAlign: 'center' },

    restrictedBanner: { marginHorizontal: 20, backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
    lockIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#4c1d95', alignItems: 'center', justifyContent: 'center' },
    restrictedText: { flex: 1, fontSize: 11, color: '#94a3b8', fontWeight: '600', lineHeight: 16 },

    sectionContainer: { paddingHorizontal: 20, marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 15 },
    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    featureCard: { width: '48%', height: 100, borderRadius: 20, padding: 15, justifyContent: 'space-between' },
    fCardHeader: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
    fCardTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
