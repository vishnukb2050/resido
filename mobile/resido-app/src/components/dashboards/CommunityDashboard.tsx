import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import BottomNav from '../BottomNav';

const { width } = Dimensions.get('window');

export default function CommunityDashboard() {
    const router = useRouter();
    const { user, activeWorkspace, setActiveWorkspace } = useAuthStore();
    const [showCommunityServices, setShowCommunityServices] = useState(true);

    const handleSwitchBack = () => {
        // @ts-ignore
        setActiveWorkspace(null, null);
        router.push('/');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
                            <TouchableOpacity style={styles.iconBtn}>
                                <Ionicons name="notifications" size={22} color="#6366f1" />
                                <View style={styles.notifBadge} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.profileBtn}>
                                <Image source={{ uri: 'https://i.pravatar.cc/100?u=resido_user' }} style={styles.profileImg} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Community Main Card */}
                    <View style={styles.communityMainCard}>
                        <View style={styles.cmcHeader}>
                            <View style={styles.cmcLogoBox}>
                                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2111/2111320.png' }} style={styles.cmcLogo} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <TouchableOpacity style={styles.cmcTitleRow} onPress={handleSwitchBack}>
                                    <Text style={styles.cmcTitle}>{activeWorkspace?.tenantName || 'Greenwoods'}</Text>
                                    <Ionicons name="chevron-down" size={16} color="#1e293b" style={{ marginLeft: 4 }} />
                                </TouchableOpacity>
                                <Text style={styles.cmcSub}>Your Community</Text>
                            </View>
                            <TouchableOpacity style={styles.roleBadge}>
                                <View style={styles.roleBadgeLeft}>
                                    <View style={styles.roleIconBox}>
                                        <Ionicons name="person" size={12} color="#10b981" />
                                    </View>
                                    <View style={{ marginLeft: 8 }}>
                                        <Text style={styles.roleLabel}>Your Role</Text>
                                        <Text style={styles.roleValue}>Resident</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.statsGrid}>
                            <StatBox icon="people-group" count="128" label="Families" color="#10b981" bg="#ecfdf5" />
                            <StatBox icon="building" count="4" label="Blocks" color="#3b82f6" bg="#eff6ff" />
                            <StatBox icon="bullhorn" count="5" label="Notices" color="#f59e0b" bg="#fffbeb" />
                            <StatBox icon="calendar-alt" count="3" label="Events" color="#6366f1" bg="#f5f3ff" />
                        </View>

                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/service-search')}>
                                <View style={[styles.actionIconBox, { backgroundColor: '#f5f3ff' }]}>
                                    <MaterialCommunityIcons name="hand-pointing-up" size={20} color="#6366f1" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.actionTitle}>Raise Request</Text>
                                    <Text style={styles.actionSub}>Submit a request</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#6366f1" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/calendar')}>
                                <View style={[styles.actionIconBox, { backgroundColor: '#f5f3ff' }]}>
                                    <Ionicons name="calendar" size={20} color="#6366f1" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.actionTitle}>View Calendar</Text>
                                    <Text style={styles.actionSub}>Check upcoming events</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#6366f1" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Quick Access */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Quick Access</Text>
                        <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
                    </View>
                    
                    <View style={styles.quickAccessRow}>
                        <QAItem icon="construct-outline" title="Services" color="#10b981" onPress={() => setShowCommunityServices(!showCommunityServices)} />
                        <QAItem icon="calendar-outline" title="Calendar" color="#6366f1" onPress={() => router.push('/calendar')} />
                        <QAItem icon="document-text-outline" title="Documents" color="#3b82f6" onPress={() => router.push('/documents')} />
                        <QAItem icon="briefcase-outline" title="Business" color="#f59e0b" onPress={() => router.push('/job-profile')} />
                        <QAItem icon="business-outline" title="Community" color="#6366f1" onPress={() => router.push('/communities')} />
                    </View>

                    {/* Community Services - Expandable Section */}
                    {showCommunityServices && (
                        <>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Community Services</Text>
                                <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
                            </View>

                            <View style={styles.communityServicesGrid}>
                                <ServiceCard icon="bullhorn" title="Noticeboard" sub="Latest notices & announcements" color="#10b981" bg="#ecfdf5" />
                                <ServiceCard icon="id-card" title="Gate Pass" sub="Apply & manage gate passes" color="#3b82f6" bg="#eff6ff" />
                                <ServiceCard icon="comment-dots" title="Complaints & Requests" sub="Raise complaints & track status" color="#f59e0b" bg="#fffbeb" />
                                <ServiceCard icon="tools" title="Maintenance" sub="Report maintenance issues" color="#6366f1" bg="#f5f3ff" />
                                <ServiceCard icon="money-bill-wave" title="Bills" sub="View & pay your bills" color="#10b981" bg="#ecfdf5" />
                                <ServiceCard icon="images" title="Gallery" sub="Community photos & memories" color="#ec4899" bg="#fdf2f8" />
                                <ServiceCard icon="address-book" title="Directory" sub="Contact residents & management" color="#6366f1" bg="#f5f3ff" />
                                <ServiceCard icon="calendar-day" title="Events" sub="Upcoming events & activities" color="#f59e0b" bg="#fffbeb" />
                            </View>
                        </>
                    )}

                    {/* Features */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Features</Text>
                    </View>

                    <View style={styles.featuresGrid}>
                        <FeatureRow icon="user-friends" title="Contacts" sub="Directory of community members" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/contacts')} />
                        <FeatureRow icon="edit" title="Notes" sub="Keep your notes handy" color="#f59e0b" bg="#fffbeb" onPress={() => router.push('/notes')} />
                        <FeatureRow icon="qrcode" title="Scanner" sub="Scan QR & documents instantly" color="#8b5cf6" bg="#f5f3ff" onPress={() => router.push('/scanner')} />
                        <FeatureRow icon="file-alt" title="Documents" sub="Access important files & resources" color="#10b981" bg="#ecfdf5" onPress={() => router.push('/documents')} />
                    </View>
                </View>
            </ScrollView>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

function StatBox({ icon, count, label, color, bg }: any) {
    return (
        <View style={styles.statBox}>
            <View style={[styles.statIconContainer, { backgroundColor: bg }]}>
                <FontAwesome5 name={icon} size={16} color={color} />
            </View>
            <View style={{ marginLeft: 10 }}>
                <Text style={styles.statCount}>{count}</Text>
                <Text style={styles.statLabel}>{label}</Text>
            </View>
        </View>
    );
}

function QAItem({ icon, title, color, onPress }: any) {
    return (
        <TouchableOpacity style={styles.qaItem} onPress={onPress}>
            <View style={styles.qaIconBox}>
                <Ionicons name={icon} size={28} color={color} />
            </View>
            <Text style={styles.qaLabelText}>{title}</Text>
        </TouchableOpacity>
    );
}

function ServiceCard({ icon, title, sub, color, bg }: any) {
    return (
        <TouchableOpacity style={styles.serviceCard}>
            <View style={[styles.serviceIconBox, { backgroundColor: bg }]}>
                <FontAwesome5 name={icon} size={20} color={color} />
            </View>
            <Text style={styles.serviceTitle}>{title}</Text>
            <Text style={styles.serviceSub} numberOfLines={2}>{sub}</Text>
            <Ionicons name="chevron-forward" size={14} color={color} style={styles.serviceArrow} />
        </TouchableOpacity>
    );
}

function FeatureRow({ icon, title, sub, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.featureRow} onPress={onPress}>
            <View style={[styles.featureIconBox, { backgroundColor: bg }]}>
                <FontAwesome5 name={icon} size={18} color={color} />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureSub}>{sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    content: { paddingBottom: 100 },
    
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    brandInfo: { flexDirection: 'row', alignItems: 'center' },
    logoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    logoMini: { width: 32, height: 32 },
    brandTitleText: { fontSize: 22, fontWeight: '900', color: '#6366f1', marginLeft: 12 },
    brandTaglineText: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginLeft: 12 },
    
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    notifBadge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1', borderWidth: 2, borderColor: '#fff' },
    profileBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
    profileImg: { width: '100%', height: '100%' },

    communityMainCard: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 30, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 25 },
    cmcHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    cmcLogoBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    cmcLogo: { width: 32, height: 32 },
    cmcTitleRow: { flexDirection: 'row', alignItems: 'center' },
    cmcTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    cmcSub: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
    roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    roleBadgeLeft: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
    roleIconBox: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
    roleLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700' },
    roleValue: { fontSize: 13, fontWeight: '800', color: '#10b981' },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    statBox: { width: (width - 90) / 2, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fcfcfd', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    statIconContainer: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    statCount: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
    statLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },

    actionRow: { gap: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fcfcfd', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    actionIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    actionTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    actionSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    viewAllText: { fontSize: 13, fontWeight: '700', color: '#6366f1' },

    quickAccessRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 10, marginBottom: 25 },
    qaItem: { alignItems: 'center', width: (width - 40) / 5 },
    qaIconBox: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 8 },
    qaLabelText: { fontSize: 10, fontWeight: '800', color: '#64748b', textAlign: 'center' },

    communityServicesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, gap: 10, marginBottom: 30 },
    serviceCard: { width: (width - 50) / 2, backgroundColor: '#fff', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 1 },
    serviceIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    serviceTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
    serviceSub: { fontSize: 10, color: '#94a3b8', fontWeight: '500', lineHeight: 14, marginBottom: 10 },
    serviceArrow: { position: 'absolute', bottom: 16, right: 16 },

    featuresGrid: { paddingHorizontal: 20, gap: 10 },
    featureRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    featureIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    featureTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    featureSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
});
