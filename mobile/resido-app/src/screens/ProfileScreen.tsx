import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const router = useRouter();
    const { user } = useAuthStore();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Header Background */}
                <View style={styles.headerBg}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.editBtnTop} 
                        onPress={() => router.push('/edit-profile')}
                    >
                        <Ionicons name="create-outline" size={20} color="#fff" />
                        <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                </View>

                {/* Profile Info Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarWrapper}>
                        <Image 
                            source={{ uri: user?.profilePhoto || "https://i.pravatar.cc/150?u=" + user?.id }} 
                            style={styles.avatar} 
                        />
                        <View style={styles.onlineBadge} />
                    </View>

                    <Text style={styles.userName}>{user?.name || 'User'}</Text>
                    <Text style={styles.userHandle}>@{user?.profileName || 'username'}</Text>

                    <View style={styles.statsRow}>
                        <StatItem label="Communities" count="3" />
                        <View style={styles.statDivider} />
                        <StatItem label="Connections" count="128" />
                        <View style={styles.statDivider} />
                        <StatItem label="Contributions" count="15" />
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.bioText}>
                        {user?.description || 'No bio provided yet. Add a bio to tell the community more about yourself.'}
                    </Text>
                </View>

                {/* Contact Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                    <InfoRow icon="mail-outline" label="Email" value={user?.email || 'Not provided'} color="#6366f1" />
                    <InfoRow icon="call-outline" label="Phone" value={user?.phone || 'Not provided'} color="#10b981" />
                    <InfoRow icon="location-outline" label="Location" value={user?.location || 'Not provided'} color="#f59e0b" />
                </View>

                {/* Social Links */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Social Links</Text>
                    {user?.instagram ? <InfoRow icon="logo-instagram" label="Instagram" value={`@${user.instagram}`} color="#E1306C" /> : null}
                    {user?.linkedin ? <InfoRow icon="logo-linkedin" label="LinkedIn" value="View Profile" color="#0077B5" /> : null}
                    {user?.website ? <InfoRow icon="globe-outline" label="Website" value={user.website} color="#6366f1" /> : null}
                    {!user?.instagram && !user?.linkedin && !user?.website && (
                        <Text style={styles.emptyText}>No social links added yet.</Text>
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            <BottomNav activeTab="Account" />
        </SafeAreaView>
    );
}

function StatItem({ label, count }: any) {
    return (
        <View style={styles.statItem}>
            <Text style={styles.statCount}>{count}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function InfoRow({ icon, label, value, color }: any) {
    return (
        <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    headerBg: { height: 160, backgroundColor: '#1e293b', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    editBtnTop: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6366f1', paddingHorizontal: 15, height: 40, borderRadius: 20, gap: 8 },
    editBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    
    profileSection: { alignItems: 'center', marginTop: -60, paddingHorizontal: 20 },
    avatarWrapper: { width: 120, height: 120, borderRadius: 60, padding: 4, backgroundColor: '#0f172a' },
    avatar: { width: '100%', height: '100%', borderRadius: 60, borderWidth: 3, borderColor: '#6366f1' },
    onlineBadge: { position: 'absolute', bottom: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#10b981', borderWidth: 3, borderColor: '#0f172a' },
    
    userName: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 15 },
    userHandle: { fontSize: 14, color: '#6366f1', fontWeight: '700', marginTop: 4 },
    
    statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginTop: 25, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statItem: { flex: 1, alignItems: 'center' },
    statCount: { fontSize: 18, fontWeight: '900', color: '#fff' },
    statLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
    
    section: { paddingHorizontal: 20, marginTop: 30 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 15 },
    bioText: { fontSize: 14, color: '#94a3b8', lineHeight: 22 },
    
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    infoIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    infoContent: { marginLeft: 15, flex: 1 },
    infoLabel: { fontSize: 11, color: '#64748b', fontWeight: '800', textTransform: 'uppercase' },
    infoValue: { fontSize: 15, color: '#fff', fontWeight: '600', marginTop: 2 },
    emptyText: { color: '#475569', fontSize: 14, fontStyle: 'italic' }
});
