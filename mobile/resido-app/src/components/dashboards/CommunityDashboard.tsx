import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, Dimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../BottomNav';
import { getThemeColors } from '../../utils/theme';

const { width } = Dimensions.get('window');

export default function CommunityDashboard() {
    const router = useRouter();
    const { user, activeWorkspace, setActiveWorkspace } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);

    const role = activeWorkspace?.role || 'RESIDENT';
    const isAdmin = ['APARTMENT_ADMIN', 'ADMIN_STAFF'].includes(role);

    const handleSwitchBack = () => {
        // @ts-ignore
        setActiveWorkspace(null, null);
        router.push('/');
    };

    const getFeaturesByRole = () => {
        const ALL_FEATURES = [
            { id: 'notices', title: 'Noticeboard', icon: 'megaphone-outline', color: '#10b981', route: '/notices' },
            { id: 'gatepass', title: 'Gate Pass', icon: 'id-card-outline', color: '#3b82f6', route: '/gatepass' },
            { id: 'complaints', title: 'Requests & Complaints', icon: 'chatbubbles-outline', color: '#f59e0b', route: '/complaints' },
            { id: 'contacts', title: 'Contacts', icon: 'people-outline', color: '#4c1d95', route: '/contacts' },
            { id: 'rules', title: 'Rules & Regulations', icon: 'document-text-outline', color: '#8b5cf6', route: '/rules' },
            { id: 'announcements', title: 'Announcements', icon: 'notifications-outline', color: '#f43f5e', route: '/notices' },
            { id: 'notes', title: 'Notes', icon: 'create-outline', color: '#f59e0b', route: '/notes' },
            { id: 'documents', title: 'Documents', icon: 'folder-outline', color: '#10b981', route: '/documents' },
            { id: 'staff', title: 'Staff Contacts', icon: 'call-outline', color: '#0ea5e9', route: '/staff-contacts' },
            { id: 'events', title: 'Events', icon: 'calendar-outline', color: '#4c1d95', route: '/calendar' },
            { id: 'visitor_register', title: 'Visitor Register', icon: 'book-outline', color: '#10b981', route: '/visitor-register' },
            { id: 'scanner', title: 'Scanner', icon: 'scan-outline', color: '#8b5cf6', route: '/gatepass-scanner' },
            // Admin only features
            { id: 'polls', title: 'Polls', icon: 'stats-chart-outline', color: '#4c1d95', route: '/polls' },
            { id: 'members', title: 'Members', icon: 'people-circle-outline', color: '#3b82f6', route: '/members' },
            { id: 'gallery', title: 'Gallery', icon: 'images-outline', color: '#f59e0b', route: '/gallery' },
            { id: 'chat', title: 'Chat', icon: 'chatbubble-ellipses-outline', color: '#3b82f6', route: '/chat-list' },
            { id: 'settings', title: 'Settings', icon: 'settings-outline', color: '#64748b', route: '/settings' },
        ];

        if (isAdmin) return ALL_FEATURES;

        if (role === 'SECURITY_STAFF') {
            const ids = ['notices', 'announcements', 'gatepass', 'visitor_register', 'scanner', 'complaints', 'rules', 'events'];
            return ALL_FEATURES.filter(f => ids.includes(f.id));
        }

        if (role === 'MAINTENANCE_STAFF' || (role as string) === 'MEMBER') {
            const ids = ['notices', 'events', 'documents', 'announcements', 'gatepass', 'complaints'];
            return ALL_FEATURES.filter(f => ids.includes(f.id));
        }

        // Default: RESIDENT
        const residentIds = ['notices', 'gatepass', 'complaints', 'contacts', 'rules', 'announcements', 'notes', 'documents', 'staff', 'events'];
        return ALL_FEATURES.filter(f => residentIds.includes(f.id));
    };

    const features = getFeaturesByRole();

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Header */}
                    <View style={[styles.header, { backgroundColor: theme.background }]}>
                        <View style={styles.brandInfo}>
                            <View style={styles.logoBox}>
                                <Image source={require('../../../assets/icon.png')} style={styles.logoMini} />
                            </View>
                            <View style={{ marginLeft: 15 }}>
                                <Text style={[styles.brandTitleText, { color: '#fff' }]}>Resido</Text>
                                <Text style={styles.brandTaglineText}>Your Community Starts Here</Text>
                            </View>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]} onPress={() => router.push('/calendar')}>
                                <Ionicons name="calendar" size={22} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                                <Ionicons name="notifications" size={22} color="#fff" />
                                <View style={styles.notifBadge} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Community Dashboard View */}
                    <View style={[styles.communityMainCard, { backgroundColor: theme.surface, borderColor: 'rgba(255,255,255,0.05)' }]}>
                        <TouchableOpacity style={styles.cmHeaderRow} onPress={handleSwitchBack}>
                            <View style={styles.cmLogoBox}>
                                <Image source={require('../../../assets/greenwoods_logo.jpg')} style={styles.cmLogo} />
                            </View>
                            <View style={styles.cmNameBox}>
                                <Text style={[styles.cmName, { color: '#fff' }]} numberOfLines={1}>{activeWorkspace?.tenantName || 'Greenwoods Community'}</Text>
                                <Text style={styles.cmRoleText}>{activeWorkspace?.role || 'RESIDENT'}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={20} color="#64748b" />
                        </TouchableOpacity>

                        {/* Stats Grid - Small 4-Column */}
                        <View style={[styles.statsGridSmall, role === 'RESIDENT' && { justifyContent: 'center', gap: 40 }]}>
                            {role !== 'RESIDENT' && (
                                <>
                                    <SmallStatItem icon="people" count="128" label="Families" color="#10b981" bg="rgba(16, 185, 129, 0.1)" />
                                    <SmallStatItem icon="business" count="4" label="Blocks" color="#3b82f6" bg="rgba(59, 130, 246, 0.1)" />
                                </>
                            )}
                            <SmallStatItem icon="megaphone" count="5" label="Notices" color="#f59e0b" bg="rgba(245, 158, 11, 0.1)" />
                            <SmallStatItem icon="calendar" count="3" label="Events" color="#8b5cf6" bg="rgba(139, 92, 246, 0.1)" />
                        </View>

                        {/* Quick Action Buttons */}
                        <View style={styles.cmActions}>
                            <TouchableOpacity style={[styles.actionRow, { backgroundColor: 'rgba(255,255,255,0.03)' }]} onPress={() => router.push('/complaints')}>
                                <View style={[styles.actionIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                    <MaterialCommunityIcons name="hand-pointing-up" size={24} color="#4c1d95" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.actionTitle, { color: '#fff' }]}>Raise Request</Text>
                                    <Text style={styles.actionSub}>Submit a request</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#4c1d95" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Features Section */}
                    <View style={styles.sectionHeading}>
                        <Text style={[styles.sectionTitle, { color: '#fff' }]}>Community Features</Text>
                    </View>
                    <View style={styles.featuresGrid}>
                        {features.map((item) => (
                            <GridFeatureCard 
                                key={item.id}
                                icon={item.icon as any} 
                                title={item.title} 
                                color={item.color} 
                                bg="transparent" 
                                onPress={() => router.push(item.route as any)} 
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>
            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

// Sub-components
function GridFeatureCard({ icon, title, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.gridFeatureCard} onPress={onPress}>
            <View style={[styles.gfIconBox, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)' }]}><Ionicons name={icon} size={24} color={color} /></View>
            <Text style={[styles.gfTitle, { color: '#94a3b8' }]}>{title}</Text>
        </TouchableOpacity>
    );
}

function SmallStatItem({ icon, count, label, color, bg }: any) {
    return (
        <View style={styles.smallStatItem}>
            <View style={[styles.smallStatIconBox, { backgroundColor: bg }]}><Ionicons name={icon} size={24} color={color} /></View>
            <Text style={[styles.smallStatCount, { color: '#fff' }]}>{count}</Text>
            <Text style={styles.smallStatLabel}>{label}</Text>
        </View>
    );
}

function ServiceGridItem({ icon, title, sub, color }: any) {
    return (
        <TouchableOpacity style={styles.serviceGridItem}>
            <View style={[styles.serviceIconBox, { backgroundColor: '#f8fafc' }]}><Ionicons name={icon} size={24} color={color} /></View>
            <Text style={styles.serviceTitle}>{title}</Text>
            <Text style={styles.serviceSub}>{sub}</Text>
        </TouchableOpacity>
    );
}

function QACardCircular({ icon, title, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.qaCardCircular} onPress={onPress}>
            <View style={[styles.qaIconBoxCircular, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.05)', shadowOpacity: 0 }]}><Ionicons name={icon} size={24} color={color} /></View>
            <Text style={[styles.qaTitleCircular, { color: '#94a3b8' }]}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    content: { paddingBottom: 120 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#fff' },
    brandInfo: { flexDirection: 'row', alignItems: 'center' },
    logoBox: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    logoMini: { width: 50, height: 50, borderRadius: 12 },
    brandTitleText: { fontSize: 28, fontWeight: '900', color: '#4c1d95', marginLeft: 15 },
    brandTaglineText: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginLeft: 15 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    notifBadge: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fff' },
    profileBtn: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
    profileImg: { width: '100%', height: '100%' },
    communityMainCard: { backgroundColor: '#f5f6ff', padding: 20, paddingHorizontal: 25, marginBottom: 25, borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#eef2ff' },
    cmHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    cmLogoBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    cmLogo: { width: 44, height: 44, borderRadius: 10 },
    cmNameBox: { flex: 1, marginLeft: 15 },
    cmName: { fontSize: 19, fontWeight: '900', color: '#1e293b' },
    cmRoleText: { fontSize: 12, color: '#10b981', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
    statsGridSmall: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, paddingHorizontal: 10 },
    smallStatItem: { width: (width - 100) / 4, alignItems: 'center' },
    smallStatIconBox: { width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    smallStatCount: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
    smallStatLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },
    cmActions: { gap: 12 },
    actionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 20 },
    actionIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    actionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    actionSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    qaHorizontalScroll: { paddingLeft: 20, marginBottom: 30 },
    qaCardCircular: { alignItems: 'center', marginRight: 20, width: 70 },
    qaIconBoxCircular: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    qaTitleCircular: { fontSize: 11, fontWeight: '700', color: '#475569', textAlign: 'center' },
    communityServicesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, marginBottom: 30 },
    serviceGridItem: { width: (width - 60) / 2, backgroundColor: '#fff', padding: 18, borderRadius: 24, margin: 7, borderWidth: 1, borderColor: '#f1f5f9' },
    serviceIconBox: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    serviceTitle: { fontSize: 14, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
    serviceSub: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
    featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, marginBottom: 30, justifyContent: 'flex-start' },
    gridFeatureCard: { width: (width - 60) / 4, alignItems: 'center', marginBottom: 20 },
    gfIconBox: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
    gfTitle: { fontSize: 11, fontWeight: '700', color: '#475569', textAlign: 'center' },
});
