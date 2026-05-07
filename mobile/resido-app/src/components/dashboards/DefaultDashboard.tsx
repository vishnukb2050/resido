import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function DefaultDashboard() {
    const router = useRouter();
    const { user } = useAuthStore();

    const isGuest = !user;

    if (isGuest) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.guestContent}>
                <View style={styles.heroSection}>
                    <Text style={styles.brandTitle}>Resido</Text>
                    <Text style={styles.heroSub}>Smart Living for Modern Communities</Text>
                    <Text style={styles.heroDesc}>Manage apartments, connect with residents, and access local services—all in one app.</Text>
                    <View style={styles.heroImgPlaceholder}><Text style={{ fontSize: 60 }}>🌳🏢👩‍💻</Text></View>
                </View>

                <View style={styles.actionSection}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/otp-login')}>
                        <Text style={styles.primaryBtnText}>Get Started with OTP</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.featuresInfoContainer}>
                    {[
                        { icon: '🏢', title: 'Management', desc: 'Notices, Members & more', bg: '#eff6ff' },
                        { icon: '💬', title: 'Community', desc: 'Chats & Discussions', bg: '#f3e8ff' },
                    ].map((f, i) => (
                        <View key={i} style={styles.featureInfoBox}>
                            <View style={[styles.fIconBox, { backgroundColor: f.bg }]}><Text style={styles.fIconText}>{f.icon}</Text></View>
                            <Text style={styles.fTitle}>{f.title}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Header Row */}
                    <View style={styles.headerRow}>
                        <View style={styles.brandContainer}>
                            <View style={styles.logoCircle}>
                                <MaterialCommunityIcons name="office-building-marker" size={24} color="#6366f1" />
                            </View>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.brandName}>Resido</Text>
                                <Text style={styles.brandTagline}>Your Community Starts here</Text>
                            </View>
                        </View>

                        {/* Announcements Card */}
                        <TouchableOpacity style={styles.announcementCard}>
                            <View style={styles.announcementHeader}>
                                <Text style={styles.announcementTitle}>Announcements</Text>
                                <MaterialCommunityIcons name="bullhorn-variant" size={24} color="#6366f1" />
                            </View>
                            <Text style={styles.announcementDesc} numberOfLines={2}>
                                Stay updated with the latest news and important updates from your community.
                            </Text>
                            <View style={styles.viewAllRow}>
                                <Text style={styles.viewAllText}>View all</Text>
                                <Ionicons name="chevron-forward" size={14} color="#6366f1" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Quick Access Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Quick Access</Text>
                    </View>
                    
                    <View style={styles.quickAccessGrid}>
                        <QuickAccessCard 
                            icon="chatbubble-ellipses" 
                            title="Global Chat" 
                            subtitle="Connect with residents" 
                            color="#8b5cf6" 
                            bg="#f5f3ff"
                            onPress={() => router.push('/chat-list')}
                        />
                        <QuickAccessCard 
                            icon="calendar" 
                            title="Calendar" 
                            subtitle="Stay updated on events" 
                            color="#ec4899" 
                            bg="#fdf2f8"
                            onPress={() => router.push('/calendar')}
                        />
                        <QuickAccessCard 
                            icon="build" 
                            title="Services" 
                            subtitle="Raise requests & get help" 
                            color="#f59e0b" 
                            bg="#fffbeb"
                            onPress={() => router.push('/service-search')}
                        />
                        <QuickAccessCard 
                            icon="briefcase" 
                            title="Job Profile" 
                            subtitle="Find job opportunities" 
                            color="#10b981" 
                            bg="#ecfdf5"
                            onPress={() => router.push('/job-profile')}
                        />
                        <QuickAccessCard 
                            icon="add-circle" 
                            title="Create Community" 
                            subtitle="Set up your apartment" 
                            color="#3b82f6" 
                            bg="#eff6ff"
                            onPress={() => router.push('/create-community')}
                        />
                    </View>

                    {/* Features Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Features</Text>
                    </View>

                    <View style={styles.featuresList}>
                        <FeatureItem 
                            icon="person-add" 
                            title="Contacts" 
                            subtitle="Directory of community residents" 
                            color="#6366f1" 
                            bg="#eef2ff"
                            onPress={() => router.push('/contacts')}
                        />
                        <FeatureItem 
                            icon="document-text" 
                            title="Notes" 
                            subtitle="Keep your notes handy" 
                            color="#f59e0b" 
                            bg="#fffbeb"
                            onPress={() => {}}
                        />
                        <FeatureItem 
                            icon="scan" 
                            title="Scanner" 
                            subtitle="Scan documents on the go" 
                            color="#3b82f6" 
                            bg="#eff6ff"
                            onPress={() => {}}
                        />
                        <FeatureItem 
                            icon="folder-open" 
                            title="Documents" 
                            subtitle="Access important documents" 
                            color="#10b981" 
                            bg="#ecfdf5"
                            onPress={() => {}}
                        />
                        <FeatureItem 
                            icon="images" 
                            title="Gallery" 
                            subtitle="Community photos" 
                            color="#8b5cf6" 
                            bg="#f5f3ff"
                            onPress={() => router.push('/gallery')}
                        />
                        <FeatureItem 
                            icon="grid" 
                            title="More" 
                            subtitle="Explore more features" 
                            color="#64748b" 
                            bg="#f8fafc"
                            onPress={() => {}}
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <NavItem icon="home" label="Home" active />
                <NavItem icon="chatbubble-outline" label="Chat" onPress={() => router.push('/chat-list')} />
                <NavItem icon="people-outline" label="Contacts" onPress={() => router.push('/contacts')} />
                <NavItem icon="newspaper-outline" label="Blog" />
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
                    <View style={styles.navProfileCircle}>
                        <Ionicons name="person" size={20} color="#6366f1" />
                    </View>
                    <Text style={styles.navLabel}>Account</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

function QuickAccessCard({ icon, title, subtitle, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={[styles.qaCard, { backgroundColor: '#fff' }]} onPress={onPress}>
            <View style={[styles.qaIconContainer, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={32} color={color} />
            </View>
            <Text style={styles.qaTitle}>{title}</Text>
            <Text style={styles.qaSubtitle}>{subtitle}</Text>
        </TouchableOpacity>
    );
}

function FeatureItem({ icon, title, subtitle, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.featureItem} onPress={onPress}>
            <View style={[styles.featureIconContainer, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitleText}>{title}</Text>
                <Text style={styles.featureSubtitleText}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>
    );
}

function NavItem({ icon, label, active, onPress }: any) {
    return (
        <TouchableOpacity style={styles.navItem} onPress={onPress}>
            <Ionicons name={icon} size={24} color={active ? '#6366f1' : '#94a3b8'} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
            {active && <View style={styles.activeDot} />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    guestContent: { padding: 20, paddingTop: 60, paddingBottom: 60 },
    content: { padding: 20, paddingBottom: 100 },
    
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, marginTop: 10 },
    brandContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    logoCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' },
    brandName: { fontSize: 24, fontWeight: '800', color: '#6366f1' },
    brandTagline: { fontSize: 12, color: '#94a3b8', marginTop: -2 },
    
    announcementCard: { width: width * 0.45, backgroundColor: '#f5f3ff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#ddd6fe' },
    announcementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    announcementTitle: { fontSize: 13, fontWeight: '700', color: '#6366f1' },
    announcementDesc: { fontSize: 11, color: '#475569', lineHeight: 16 },
    viewAllRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    viewAllText: { fontSize: 12, fontWeight: '600', color: '#6366f1', marginRight: 4 },

    sectionHeader: { marginBottom: 16, marginTop: 8 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1e293b' },
    
    quickAccessGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    qaCard: { width: '48%', borderRadius: 24, padding: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' },
    qaIconContainer: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    qaTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
    qaSubtitle: { fontSize: 11, color: '#64748b', lineHeight: 14 },

    featuresList: { backgroundColor: '#fff', borderRadius: 24, padding: 10, borderWidth: 1, borderColor: '#f1f5f9' },
    featureItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0 },
    featureIconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    featureTextContainer: { flex: 1 },
    featureTitleText: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    featureSubtitleText: { fontSize: 11, color: '#64748b', marginTop: 2 },

    bottomNav: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: 80, 
        backgroundColor: '#fff', 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        alignItems: 'center', 
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 10
    },
    navItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
    navLabel: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
    navLabelActive: { color: '#6366f1' },
    activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#6366f1', marginTop: 2 },
    navProfileCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },

    heroSection: { marginBottom: 32 },
    brandTitle: { fontSize: 28, fontWeight: '800', color: '#4338ca', marginBottom: 4 },
    heroSub: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
    heroDesc: { fontSize: 14, color: '#64748b', lineHeight: 22 },
    heroImgPlaceholder: { height: 120, backgroundColor: '#fff', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    actionSection: { marginBottom: 32 },
    primaryBtn: { backgroundColor: '#4338ca', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    featuresInfoContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
    featureInfoBox: { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
    fIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    fIconText: { fontSize: 22 },
    fTitle: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
});
