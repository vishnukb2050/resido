import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function MemberProfileScreen() {
    const { userId, name, profileName, profilePhoto, phone } = useLocalSearchParams<{
        userId: string;
        name: string;
        profileName?: string;
        profilePhoto?: string;
        phone?: string;
    }>();
    const router = useRouter();
    const { user: currentUser } = useAuthStore();
    
    const [isFollowing, setIsFollowing] = useState(false);
    const [stats, setStats] = useState({ followersCount: 0, followingCount: 0 });
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        fetchProfileData();
    }, [userId]);

    const fetchProfileData = async () => {
        try {
            const [statsRes, followingRes] = await Promise.all([
                api.get(`/follow/stats/${userId}`),
                api.get(`/follow/following/${currentUser?.id}`)
            ]);
            
            setStats(statsRes.data);
            
            // Check if current user is following this user
            const followingList = followingRes.data;
            setIsFollowing(followingList.some((f: any) => f.followingId === userId));
        } catch (error) {
            console.error('Failed to fetch profile data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async () => {
        setFollowLoading(true);
        try {
            if (isFollowing) {
                await api.delete(`/follow/${userId}`);
                setStats(prev => ({ ...prev, followersCount: prev.followersCount - 1 }));
            } else {
                await api.post(`/follow/${userId}`);
                setStats(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
            }
            setIsFollowing(!isFollowing);
        } catch (error) {
            Alert.alert('Error', 'Failed to update follow status');
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.profileCard}>
                <View style={styles.avatarLarge}>
                    {profilePhoto ? (
                        <Image source={{ uri: profilePhoto }} style={styles.photo} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Text style={styles.placeholderText}>{(profileName || name)?.[0]}</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.name}>{name}</Text>
                {profileName && <Text style={styles.alias}>@{profileName}</Text>}
                
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>{stats.followersCount}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>{stats.followingCount}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                </View>

                {currentUser?.id !== userId && (
                    <TouchableOpacity 
                        style={[styles.followBtn, isFollowing && styles.unfollowBtn]} 
                        onPress={handleFollowToggle}
                        disabled={followLoading}
                    >
                        {followLoading ? (
                            <ActivityIndicator size="small" color={isFollowing ? '#1e293b' : '#fff'} />
                        ) : (
                            <Text style={[styles.followBtnText, isFollowing && styles.unfollowBtnText]}>
                                {isFollowing ? 'Unfollow' : 'Follow'}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.infoCard}>
                    <InfoRow icon="call-outline" label="Phone" value={phone || 'Hidden'} />
                    <View style={styles.separator} />
                    <InfoRow icon="business-outline" label="Community" value="Resident" />
                </View>
            </View>
        </SafeAreaView>
    );
}

function InfoRow({ icon, label, value }: any) {
    return (
        <View style={styles.infoRow}>
            <Ionicons name={icon} size={20} color="#64748b" style={{ marginRight: 12 }} />
            <View>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 15, backgroundColor: '#fff' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    
    profileCard: { backgroundColor: '#fff', alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 15, elevation: 2 },
    avatarLarge: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', backgroundColor: '#eff6ff', marginBottom: 15, borderWidth: 3, borderColor: '#fff', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    photo: { width: '100%', height: '100%' },
    placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    placeholderText: { fontSize: 40, fontWeight: '800', color: '#3b82f6' },
    name: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
    alias: { fontSize: 14, color: '#1d4ed8', fontWeight: '700', marginTop: 4 },
    
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 25, width: '100%', justifyContent: 'center' },
    statItem: { alignItems: 'center', flex: 1 },
    statNum: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    statLabel: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
    divider: { width: 1, height: 25, backgroundColor: '#f1f5f9', marginHorizontal: 15 },
    
    followBtn: { marginTop: 25, width: '60%', height: 50, borderRadius: 25, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    unfollowBtn: { backgroundColor: '#f1f5f9', shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: '#e2e8f0' },
    followBtnText: { color: '#2D2445', fontSize: 16, fontWeight: '800' },
    unfollowBtnText: { color: '#1e293b' },

    infoSection: { padding: 25 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 15 },
    infoCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    infoLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' },
    infoValue: { fontSize: 15, color: '#1e293b', fontWeight: '600', marginTop: 2 },
    separator: { height: 1, backgroundColor: '#f8fafc', marginVertical: 15 },
});
