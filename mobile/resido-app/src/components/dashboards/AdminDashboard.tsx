import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Image, TextInput } from 'react-native';
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
        <View style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Premium Header */}
                <View style={styles.psHeader}>
                    <View style={styles.psBrandInfo}>
                        <View style={styles.psLogoBox}>
                            <Image source={require('../../../assets/icon.png')} style={styles.psWorkspaceImg} />
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
                    <View style={styles.psHeaderActions}>
                        <TouchableOpacity style={styles.psIconBtn}>
                            <Ionicons name="notifications" size={22} color="#fff" />
                            <View style={styles.psNotifBadge}>
                                <Text style={styles.psNotifCount}>5</Text>
                            </View>
                        </TouchableOpacity>
                        <Image 
                            source={{ uri: user?.profilePhoto || 'https://i.pravatar.cc/150?u=admin' }} 
                            style={styles.adminAvatar} 
                        />
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
                                image="https://cdn-icons-png.flaticon.com/512/9374/9374944.png"
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* Search Bar */}
                <View style={styles.psSearchSection}>
                    <View style={styles.psSearchBar}>
                        <Ionicons name="search" size={20} color="#94a3b8" />
                        <TextInput 
                            placeholder="Search management tools..." 
                            style={styles.psSearchInput}
                            placeholderTextColor="#64748b"
                        />
                    </View>
                </View>

                {/* Admin Grid (Matching Image) */}
                <View style={styles.adminGrid}>
                    <DashboardIcon icon="stats-chart" label="Stats" color="#fff" bg="rgba(99, 102, 241, 0.2)" />
                    <DashboardIcon icon="people-circle" label="Manage" color="#fff" bg="rgba(59, 130, 246, 0.2)" onPress={() => router.push('/manage-members')} />
                    <DashboardIcon icon="construct" label="Requests" color="#fff" bg="rgba(239, 68, 68, 0.2)" onPress={() => router.push('/admin-complaints')} />
                    <DashboardIcon icon="shield-half" label="Security" color="#fff" bg="rgba(16, 185, 129, 0.2)" onPress={() => router.push('/staff')} />
                    <DashboardIcon icon="water" label="Cleaning" color="#fff" bg="rgba(14, 165, 233, 0.2)" onPress={() => router.push('/staff')} />
                    <DashboardIcon icon="book" label="Rules" color="#fff" bg="rgba(245, 158, 11, 0.2)" onPress={() => router.push('/rules')} />
                </View>

                {/* Management Sections */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>People Management</Text>
                    <View style={styles.featureGrid}>
                        <FeatureCard icon="person-add" title="Add Resident" color="#fff" bg="#3182ce" onPress={() => router.push({ pathname: '/create-member', params: { mode: 'RESIDENT' } })} />
                        <FeatureCard icon="people-circle" title="Add Staff" color="#fff" bg="#10b981" onPress={() => router.push({ pathname: '/create-member', params: { mode: 'STAFF' } })} />
                        <FeatureCard icon="shield-checkmark" title="Duty Roster" color="#fff" bg="#6366f1" />
                        <FeatureCard icon="document-text" title="Staff Docs" color="#fff" bg="#8b5cf6" onPress={() => router.push('/documents')} />
                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Community Tools</Text>
                    <View style={styles.featureGrid}>
                        <FeatureCard icon="id-card" title="Visitor Reg" color="#fff" bg="#3b82f6" onPress={() => router.push('/visitor-register')} />
                        <FeatureCard icon="chatbubbles" title="Resident Chat" color="#fff" bg="#4a5568" onPress={() => router.push('/chat-list')} />
                        <FeatureCard icon="folder" title="Docs & Legal" color="#fff" bg="#2d3748" onPress={() => router.push('/documents')} />
                        <FeatureCard icon="newspaper" title="Feed Mgmt" color="#fff" bg="#1a365d" onPress={() => router.push('/thread')} />
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
    
    // Premium Header
    psHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    psBrandInfo: { flexDirection: 'row', alignItems: 'center' },
    psLogoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    psWorkspaceImg: { width: '100%', height: '100%', borderRadius: 12 },
    psBrandTitleText: { fontSize: 24, fontWeight: '900', color: '#fff' },
    psBrandTaglineText: { fontSize: 10, color: '#94a3b8', fontWeight: '800', letterSpacing: 1 },
    
    psHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    psIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    psNotifBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#ef4444', minWidth: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#0f172a' },
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
    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    featureCard: { width: '48%', height: 100, borderRadius: 20, padding: 15, justifyContent: 'space-between' },
    fCardHeader: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
    fCardTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
