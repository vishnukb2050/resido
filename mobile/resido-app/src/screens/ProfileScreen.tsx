import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Image, SafeAreaView, ActivityIndicator, StatusBar,
    Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        posts: 24,
        connections: 128,
        groups: 8,
        saved: 15
    });

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/otp-login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                
                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>My Account</Text>
                        <Text style={styles.headerSub}>Manage your profile and app preferences</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.iconBtn}>
                            <Ionicons name="notifications" size={22} color="#fff" />
                            <View style={styles.notifBadge}><Text style={styles.notifText}>3</Text></View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.miniAvatar}>
                            <Image source={{ uri: user?.profilePhoto || "https://i.pravatar.cc/100?u=john" }} style={styles.avatarImg} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileTop}>
                        <View style={styles.avatarWrapper}>
                            <Image source={{ uri: user?.profilePhoto || "https://i.pravatar.cc/100?u=john" }} style={styles.largeAvatar} />
                            <TouchableOpacity style={styles.editAvatarBtn} onPress={() => router.push('/edit-profile')}>
                                <MaterialCommunityIcons name="pencil" size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.userName}>{user?.name || 'John Doe'}</Text>
                            <View style={styles.badgeRow}>
                                <View style={styles.residentBadge}>
                                    <Text style={styles.badgeText}>Greenwoods Resident</Text>
                                </View>
                            </View>
                            <Text style={styles.memberSince}>Member since Jan 2024</Text>
                        </View>
                        <TouchableOpacity style={styles.viewProfileBtn} onPress={() => router.push('/edit-profile')}>
                            <Ionicons name="person-outline" size={16} color="#fff" />
                            <Text style={styles.viewProfileText}>View Profile</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <StatItem icon="newspaper-outline" value={stats.posts} label="Posts" />
                        <StatItem icon="people-outline" value={stats.connections} label="Connections" />
                        <StatItem icon="chatbubbles-outline" value={stats.groups} label="Groups" />
                        <StatItem icon="bookmark-outline" value={stats.saved} label="Saved" />
                    </View>
                </View>

                {/* Menu Sections */}
                <MenuSection title="Profile & Settings">
                    <MenuItem 
                        icon="person-outline" 
                        label="Edit Profile" 
                        sublabel="Update your personal information" 
                        onPress={() => router.push('/edit-profile')} 
                    />
                    <MenuItem 
                        icon="settings-outline" 
                        label="Account Settings" 
                        sublabel="Privacy, notifications & security" 
                    />
                    <MenuItem 
                        icon="link-outline" 
                        label="Linked Accounts" 
                        sublabel="Connect Instagram & LinkedIn" 
                    />
                    <MenuItem 
                        icon="options-outline" 
                        label="Preferences" 
                        sublabel="Customize your app experience" 
                    />
                </MenuSection>

                <MenuSection title="Community & Social">
                    <MenuItem 
                        icon="chatbubble-ellipses-outline" 
                        label="My Posts & Activity" 
                        sublabel="View your posts, comments & likes" 
                    />
                    <MenuItem 
                        icon="people-outline" 
                        label="My Connections" 
                        sublabel="Manage your connections" 
                    />
                    <MenuItem 
                        icon="grid-outline" 
                        label="Groups & Communities" 
                        sublabel="Your joined groups" 
                    />
                    <MenuItem 
                        icon="calendar-outline" 
                        label="Events" 
                        sublabel="Upcoming events & RSVPs" 
                    />
                </MenuSection>

                <MenuSection title="Support & More">
                    <MenuItem 
                        icon="help-circle-outline" 
                        label="Help Center" 
                        sublabel="FAQs and support articles" 
                    />
                    <MenuItem 
                        icon="gift-outline" 
                        label="Refer & Earn" 
                        sublabel="Invite friends & earn rewards" 
                    />
                    <MenuItem 
                        icon="information-circle-outline" 
                        label="About Resido" 
                        sublabel="App version and information" 
                    />
                    <MenuItem 
                        icon="log-out-outline" 
                        label="Logout" 
                        sublabel="Sign out from your account" 
                        labelColor="#ef4444"
                        onPress={handleLogout}
                    />
                </MenuSection>

                {/* Rate App Card */}
                <View style={styles.rateCard}>
                    <View style={styles.rateIconBox}>
                        <MaterialCommunityIcons name="office-building" size={24} color="#1e293b" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.rateTitle}>Love Resido?</Text>
                        <Text style={styles.rateSub}>Rate us on the Play Store</Text>
                    </View>
                    <TouchableOpacity style={styles.rateBtn}>
                        <Ionicons name="star" size={14} color="#fff" />
                        <Text style={styles.rateBtnText}>Rate Now</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
            <BottomNav activeTab="Account" />
        </SafeAreaView>
    );
}

const StatItem = ({ icon, value, label }: any) => (
    <View style={styles.statItem}>
        <View style={styles.statTop}>
            <Ionicons name={icon} size={18} color="#6366f1" />
            <Text style={styles.statValue}>{value}</Text>
        </View>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const MenuSection = ({ title, children }: any) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.menuCard}>{children}</View>
    </View>
);

const MenuItem = ({ icon, label, sublabel, onPress, labelColor = "#fff" }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuIconBox}>
            <Ionicons name={icon} size={22} color="#fff" />
        </View>
        <View style={styles.menuContent}>
            <Text style={[styles.menuLabel, { color: labelColor }]}>{label}</Text>
            {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={18} color="#475569" />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    notifBadge: { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#0f172a' },
    notifText: { color: '#fff', fontSize: 9, fontWeight: '900' },
    miniAvatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    avatarImg: { width: '100%', height: '100%' },

    profileCard: { margin: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 32, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    profileTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    avatarWrapper: { position: 'relative' },
    largeAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#6366f1' },
    editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1e293b' },
    profileInfo: { flex: 1, marginLeft: 16 },
    userName: { fontSize: 20, fontWeight: '900', color: '#fff' },
    badgeRow: { marginTop: 6 },
    residentBadge: { backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
    badgeText: { color: '#6366f1', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    memberSince: { fontSize: 12, color: '#64748b', marginTop: 6, fontWeight: '600' },
    viewProfileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, gap: 6 },
    viewProfileText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 12 },
    statItem: { flex: 1, alignItems: 'center' },
    statTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statValue: { fontSize: 16, fontWeight: '800', color: '#fff' },
    statLabel: { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '700' },

    section: { paddingHorizontal: 20, marginTop: 32 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 16 },
    menuCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
    menuIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    menuContent: { flex: 1, marginLeft: 16 },
    menuLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
    menuSublabel: { fontSize: 12, color: '#64748b', marginTop: 4 },

    rateCard: { margin: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 24 },
    rateIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    rateTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    rateSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
    rateBtn: { backgroundColor: '#1e293b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
    rateBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' }
});
