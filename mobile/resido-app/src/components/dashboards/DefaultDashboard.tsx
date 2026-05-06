import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function DefaultDashboard() {
    const router = useRouter();
    const { user, workspaces } = useAuthStore();

    const isGuest = !user;

    if (isGuest) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.heroSection}>
                <Text style={styles.brandTitle}>Personal Workspace</Text>
                <Text style={styles.heroSub}>Welcome, {user.name || 'Resident'} 👋</Text>
                <Text style={styles.heroDesc}>You haven't joined any apartment communities yet. You can create your own or wait for an invite.</Text>
            </View>

            <View style={styles.personalActions}>
                <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-community')}>
                    <View style={styles.btnIconCont}><Text style={styles.btnIcon}>➕</Text></View>
                    <View>
                        <Text style={styles.btnTitle}>Create a Community</Text>
                        <Text style={styles.btnSub}>Set up your own apartment complex</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.joinBtn} onPress={() => router.push('/contacts')}>
                    <View style={[styles.btnIconCont, { backgroundColor: '#f0fdf4' }]}><Text style={styles.btnIcon}>📇</Text></View>
                    <View>
                        <Text style={styles.btnTitle}>Sync Contacts</Text>
                        <Text style={styles.btnSub}>See who among your friends is on Resido</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Global Features</Text>
            </View>
            <View style={styles.featuresGrid}>
                {[
                    { icon: '📇', label: 'Contacts', bg: '#e0e7ff', route: '/contacts' },
                    { icon: '💬', label: 'Global Chat', bg: '#f3e8ff', route: '/chat-list' },
                    { icon: '📅', label: 'Calendar', bg: '#fee2e2', route: '/calendar' },
                    { icon: '🛠️', label: 'Services', bg: '#fef3c7', route: '/service-search' },
                    { icon: '💼', label: 'Job Profile', bg: '#dcfce7', route: '/job-profile' },
                    { icon: '👤', label: 'Profile', bg: '#f1f5f9', route: '/profile' },
                ].map((f, i) => (
                    <TouchableOpacity key={i} style={styles.featureItem} onPress={() => router.push(f.route as any)}>
                        <View style={[styles.featureIconWrap, { backgroundColor: f.bg }]}><Text style={styles.featureIcon}>{f.icon}</Text></View>
                        <Text style={styles.featureLabel}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { padding: 20, paddingTop: 60, paddingBottom: 60 },
    heroSection: { marginBottom: 32 },
    brandTitle: { fontSize: 28, fontWeight: '800', color: '#4338ca', marginBottom: 4 },
    heroSub: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
    heroDesc: { fontSize: 14, color: '#64748b', lineHeight: 22 },
    heroImgPlaceholder: { height: 120, backgroundColor: '#fff', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    
    actionSection: { marginBottom: 32 },
    primaryBtn: { backgroundColor: '#4338ca', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    personalActions: { gap: 12, marginBottom: 32 },
    createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#bfdbfe' },
    joinBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#bbf7d0' },
    btnIconCont: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    btnIcon: { fontSize: 24 },
    btnTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    btnSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

    sectionHeader: { marginBottom: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    featureItem: { width: '30%', alignItems: 'center' },
    featureIconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    featureIcon: { fontSize: 24 },
    featureLabel: { fontSize: 12, color: '#475569', fontWeight: '600' },

    featuresInfoContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
    featureInfoBox: { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
    fIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    fIconText: { fontSize: 22 },
    fTitle: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
});
