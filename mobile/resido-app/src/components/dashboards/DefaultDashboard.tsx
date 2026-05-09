import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, Dimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../BottomNav';

const { width } = Dimensions.get('window');

export default function DefaultDashboard() {
    const router = useRouter();
    const { user, workspaces, activeWorkspace, setActiveWorkspace } = useAuthStore();

    const isGuest = !user;

    if (isGuest) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.guestContent}>
                <View style={styles.guestHero}>
                    <Image source={require('../../../assets/resido_logo.jpg')} style={{ width: 100, height: 100, marginBottom: 20 }} />
                    <Text style={styles.brandTitle}>Resido</Text>
                    <Text style={styles.heroSub}>Smart Living for Modern Communities</Text>
                    <Text style={styles.heroDesc}>Manage apartments, connect with residents, and access local services—all in one app.</Text>
                </View>

                <View style={styles.actionSection}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/otp-login')}>
                        <Text style={styles.primaryBtnText}>Get Started with OTP</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

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
                                <Ionicons name="notifications" size={24} color="#6366f1" />
                                <View style={styles.notifBadge} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.profileBtn}>
                                <Image source={{ uri: 'https://i.pravatar.cc/100?u=resido' }} style={styles.profileImg} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchSection}>
                        <View style={styles.searchBar}>
                            <Ionicons name="search-outline" size={20} color="#94a3b8" />
                            <TextInput 
                                style={styles.searchInput} 
                                placeholder="Search users by name, flat, role..."
                                placeholderTextColor="#94a3b8"
                            />
                            <TouchableOpacity>
                                <Ionicons name="options-outline" size={20} color="#1e293b" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Personal Space Section */}
                    <TouchableOpacity style={styles.personalSpaceCard} onPress={() => router.push('/communities')}>
                        <View style={styles.psIconBox}>
                            <MaterialCommunityIcons name="office-building" size={24} color="#6366f1" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 15 }}>
                            <Text style={styles.psTitle}>
                                {activeWorkspace?.tenantName || 'Personal Space'}
                            </Text>
                            <Text style={styles.psSub}>
                                {workspaces.length > 0 ? `Switch between ${workspaces.length} communities` : 'Your personal dashboard'}
                            </Text>
                        </View>
                        <View style={styles.psArrowBox}>
                            <Ionicons name={workspaces.length > 1 ? "chevron-down" : "chevron-forward"} size={20} color="#1e293b" />
                        </View>
                    </TouchableOpacity>

                    {/* Notification Stats - Horizontal Scroll */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.notifScroll}>
                        <NotifCard 
                            icon="clipboard-list-outline" 
                            count={2} 
                            title="Active Requests" 
                            linkText="View details" 
                            color="#6366f1"
                            bg="#f5f3ff"
                        />
                        <NotifCard 
                            icon="calendar-clock" 
                            count={1} 
                            title="Upcoming Event" 
                            linkText="Today, 7:00 PM" 
                            color="#10b981"
                            bg="#ecfdf5"
                        />
                        <NotifCard 
                            icon="bullhorn-outline" 
                            count={3} 
                            title="New Notices" 
                            linkText="View all" 
                            color="#f59e0b"
                            bg="#fffbeb"
                        />
                    </ScrollView>

                    {/* Social Stats */}
                    <View style={styles.socialRow}>
                        <TouchableOpacity style={styles.socialCard}>
                            <Ionicons name="people" size={22} color="#6366f1" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.socialCount}>123</Text>
                                <Text style={styles.socialLabel}>Followers</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialCard}>
                            <Ionicons name="people-outline" size={22} color="#6366f1" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.socialCount}>22</Text>
                                <Text style={styles.socialLabel}>Following</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                    </View>

                    {/* Quick Access */}
                    <View style={styles.sectionHeading}>
                        <Text style={styles.sectionTitle}>Quick Access</Text>
                        <TouchableOpacity style={styles.viewAllBtn}>
                            <Text style={styles.viewAllText}>View All</Text>
                            <Ionicons name="chevron-forward" size={14} color="#6366f1" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.quickAccessGrid}>
                        <QACard icon="briefcase" title="Business Profile" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/business-profile')} />
                        <QACard icon="construct" title="Services" color="#10b981" bg="#ecfdf5" onPress={() => router.push('/service-search')} />
                        <QACard icon="document-text" title="Notes" color="#f59e0b" bg="#fffbeb" onPress={() => router.push('/notes')} />
                        <QACard icon="calendar" title="Calendar" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/calendar')} />
                    </View>

                    {/* All Features */}
                    <View style={styles.sectionHeading}>
                        <Text style={styles.sectionTitle}>All Features</Text>
                        <TouchableOpacity style={styles.viewAllBtn}>
                            <Text style={styles.viewAllText}>View All</Text>
                            <Ionicons name="chevron-forward" size={14} color="#6366f1" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.featuresList}>
                        <FullFeatureCard icon="people" title="Contacts" subtitle="Directory of community members" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/contacts')} />
                        <FullFeatureCard icon="scan" title="Scanner" subtitle="Scan QR & documents instantly" color="#8b5cf6" bg="#f5f3ff" onPress={() => router.push('/scanner')} />
                        <FullFeatureCard icon="folder" title="Documents" subtitle="Access important files & resources" color="#10b981" bg="#ecfdf5" onPress={() => router.push('/documents')} />
                        <FullFeatureCard icon="chatbubble-ellipses" title="Chat" subtitle="Connect with community members" color="#3b82f6" bg="#eff6ff" onPress={() => router.push('/chat-list')} />
                        <FullFeatureCard icon="newspaper" title="Thread" subtitle="Community discussions & updates" color="#1e293b" bg="#f1f5f9" onPress={() => router.push('/thread')} />
                        <FullFeatureCard icon="play-circle" title="Flares" subtitle="Watch important announcements" color="#ef4444" bg="#fef2f2" onPress={() => router.push('/flares')} />
                    </View>
                </View>
            </ScrollView>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

