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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Profile Hero Header */}
                <View style={styles.heroHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.settingsBtn} 
                        onPress={() => router.push('/edit-profile')}
                    >
                        <Ionicons name="settings-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Profile Identity Card */}
                <View style={styles.identityCard}>
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: user?.profilePhoto || "https://i.pravatar.cc/150?u=" + user?.id }} 
                            style={styles.mainAvatar} 
                        />
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={20} color="#4c1d95" />
                        </View>
                    </View>
                    
                    <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                    <Text style={styles.profileHandle}>@{user?.profileName || 'username'}</Text>
                    
                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => router.push('/edit-profile')}>
                        <Text style={styles.editProfileBtnText}>Edit Profile</Text>
                    </TouchableOpacity>

                    <View style={styles.metricsRow}>
                        <MetricItem value="3" label="Communities" />
                        <View style={styles.metricSeparator} />
                        <MetricItem value="128" label="Connections" />
                        <View style={styles.metricSeparator} />
                        <MetricItem value="15" label="Posts" />
                    </View>
                </View>

                {/* Info Sections */}
                <View style={styles.infoSection}>
                    <SectionHeader title="Bio" icon="information-circle-outline" />
                    <Text style={styles.bioContent}>
                        {user?.description || 'No bio provided yet. Add a bio to tell the community more about yourself.'}
                    </Text>
                </View>

                <View style={styles.infoSection}>
                    <SectionHeader title="Contact Details" icon="call-outline" />
                    <ContactCard icon="mail" label="Email" value={user?.email || 'Not provided'} color="#4c1d95" />
                    <ContactCard icon="call" label="Phone" value={user?.phone || 'Not provided'} color="#10b981" />
                    <ContactCard icon="location" label="Home" value={user?.location || 'Not provided'} color="#f59e0b" />
                </View>

                <View style={styles.infoSection}>
                    <SectionHeader title="Social Presence" icon="share-social-outline" />
                    <View style={styles.socialGrid}>
                        <SocialBubble icon="logo-instagram" color="#E1306C" label="Instagram" isPresent={!!user?.instagram} />
                        <SocialBubble icon="logo-linkedin" color="#0077B5" label="LinkedIn" isPresent={!!user?.linkedin} />
                        <SocialBubble icon="globe-outline" color="#4c1d95" label="Website" isPresent={!!user?.website} />
                    </View>
                </View>
            </ScrollView>

            <BottomNav activeTab="Account" />
        </SafeAreaView>
    );
}

function MetricItem({ value, label }: any) {
    return (
        <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    );
}

function SectionHeader({ title, icon }: any) {
    return (
        <View style={styles.sectionHeader}>
            <Ionicons name={icon} size={20} color="#4c1d95" />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );
}

function ContactCard({ icon, label, value, color }: any) {
    return (
        <View style={styles.contactCard}>
            <View style={[styles.contactIconBox, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon as any} size={20} color={color} />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.contactLabel}>{label}</Text>
                <Text style={styles.contactValue}>{value}</Text>
            </View>
        </View>
    );
}

function SocialBubble({ icon, color, label, isPresent }: any) {
    return (
        <View style={[styles.socialBubble, !isPresent && { opacity: 0.3 }]}>
            <View style={[styles.socialIconCircle, { backgroundColor: color }]}>
                <Ionicons name={icon} size={24} color="#fff" />
            </View>
            <Text style={styles.socialBubbleLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#23272a' },
    heroHeader: { height: 240, backgroundColor: '#4c1d95', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    settingsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    
    identityCard: { backgroundColor: '#1e293b', marginHorizontal: 20, marginTop: -100, borderRadius: 32, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    avatarContainer: { width: 110, height: 110, borderRadius: 55, padding: 4, backgroundColor: '#1e293b', marginTop: -80 },
    mainAvatar: { width: '100%', height: '100%', borderRadius: 55, borderWidth: 4, borderColor: '#4c1d95' },
    verifiedBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#fff', borderRadius: 12 },
    
    profileName: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 15 },
    profileHandle: { fontSize: 14, color: '#4c1d95', fontWeight: '700', marginTop: 4 },
    
    editProfileBtn: { backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 20, marginTop: 20, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
    editProfileBtnText: { color: '#4c1d95', fontWeight: '800', fontSize: 14 },
    
    metricsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 30, width: '100%', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 20 },
    metricItem: { flex: 1, alignItems: 'center' },
    metricValue: { fontSize: 18, fontWeight: '900', color: '#fff' },
    metricLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
    metricSeparator: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.05)' },
    
    infoSection: { paddingHorizontal: 20, marginTop: 35 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
    bioContent: { fontSize: 15, color: '#94a3b8', lineHeight: 24 },
    
    contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    contactIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    contactLabel: { fontSize: 11, color: '#64748b', fontWeight: '800', textTransform: 'uppercase' },
    contactValue: { fontSize: 15, color: '#fff', fontWeight: '600', marginTop: 2 },
    
    socialGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    socialBubble: { alignItems: 'center', gap: 8 },
    socialIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    socialBubbleLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' }
});
