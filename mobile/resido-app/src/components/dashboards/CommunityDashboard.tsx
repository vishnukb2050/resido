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

    const handleSwitchBack = () => {
        // @ts-ignore
        setActiveWorkspace(null, null);
        router.push('/');
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.brandInfo}>
                            <View style={styles.logoBox}>
                                <Image source={require('../../../assets/resido_logo.jpg')} style={styles.logoMini} />
                            </View>
                            <View>
                                <Text style={styles.brandTitleText}>Resido</Text>
                                <Text style={styles.brandTaglineText}>Your Community Starts Here</Text>
                            </View>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/calendar')}>
                                <Ionicons name="calendar" size={24} color="#6366f1" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn}>
                                <Ionicons name="notifications" size={24} color="#6366f1" />
                                <View style={styles.notifBadge} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
                                <Image source={{ uri: 'https://i.pravatar.cc/100?u=resido' }} style={styles.profileImg} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Community Dashboard View */}
                    <View style={styles.communityMainCard}>
                        <TouchableOpacity style={styles.cmHeaderRow} onPress={handleSwitchBack}>
                            <View style={styles.cmLogoBox}>
                                <Image source={require('../../../assets/greenwoods_logo.jpg')} style={styles.cmLogo} />
                            </View>
                            <View style={styles.cmNameBox}>
                                <Text style={styles.cmName} numberOfLines={1}>{activeWorkspace?.tenantName || 'Greenwoods Community'}</Text>
                                <Text style={styles.cmRoleText}>{activeWorkspace?.role || 'RESIDENT'}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={20} color="#cbd5e1" />
                        </TouchableOpacity>

                        {/* Stats Grid - Small 4-Column */}
                        <View style={styles.statsGridSmall}>
                            <SmallStatItem icon="people" count="128" label="Families" color="#10b981" bg="#ecfdf5" />
                            <SmallStatItem icon="business" count="4" label="Blocks" color="#3b82f6" bg="#eff6ff" />
                            <SmallStatItem icon="megaphone" count="5" label="Notices" color="#f59e0b" bg="#fffbeb" />
                            <SmallStatItem icon="calendar" count="3" label="Events" color="#8b5cf6" bg="#f5f3ff" />
                        </View>

                        {/* Quick Action Buttons */}
                        <View style={styles.cmActions}>
                            <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/complaints')}>
                                <View style={[styles.actionIconBox, { backgroundColor: '#f5f3ff' }]}>
                                    <MaterialCommunityIcons name="hand-pointing-up" size={24} color="#6366f1" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.actionTitle}>Raise Request</Text>
                                    <Text style={styles.actionSub}>Submit a request</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#6366f1" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/calendar')}>
                                <View style={[styles.actionIconBox, { backgroundColor: '#f0f9ff' }]}>
                                    <MaterialCommunityIcons name="calendar-month" size={24} color="#0ea5e9" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.actionTitle}>View Calendar</Text>
                                    <Text style={styles.actionSub}>Check upcoming events</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#0ea5e9" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Quick Access */}
                    <View style={styles.sectionHeading}>
                        <Text style={styles.sectionTitle}>Quick Access</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.qaHorizontalScroll}>
                        <QACardCircular icon="construct" title="Services" color="#10b981" bg="#ecfdf5" onPress={() => router.push('/service-search')} />
                        <QACardCircular icon="wallet" title="Finance" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/finance')} />
                        <QACardCircular icon="document-text" title="Documents" color="#3b82f6" bg="#eff6ff" onPress={() => router.push('/documents')} />
                        <QACardCircular icon="briefcase" title="Business" color="#f59e0b" bg="#fffbeb" onPress={() => router.push('/business-profile')} />
                        <QACardCircular icon="people" title="Community" color="#8b5cf6" bg="#f5f3ff" onPress={() => router.push('/communities')} />
                    </ScrollView>

                    {/* Community Services Grid */}
                    <View style={styles.sectionHeading}>
                        <Text style={styles.sectionTitle}>Community Services</Text>
                    </View>
                    <View style={styles.featuresGrid}>
                        <GridFeatureCard icon="megaphone-outline" title="Noticeboard" color="#10b981" bg="#ecfdf5" onPress={() => router.push('/notices')} />
                        <GridFeatureCard icon="id-card-outline" title="Gate Pass" color="#3b82f6" bg="#eff6ff" onPress={() => router.push('/gate-pass')} />
                        <GridFeatureCard icon="chatbubbles-outline" title="Complaints" color="#f59e0b" bg="#fffbeb" onPress={() => router.push('/complaints')} />
                        <GridFeatureCard icon="build-outline" title="Maintenance" color="#8b5cf6" bg="#f5f3ff" onPress={() => router.push('/maintenance')} />
                    </View>

                    {/* All Features Grid */}
                    <View style={styles.sectionHeading}>
                        <Text style={styles.sectionTitle}>All Features</Text>
                    </View>
                    <View style={styles.featuresGrid}>
                        <GridFeatureCard icon="people" title="Contacts" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/contacts')} />
                        <GridFeatureCard icon="scan" title="Scanner" color="#8b5cf6" bg="#f5f3ff" onPress={() => router.push('/scanner')} />
                        <GridFeatureCard icon="folder" title="Documents" color="#10b981" bg="#ecfdf5" onPress={() => router.push('/documents')} />
                        <GridFeatureCard icon="chatbubble-ellipses" title="Chat" color="#3b82f6" bg="#eff6ff" onPress={() => router.push('/chat-list')} />
                        <GridFeatureCard icon="newspaper" title="Thread" color="#1e293b" bg="#f1f5f9" onPress={() => router.push('/thread')} />
                        <GridFeatureCard icon="play-circle" title="Flares" color="#ef4444" bg="#fef2f2" onPress={() => router.push('/flares')} />
                        <GridFeatureCard icon="calendar" title="Calendar" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/calendar')} />
                        <GridFeatureCard icon="settings" title="Settings" color="#64748b" bg="#f8fafc" onPress={() => router.push('/settings')} />
                        <GridFeatureCard icon="help-circle" title="Support" color="#0ea5e9" bg="#f0f9ff" onPress={() => router.push('/support')} />
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
            <View style={[styles.gfIconBox, { backgroundColor: bg }]}><Ionicons name={icon} size={24} color={color} /></View>
            <Text style={styles.gfTitle}>{title}</Text>
        </TouchableOpacity>
    );
}

function SmallStatItem({ icon, count, label, color, bg }: any) {
    return (
        <View style={styles.smallStatItem}>
            <View style={[styles.smallStatIconBox, { backgroundColor: bg }]}><Ionicons name={icon} size={24} color={color} /></View>
            <Text style={styles.smallStatCount}>{count}</Text>
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
            <View style={styles.qaIconBoxCircular}><Ionicons name={icon} size={24} color={color} /></View>
            <Text style={styles.qaTitleCircular}>{title}</Text>
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
    brandTitleText: { fontSize: 28, fontWeight: '900', color: '#6366f1', marginLeft: 15 },
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