function NotifCard({ icon, count, title, linkText, color, bg }: any) {
    if (count === 0) return null;
    return (
        <View style={[styles.notifCard, { backgroundColor: '#fff' }]}>
            <View style={[styles.notifIconBox, { backgroundColor: bg }]}>
                <MaterialCommunityIcons name={icon} size={22} color={color} />
            </View>
            <View style={styles.notifContent}>
                <Text style={styles.notifCount}>{count}</Text>
                <Text style={styles.notifTitle}>{title}</Text>
                <TouchableOpacity>
                    <Text style={[styles.notifLink, { color: color }]}>{linkText}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function QACard({ icon, title, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.qaCardSmall} onPress={onPress}>
            <View style={[styles.qaIconBoxSmall, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={styles.qaTitleSmall}>{title}</Text>
            <View style={styles.qaArrowSmall}>
                <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
            </View>
        </TouchableOpacity>
    );
}

function FullFeatureCard({ icon, title, subtitle, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.fullFeatureCard} onPress={onPress}>
            <View style={[styles.ffIconBox, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <View style={styles.ffTextContent}>
                <Text style={styles.ffTitle}>{title}</Text>
                <Text style={styles.ffSub}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    content: { paddingBottom: 120 },
    
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#fff' },
    brandInfo: { flexDirection: 'row', alignItems: 'center' },
    logoBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    logoMini: { width: 35, height: 35 },
    brandTitleText: { fontSize: 24, fontWeight: '900', color: '#6366f1', marginLeft: 12 },
    brandTaglineText: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginLeft: 12 },
    
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    notifBadge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fff' },
    profileBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
    profileImg: { width: '100%', height: '100%' },

    searchSection: { paddingHorizontal: 20, marginBottom: 25 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 25, paddingHorizontal: 20, height: 54, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b' },

    personalSpaceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, padding: 16, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 1 },
    psIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    psTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    psSub: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
    psArrowBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },

    notifScroll: { paddingLeft: 20, paddingRight: 10, marginBottom: 25 },
    notifCard: { width: 160, padding: 16, borderRadius: 24, marginRight: 15, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
    notifIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    notifContent: { flex: 1 },
    notifCount: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    notifTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
    notifLink: { fontSize: 11, fontWeight: '800' },

    socialRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 15, marginBottom: 30 },
    socialCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    socialCount: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    socialLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

    sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    viewAllText: { fontSize: 13, fontWeight: '700', color: '#6366f1' },

    quickAccessGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, marginBottom: 25 },
    qaCardSmall: { width: (width - 50) / 2, backgroundColor: '#fff', padding: 12, borderRadius: 20, margin: 5, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    qaIconBoxSmall: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    qaTitleSmall: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginLeft: 12, flex: 1 },
    qaArrowSmall: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },

    featuresList: { paddingHorizontal: 20 },
    fullFeatureCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
    ffIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    ffTextContent: { flex: 1, marginLeft: 15 },
    ffTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    ffSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

    guestContent: { padding: 30, alignItems: 'center', justifyContent: 'center', flex: 1 },
    guestHero: { alignItems: 'center', marginBottom: 30 },
    brandTitle: { fontSize: 32, fontWeight: '900', color: '#6366f1', marginBottom: 8 },
    heroSub: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 12, textAlign: 'center' },
    heroDesc: { fontSize: 15, color: '#64748b', lineHeight: 24, textAlign: 'center' },
    actionSection: { width: '100%', paddingHorizontal: 20 },
    primaryBtn: { backgroundColor: '#6366f1', paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
    primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
