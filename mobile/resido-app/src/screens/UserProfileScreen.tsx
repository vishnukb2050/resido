import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView,
    ScrollView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { resolveMediaUrl } from '../utils/mediaUrl';

type FollowStatus = 'SELF' | 'FOLLOWING' | 'REQUESTED' | 'NOT_FOLLOWING';

const VISIBILITY_LABEL: Record<string, string> = {
    GLOBAL: 'Open profile · Anyone can follow',
    CONTACTS: 'Contacts only · Approval required',
    COMMUNITY: 'Communities only · Approval required',
    FOLLOWERS: 'Followers only · Approval required',
};

export default function UserProfileScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const { user: me } = useAuthStore();

    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchProfile = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const { data } = await authApi.getPublicProfile(id as string);
            setProfile(data);
        } catch (err) {
            console.error('Failed to load profile:', err);
            Alert.alert('Not found', 'This profile is unavailable.');
            router.back();
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

    const status: FollowStatus = profile?.followStatus || 'NOT_FOLLOWING';

    const handleFollow = async () => {
        if (!profile || actionLoading) return;
        try {
            setActionLoading(true);
            const { data } = await authApi.follow(profile.id);
            const newStatus = data?.status as FollowStatus;
            if (newStatus === 'REQUESTED') {
                Alert.alert(
                    'Request sent',
                    'Your follow request has been sent. They\'ll see your details once approved.',
                );
            }
            await fetchProfile();
        } catch (err: any) {
            console.error('Follow failed:', err);
            Alert.alert('Error', err?.response?.data?.message || 'Could not send follow request.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnfollow = async () => {
        if (!profile || actionLoading) return;
        Alert.alert(
            status === 'REQUESTED' ? 'Cancel request?' : 'Unfollow?',
            status === 'REQUESTED'
                ? 'Cancel your pending follow request?'
                : `Stop following ${profile.name || 'this user'}?`,
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: status === 'REQUESTED' ? 'Cancel request' : 'Unfollow',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setActionLoading(true);
                            await authApi.unfollow(profile.id);
                            await fetchProfile();
                        } catch (err: any) {
                            Alert.alert('Error', err?.response?.data?.message || 'Could not unfollow.');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ],
        );
    };

    if (loading || !profile) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
        );
    }

    const isSelf = status === 'SELF';
    const isRestricted = profile.isRestricted && !isSelf;
    const photo = resolveMediaUrl(profile.profilePhoto) ||
        `https://i.pravatar.cc/150?u=${profile.id}`;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
                <View style={styles.heroHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.identityCard}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: photo }} style={styles.mainAvatar} />
                    </View>

                    <Text style={styles.profileName}>{profile.name || 'User'}</Text>
                    {profile.profileName ? (
                        <Text style={styles.profileHandle}>@{profile.profileName}</Text>
                    ) : null}

                    {/* Visibility chip */}
                    <View style={styles.visibilityChip}>
                        <Ionicons
                            name={profile.profileVisibility === 'GLOBAL' ? 'earth' : 'lock-closed'}
                            size={12}
                            color="#8b5cf6"
                            style={{ marginRight: 4 }}
                        />
                        <Text style={styles.visibilityChipText}>
                            {VISIBILITY_LABEL[profile.profileVisibility] || VISIBILITY_LABEL.GLOBAL}
                        </Text>
                    </View>

                    {!isSelf ? (
                        <View style={styles.actionRow}>
                            {status === 'NOT_FOLLOWING' && (
                                <TouchableOpacity
                                    style={[styles.primaryBtn, actionLoading && { opacity: 0.6 }]}
                                    onPress={handleFollow}
                                    disabled={actionLoading}
                                >
                                    <Ionicons name="person-add" size={16} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.primaryBtnText}>
                                        {profile.profileVisibility === 'GLOBAL' ? 'Follow' : 'Request to follow'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {status === 'REQUESTED' && (
                                <TouchableOpacity
                                    style={[styles.secondaryBtn, actionLoading && { opacity: 0.6 }]}
                                    onPress={handleUnfollow}
                                    disabled={actionLoading}
                                >
                                    <Ionicons name="time" size={16} color="#8b5cf6" style={{ marginRight: 6 }} />
                                    <Text style={styles.secondaryBtnText}>Requested · Cancel</Text>
                                </TouchableOpacity>
                            )}
                            {status === 'FOLLOWING' && (
                                <TouchableOpacity
                                    style={[styles.secondaryBtn, actionLoading && { opacity: 0.6 }]}
                                    onPress={handleUnfollow}
                                    disabled={actionLoading}
                                >
                                    <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{ marginRight: 6 }} />
                                    <Text style={[styles.secondaryBtnText, { color: '#10b981' }]}>Following</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : null}

                    <View style={styles.metricsRow}>
                        <TouchableOpacity
                            style={styles.metricItem}
                            onPress={() => router.push({ pathname: '/follow-list', params: { userId: profile.id, tab: 'followers' } })}
                        >
                            <Text style={styles.metricValue}>{profile.followersCount ?? 0}</Text>
                            <Text style={styles.metricLabel}>Followers</Text>
                        </TouchableOpacity>
                        <View style={styles.metricSeparator} />
                        <TouchableOpacity
                            style={styles.metricItem}
                            onPress={() => router.push({ pathname: '/follow-list', params: { userId: profile.id, tab: 'following' } })}
                        >
                            <Text style={styles.metricValue}>{profile.followingCount ?? 0}</Text>
                            <Text style={styles.metricLabel}>Following</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Restricted preview — name + photo visible, nothing else. */}
                {isRestricted ? (
                    <>
                        <View style={styles.restrictedCard}>
                            <Ionicons name="lock-closed" size={28} color="#8b5cf6" style={{ marginBottom: 10 }} />
                            <Text style={styles.restrictedTitle}>This profile is private</Text>
                            <Text style={styles.restrictedSub}>
                                {profile.profileVisibility === 'CONTACTS'
                                    ? 'Bio, contact details, threads and flares are only visible to their contacts.'
                                    : profile.profileVisibility === 'FOLLOWERS'
                                    ? 'Send a follow request to see their full profile and posts.'
                                    : 'They share details only with their communities.'}
                            </Text>
                            {status !== 'REQUESTED' && status !== 'FOLLOWING' ? (
                                <TouchableOpacity style={styles.primaryBtn} onPress={handleFollow} disabled={actionLoading}>
                                    <Ionicons name="person-add" size={16} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.primaryBtnText}>Send follow request</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                        {/* Phone has its own visibility — show it even on a restricted profile when permitted. */}
                        {profile.phone ? (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Contact</Text>
                                <Row icon="call" color="#10b981" label="Phone" value={profile.phone} />
                            </View>
                        ) : null}
                    </>
                ) : (
                    <>
                        {profile.description ? (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>About</Text>
                                <Text style={styles.bioText}>{profile.description}</Text>
                            </View>
                        ) : null}

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Contact</Text>
                            {profile.email ? (
                                <Row icon="mail" color="#8b5cf6" label="Email" value={profile.email} />
                            ) : null}
                            {profile.phone ? (
                                <Row icon="call" color="#10b981" label="Phone" value={profile.phone} />
                            ) : null}
                            {profile.location ? (
                                <Row icon="location" color="#f59e0b" label="Location" value={profile.location} />
                            ) : null}
                            {!profile.email && !profile.phone && !profile.location ? (
                                <Text style={{ color: '#7A6B9C', fontSize: 13 }}>No contact details shared.</Text>
                            ) : null}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function Row({ icon, color, label, value }: any) {
    return (
        <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Text style={styles.rowValue}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    heroHeader: { height: 220, backgroundColor: '#8b5cf6', paddingHorizontal: 20, paddingTop: 50 },
    iconBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center',
    },
    identityCard: {
        backgroundColor: '#fff', marginHorizontal: 20, marginTop: -110,
        borderRadius: 28, padding: 24, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15, shadowRadius: 18, elevation: 8,
    },
    avatarContainer: { width: 110, height: 110, borderRadius: 55, padding: 4, marginTop: -80 },
    mainAvatar: { width: '100%', height: '100%', borderRadius: 55, borderWidth: 4, borderColor: '#8b5cf6', backgroundColor: '#E8E2F2' },
    profileName: { fontSize: 22, fontWeight: '900', color: '#2D2445', marginTop: 12 },
    profileHandle: { fontSize: 13, color: '#8b5cf6', fontWeight: '700', marginTop: 2 },
    visibilityChip: {
        marginTop: 10, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F4EEFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
    },
    visibilityChipText: { fontSize: 10, fontWeight: '800', color: '#8b5cf6', letterSpacing: 0.3 },

    actionRow: { flexDirection: 'row', marginTop: 18, gap: 10 },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#8b5cf6', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16,
    },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    secondaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F4EEFC', paddingHorizontal: 22, paddingVertical: 12,
        borderRadius: 16, borderWidth: 1, borderColor: '#D4C9E8',
    },
    secondaryBtnText: { color: '#8b5cf6', fontWeight: '800', fontSize: 14 },

    metricsRow: {
        flexDirection: 'row', alignItems: 'center', marginTop: 22,
        width: '100%', borderTopWidth: 1, borderTopColor: '#EFE9F8', paddingTop: 16,
    },
    metricItem: { flex: 1, alignItems: 'center' },
    metricValue: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    metricLabel: { fontSize: 10, color: '#7A6B9C', fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
    metricSeparator: { width: 1, height: 28, backgroundColor: '#F4EEFC' },

    restrictedCard: {
        backgroundColor: '#fff', marginHorizontal: 20, marginTop: 20, borderRadius: 20,
        padding: 24, alignItems: 'center',
        borderWidth: 1, borderColor: '#EFE9F8',
    },
    restrictedTitle: { fontSize: 16, fontWeight: '900', color: '#2D2445', marginBottom: 6 },
    restrictedSub: { fontSize: 13, color: '#7A6B9C', textAlign: 'center', lineHeight: 20, marginBottom: 16 },

    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#2D2445', marginBottom: 12 },
    bioText: { fontSize: 14, color: '#7A6B9C', lineHeight: 22 },
    row: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        padding: 14, borderRadius: 16, marginBottom: 10,
        borderWidth: 1, borderColor: '#EFE9F8',
    },
    rowIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 10, color: '#7A6B9C', fontWeight: '800', textTransform: 'uppercase' },
    rowValue: { fontSize: 14, color: '#2D2445', fontWeight: '600', marginTop: 2 },
});
