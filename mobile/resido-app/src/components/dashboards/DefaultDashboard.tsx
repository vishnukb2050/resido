import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../BottomNav';

const { width } = Dimensions.get('window');

export default function DefaultDashboard() {
    const router = useRouter();
    const { user } = useAuthStore();

    const isGuest = !user;

    if (isGuest) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.guestContent}>
                <View style={styles.heroSection}>
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
                    {/* Header Row - Matches Image 1 */}
                    <View style={styles.headerRow}>
                        <View style={styles.brandSide}>
                            <View style={styles.logoContainer}>
                                <Image 
                                    source={require('../../../assets/resido_logo.jpg')} 
                                    style={styles.logoImage} 
                                    resizeMode="contain"
                                />
                            </View>
                            <View style={styles.brandTextContainer}>
                                <Text style={styles.brandName}>Resido</Text>
                                <Text style={styles.brandTagline}>Your Community</Text>
                                <Text style={styles.brandTaglineSmall}>Starts here</Text>
                            </View>
                        </View>

                        {/* Announcements Card - Mini Version */}
                        <TouchableOpacity style={styles.announcementCardMini}>
                            <View style={styles.announcementTextContent}>
                                <Text style={styles.announcementTitle}>Announcements</Text>
                                <Text style={styles.announcementDescMini} numberOfLines={2}>
                                    Stay updated with the latest news and important updates...
                                </Text>
                                <View style={styles.viewAllRow}>
                                    <Text style={styles.viewAllText}>View all</Text>
                                    <Ionicons name="chevron-forward" size={12} color="#6366f1" />
                                </View>
                            </View>
                            <View style={styles.announcementIconBox}>
                                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png' }} style={styles.announcementIconImg} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Quick Access Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Quick Access</Text>
                    </View>
                    
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAccessScroll}>
                        <QuickAccessCard 
                            icon="💬" 
                            title="Global Chat" 
                            subtitle="Connect with residents" 
                            bg="#f5f3ff"
                            onPress={() => router.push('/chat-list')}
                        />
                        <QuickAccessCard 
                            icon="📅" 
                            title="Calendar" 
                            subtitle="Stay updated on events" 
                            bg="#fff1f2"
                            onPress={() => router.push('/calendar')}
                        />
                        <QuickAccessCard 
                            icon="🛠️" 
                            title="Services" 
                            subtitle="Raise requests & get help" 
                            bg="#fffbeb"
                            onPress={() => router.push('/service-search')}
                        />
                        <QuickAccessCard 
                            icon="💼" 
                            title="Job Profile" 
                            subtitle="Find job opportunities" 
                            bg="#f0fdf4"
                            onPress={() => router.push('/job-profile')}
                        />
                        <QuickAccessCard 
                            icon="🏢" 
                            title="Community" 
                            subtitle="Create a community" 
                            bg="#eff6ff"
                            onPress={() => router.push('/create-community')}
                        />
                    </ScrollView>

                    {/* Features Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Features</Text>
                    </View>

                    <View style={styles.featuresGrid}>
                        <FeatureCard 
                            icon="👤" 
                            title="Contacts" 
                            subtitle="Directory of community residents" 
                            bg="#eef2ff"
                            onPress={() => router.push('/contacts')}
                        />
                        <FeatureCard 
                            icon="📝" 
                            title="Notes" 
                            subtitle="Keep your notes handy" 
                            bg="#fffbeb"
                            onPress={() => router.push('/notes')}
                        />
                        <FeatureCard 
                            icon="🖨️" 
                            title="Scanner" 
                            subtitle="Scan documents on the go" 
                            bg="#eff6ff"
                            onPress={() => router.push('/scanner')}
                        />
                        <FeatureCard 
                            icon="📁" 
                            title="Documents" 
                            subtitle="Access important documents" 
                            bg="#ecfdf5"
                            onPress={() => router.push('/documents')}
                        />
                        <FeatureCard 
                            icon="➕" 
                            title="More" 
                            subtitle="Explore more features" 
                            bg="#f8fafc"
                            onPress={() => router.push('/service-search')}
                        />
                    </View>
                </View>
            </ScrollView>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

function QuickAccessCard({ icon, title, subtitle, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.qaCard} onPress={onPress}>
            <View style={[styles.qaIconContainer, { backgroundColor: bg }]}>
                <Text style={{ fontSize: 32 }}>{icon}</Text>
            </View>
            <Text style={styles.qaTitle}>{title}</Text>
            <Text style={styles.qaSubtitle}>{subtitle}</Text>
        </TouchableOpacity>
    );
}

function FeatureCard({ icon, title, subtitle, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.featureCard} onPress={onPress}>
            <View style={[styles.featureIconBox, { backgroundColor: bg }]}>
                <Text style={{ fontSize: 24 }}>{icon}</Text>
            </View>
            <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitleText}>{title}</Text>
                <Text style={styles.featureSubtitleText} numberOfLines={1}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
        </TouchableOpacity>
    );
}

function NavItem({ icon, label, active, badge, onPress }: any) {
    return (
        <TouchableOpacity style={styles.navItem} onPress={onPress}>
            <View>
                <Ionicons name={icon} size={24} color={active ? '#6366f1' : '#1e293b'} />
                {badge && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                )}
            </View>
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
            {active && <View style={styles.activeBar} />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    guestContent: { padding: 30, alignItems: 'center', justifyContent: 'center', flex: 1 },
    content: { padding: 20, paddingBottom: 100 },
    
    headerRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 32, 
        marginTop: 10 
    },
    brandSide: { 
        flexDirection: 'row', 
        alignItems: 'center',
        flex: 1
    },
    logoContainer: {
        width: 65,
        height: 65,
        borderRadius: 32.5,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3
    },
    logoImage: { width: 45, height: 45 },
    brandTextContainer: { marginLeft: 12 },
    brandName: { fontSize: 28, fontWeight: '900', color: '#6366f1' },
    brandTagline: { fontSize: 13, color: '#1e293b', fontWeight: '700' },
    brandTaglineSmall: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: -2 },
    
    announcementCardMini: { 
        backgroundColor: '#f5f3ff', 
        borderRadius: 20, 
        padding: 12, 
        flexDirection: 'row', 
        alignItems: 'center',
        width: '45%',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.05)',
    },
    announcementTextContent: { flex: 1 },
    announcementIconBox: { marginLeft: 8 },
    announcementIconImg: { width: 45, height: 45, borderRadius: 10 },
    announcementTitle: { fontSize: 12, fontWeight: '800', color: '#6366f1', marginBottom: 2 },
    announcementDescMini: { fontSize: 9, color: '#475569', lineHeight: 13, fontWeight: '500' },
    viewAllRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    viewAllText: { fontSize: 11, fontWeight: '700', color: '#6366f1', marginRight: 2 },

    sectionHeader: { marginBottom: 16, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    
    quickAccessScroll: { marginBottom: 20 },
    qaCard: { 
        width: width * 0.28, 
        backgroundColor: '#fff', 
        borderRadius: 24, 
        padding: 12, 
        marginRight: 12,
        alignItems: 'center',
        borderWidth: 1, 
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    qaIconContainer: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    qaTitle: { fontSize: 12, fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: 4 },
    qaSubtitle: { fontSize: 9, color: '#64748b', textAlign: 'center', lineHeight: 12 },

    featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    featureCard: { 
        width: '48%', 
        backgroundColor: '#fff', 
        borderRadius: 20, 
        padding: 12, 
        flexDirection: 'row', 
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1
    },
    featureIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    featureTextContainer: { flex: 1 },
    featureTitleText: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
    featureSubtitleText: { fontSize: 9, color: '#64748b', marginTop: 2 },

    bottomNav: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: 85, 
        backgroundColor: '#fff', 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        alignItems: 'center', 
        paddingBottom: 25,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.06,
        shadowRadius: 15,
        elevation: 20
    },
    navItem: { alignItems: 'center', justifyContent: 'center', width: 60, height: '100%' },
    navLabel: { fontSize: 11, color: '#1e293b', marginTop: 6, fontWeight: '700' },
    navLabelActive: { color: '#6366f1' },
    activeBar: { position: 'absolute', bottom: -5, width: 25, height: 3, borderRadius: 2, backgroundColor: '#6366f1' },
    
    badge: { position: 'absolute', top: -4, right: -6, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

    navProfileContainer: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden' },
    navAvatar: { width: '100%', height: '100%' },
    navAvatarPlaceholder: { width: '100%', height: '100%', backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },

    heroSection: { marginBottom: 32, alignItems: 'center' },
    brandTitle: { fontSize: 32, fontWeight: '900', color: '#6366f1', marginBottom: 8 },
    heroSub: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 12, textAlign: 'center' },
    heroDesc: { fontSize: 15, color: '#64748b', lineHeight: 24, textAlign: 'center' },
    actionSection: { width: '100%', paddingHorizontal: 20 },
    primaryBtn: { backgroundColor: '#6366f1', paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
    primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
