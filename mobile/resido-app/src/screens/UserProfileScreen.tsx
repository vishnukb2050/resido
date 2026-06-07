import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar, ActivityIndicator, Alert, FlatList, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { authApi, threadApi, unpackFeedPage } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { resolveMediaUrl } from '../utils/mediaUrl';

type FollowStatus = 'SELF' | 'FOLLOWING' | 'REQUESTED' | 'NOT_FOLLOWING';

const VISIBILITY_LABEL: Record<string, string> = {
    GLOBAL: 'Open profile · Anyone can follow',
    CONTACTS: 'Contacts only · Approval required',
    COMMUNITY: 'Communities only · Approval required',
    FOLLOWERS: 'Followers only · Approval required',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabKey = 'POSTS' | 'BUSINESS';

export default function UserProfileScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const { user: me } = useAuthStore();

    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [tab, setTab] = useState<TabKey>('POSTS');

    const [threads, setThreads] = useState<any[]>([]);
    const [flares, setFlares] = useState<any[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [expandedFlare, setExpandedFlare] = useState<any | null>(null);

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

    // Threads + flares are gated server-side by both per-post visibility and
    // author profileVisibility. Empty results for a restricted profile is
    // expected and intentional — viewers without access never see posts.
    const fetchPosts = useCallback(async () => {
        if (!id) return;
        try {
            setPostsLoading(true);
            const [threadsRes, flaresRes] = await Promise.all([
                threadApi.getAuthorThreads(id as string).catch(() => ({ data: [] })),
                threadApi.getAuthorFlares(id as string).catch(() => ({ data: [] })),
            ]);
            setThreads(unpackFeedPage(threadsRes.data).items);
            setFlares(unpackFeedPage(flaresRes.data).items);
        } catch (err) {
            console.warn('Failed to load posts for profile', err);
        } finally {
            setPostsLoading(false);
        }
    }, [id]);

    useFocusEffect(useCallback(() => {
        fetchProfile();
        fetchPosts();
    }, [fetchProfile, fetchPosts]));

    const status: FollowStatus = profile?.followStatus || 'NOT_FOLLOWING';
    const isSelf = status === 'SELF';
    const isRestricted = profile?.isRestricted && !isSelf;

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
            await fetchPosts();
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
                            await fetchPosts();
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

    const photo = resolveMediaUrl(profile.profilePhoto) ||
        `https://i.pravatar.cc/150?u=${profile.id}`;
    const linkedBusinesses: any[] = Array.isArray(profile.linkedBusinessProfiles)
        ? profile.linkedBusinessProfiles
        : [];

    // The vertical `threads` list is the only unbounded list on this screen, so
    // it becomes the root FlatList. Everything else (hero, identity, bio,
    // contact, tabs, and the horizontal flares strip) rides in ListHeaderComponent
    // — a horizontal FlatList inside a vertical list header is allowed and avoids
    // the "VirtualizedLists should never be nested" warning we had before.
    const showThreadList = !isRestricted && tab === 'POSTS' && !postsLoading;
    const threadData = showThreadList ? threads : [];

    const renderThread = ({ item: t }: { item: any }) => (
        <View style={styles.threadItemWrap}>
            <ThreadCard
                thread={t}
                onPress={() => router.push({ pathname: '/thread-detail', params: { id: t.id } })}
            />
        </View>
    );

    const listHeader = (
        <>
                <View style={styles.heroHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.identityCard}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: photo }} style={styles.mainAvatar} />
                        {isRestricted ? (
                            <View style={styles.lockBadge}>
                                <Ionicons name="lock-closed" size={12} color="#fff" />
                            </View>
                        ) : null}
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

                    {profile.linkBusinessProfile ? (
                        <View style={styles.bizChip}>
                            <Ionicons name="briefcase" size={11} color="#f59e0b" style={{ marginRight: 4 }} />
                            <Text style={styles.bizChipText}>Linked business</Text>
                        </View>
                    ) : null}

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
                        {linkedBusinesses.length ? (
                            <>
                                <View style={styles.metricSeparator} />
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricValue}>{linkedBusinesses.length}</Text>
                                    <Text style={styles.metricLabel}>Business</Text>
                                </View>
                            </>
                        ) : null}
                    </View>
                </View>

                {/* Restricted preview — name + photo visible, nothing else.
                    Linked business profiles are still shown because the
                    business itself is a public artifact. */}
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
                            {linkedBusinesses.length ? (
                                <Text style={styles.restrictedBizNote}>
                                    Their business profile is still public — you can open it below.
                                </Text>
                            ) : null}
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
                        {linkedBusinesses.length ? (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Linked businesses</Text>
                                {linkedBusinesses.map((b) => (
                                    <BusinessCard key={b.id} biz={b} onOpen={() => router.push({ pathname: '/business-detail', params: { id: b.id } })} />
                                ))}
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

                        {(profile.instagram || profile.linkedin || profile.website) ? (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Links</Text>
                                {profile.instagram ? (
                                    <Row icon="logo-instagram" color="#E1306C" label="Instagram" value={profile.instagram} />
                                ) : null}
                                {profile.linkedin ? (
                                    <Row icon="logo-linkedin" color="#0077B5" label="LinkedIn" value={profile.linkedin} />
                                ) : null}
                                {profile.website ? (
                                    <Row icon="globe" color="#8b5cf6" label="Website" value={profile.website} />
                                ) : null}
                            </View>
                        ) : null}

                        {/* Tabs — Posts (threads+flares) vs Businesses */}
                        <View style={styles.tabsRow}>
                            <TouchableOpacity
                                style={[styles.tabBtn, tab === 'POSTS' && styles.tabBtnActive]}
                                onPress={() => setTab('POSTS')}
                            >
                                <Ionicons
                                    name="chatbubbles"
                                    size={14}
                                    color={tab === 'POSTS' ? '#8b5cf6' : '#7A6B9C'}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[styles.tabBtnText, tab === 'POSTS' && styles.tabBtnTextActive]}>
                                    Posts
                                </Text>
                            </TouchableOpacity>
                            {linkedBusinesses.length ? (
                                <TouchableOpacity
                                    style={[styles.tabBtn, tab === 'BUSINESS' && styles.tabBtnActive]}
                                    onPress={() => setTab('BUSINESS')}
                                >
                                    <Ionicons
                                        name="briefcase"
                                        size={14}
                                        color={tab === 'BUSINESS' ? '#f59e0b' : '#7A6B9C'}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[
                                        styles.tabBtnText,
                                        tab === 'BUSINESS' && { color: '#f59e0b' },
                                    ]}>
                                        Business ({linkedBusinesses.length})
                                    </Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {tab === 'BUSINESS' ? (
                            <View style={styles.section}>
                                {linkedBusinesses.map((b) => (
                                    <BusinessCard key={b.id} biz={b} onOpen={() => router.push({ pathname: '/business-detail', params: { id: b.id } })} />
                                ))}
                            </View>
                        ) : (
                            <View style={styles.section}>
                                {postsLoading ? (
                                    <ActivityIndicator color="#8b5cf6" style={{ marginTop: 12 }} />
                                ) : threads.length === 0 && flares.length === 0 ? (
                                    <View style={styles.emptyPosts}>
                                        <Ionicons name="leaf-outline" size={28} color="#C4B5DC" />
                                        <Text style={styles.emptyPostsText}>
                                            {isSelf ? 'You haven\'t posted anything yet.' : 'Nothing to show yet.'}
                                        </Text>
                                    </View>
                                ) : (
                                    <>
                                        {flares.length > 0 ? (
                                            <>
                                                <Text style={styles.subSection}>Flares</Text>
                                                <FlatList
                                                    data={flares}
                                                    keyExtractor={(it) => it.id}
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                    contentContainerStyle={{ paddingVertical: 4 }}
                                                    renderItem={({ item }) => {
                                                        const media = item.mediaUrl || item.media?.[0]?.url;
                                                        return (
                                                            <TouchableOpacity
                                                                style={styles.flareCard}
                                                                activeOpacity={0.85}
                                                                onPress={() => setExpandedFlare(item)}
                                                            >
                                                                {media ? (
                                                                    <Video
                                                                        source={{ uri: media }}
                                                                        style={styles.flareVideo}
                                                                        resizeMode={ResizeMode.COVER}
                                                                        shouldPlay
                                                                        isMuted
                                                                        isLooping
                                                                    />
                                                                ) : (
                                                                    <View style={[styles.flareVideo, { backgroundColor: '#1f2937', alignItems: 'center', justifyContent: 'center' }]}>
                                                                        <Ionicons name="flash" size={32} color="#a78bfa" />
                                                                    </View>
                                                                )}
                                                                <View style={styles.flarePlayBadge}>
                                                                    <Ionicons name="volume-mute" size={12} color="#fff" />
                                                                </View>
                                                                {item.content ? (
                                                                    <Text style={styles.flareCardText} numberOfLines={2}>
                                                                        {item.content}
                                                                    </Text>
                                                                ) : null}
                                                            </TouchableOpacity>
                                                        );
                                                    }}
                                                />
                                            </>
                                        ) : null}

                                        {threads.length > 0 ? (
                                            <Text style={[styles.subSection, { marginTop: 16 }]}>Threads</Text>
                                        ) : null}
                                    </>
                                )}
                            </View>
                        )}
                    </>
                )}
        </>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <FlatList
                data={threadData}
                keyExtractor={(t) => t.id}
                renderItem={renderThread}
                ListHeaderComponent={listHeader}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
                removeClippedSubviews
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={11}
            />

            {/* Full-screen flare player */}
            <Modal
                visible={!!expandedFlare}
                animationType="fade"
                transparent
                onRequestClose={() => setExpandedFlare(null)}
            >
                <View style={styles.flareModalBackdrop}>
                    <TouchableOpacity
                        style={styles.flareModalClose}
                        onPress={() => setExpandedFlare(null)}
                    >
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    {expandedFlare ? (
                        <Video
                            source={{ uri: expandedFlare.mediaUrl || expandedFlare.media?.[0]?.url }}
                            style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * (16 / 9) }}
                            resizeMode={ResizeMode.CONTAIN}
                            shouldPlay
                            isLooping
                            useNativeControls
                        />
                    ) : null}
                    {expandedFlare?.content ? (
                        <Text style={styles.flareModalCaption} numberOfLines={4}>
                            {expandedFlare.content}
                        </Text>
                    ) : null}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const ThreadCard = React.memo(function ThreadCard({ thread: t, onPress }: { thread: any; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.threadCard} activeOpacity={0.85} onPress={onPress}>
            {t.title ? (
                <Text style={styles.threadTitle} numberOfLines={2}>
                    {t.title}
                </Text>
            ) : null}
            {t.content ? (
                <Text style={styles.threadContent} numberOfLines={3}>
                    {t.content}
                </Text>
            ) : null}
            <View style={styles.threadMetaRow}>
                <View style={styles.threadVisChip}>
                    <Ionicons
                        name={t.visibility === 'PUBLIC' ? 'earth' : 'lock-closed'}
                        size={10}
                        color="#7A6B9C"
                    />
                    <Text style={styles.threadVisText}>{t.visibility || 'PUBLIC'}</Text>
                </View>
                <Text style={styles.threadDate}>
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''}
                </Text>
            </View>
        </TouchableOpacity>
    );
});

function BusinessCard({ biz, onOpen }: { biz: any; onOpen: () => void }) {
    const logo = resolveMediaUrl(biz.logo);
    return (
        <TouchableOpacity style={styles.bizCard} onPress={onOpen} activeOpacity={0.85}>
            <View style={styles.bizLogoWrap}>
                {logo ? (
                    <Image source={{ uri: logo }} style={styles.bizLogo} />
                ) : (
                    <Ionicons name="storefront" size={26} color="#f59e0b" />
                )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.bizName} numberOfLines={1}>{biz.businessName || 'Business'}</Text>
                    {biz.isVerified ? (
                        <Ionicons name="checkmark-circle" size={14} color="#1d4ed8" />
                    ) : null}
                </View>
                <Text style={styles.bizCat} numberOfLines={1}>{biz.category || 'Service'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                    {biz.area ? (
                        <View style={styles.bizMetaChip}>
                            <Ionicons name="location" size={10} color="#7A6B9C" />
                            <Text style={styles.bizMetaText} numberOfLines={1}>{biz.area}</Text>
                        </View>
                    ) : null}
                    {biz.hasSlots ? (
                        <View style={[styles.bizMetaChip, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                            <Ionicons name="calendar" size={10} color="#10b981" />
                            <Text style={[styles.bizMetaText, { color: '#10b981' }]}>Booking</Text>
                        </View>
                    ) : null}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C4B5DC" />
        </TouchableOpacity>
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
    heroHeader: { height: 220, backgroundColor: '#8b5cf6', paddingHorizontal: 20, paddingTop: 12 },
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
    lockBadge: {
        position: 'absolute', right: -4, bottom: -4,
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#8b5cf6',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: '#fff',
    },
    profileName: { fontSize: 22, fontWeight: '900', color: '#2D2445', marginTop: 12 },
    profileHandle: { fontSize: 13, color: '#8b5cf6', fontWeight: '700', marginTop: 2 },
    visibilityChip: {
        marginTop: 10, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F4EEFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
    },
    visibilityChipText: { fontSize: 10, fontWeight: '800', color: '#8b5cf6', letterSpacing: 0.3 },
    bizChip: {
        marginTop: 6, flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    },
    bizChipText: { fontSize: 10, fontWeight: '800', color: '#f59e0b', letterSpacing: 0.3 },

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
    restrictedSub: { fontSize: 13, color: '#7A6B9C', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
    restrictedBizNote: {
        fontSize: 12, color: '#f59e0b', fontWeight: '700',
        textAlign: 'center', marginBottom: 12,
    },

    section: { paddingHorizontal: 20, marginTop: 24 },
    threadItemWrap: { paddingHorizontal: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#2D2445', marginBottom: 12 },
    subSection: { fontSize: 13, fontWeight: '800', color: '#7A6B9C', marginBottom: 8, letterSpacing: 0.3 },
    bioText: { fontSize: 14, color: '#7A6B9C', lineHeight: 22 },
    row: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        padding: 14, borderRadius: 16, marginBottom: 10,
        borderWidth: 1, borderColor: '#EFE9F8',
    },
    rowIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 10, color: '#7A6B9C', fontWeight: '800', textTransform: 'uppercase' },
    rowValue: { fontSize: 14, color: '#2D2445', fontWeight: '600', marginTop: 2 },

    tabsRow: {
        flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 24,
    },
    tabBtn: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#EFE9F8',
    },
    tabBtnActive: {
        backgroundColor: '#F4EEFC', borderColor: '#D4C9E8',
    },
    tabBtnText: { fontSize: 13, fontWeight: '800', color: '#7A6B9C' },
    tabBtnTextActive: { color: '#8b5cf6' },

    emptyPosts: { alignItems: 'center', paddingVertical: 40 },
    emptyPostsText: { color: '#9A8EBA', fontSize: 13, fontWeight: '600', marginTop: 10 },

    bizCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 18, padding: 14,
        borderWidth: 1, borderColor: '#EFE9F8', marginBottom: 10,
    },
    bizLogoWrap: {
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    bizLogo: { width: '100%', height: '100%' },
    bizName: { fontSize: 15, fontWeight: '900', color: '#2D2445', flexShrink: 1 },
    bizCat: { fontSize: 12, color: '#7A6B9C', fontWeight: '600', marginTop: 2 },
    bizMetaChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
        backgroundColor: '#F4EEFC',
    },
    bizMetaText: { fontSize: 10, color: '#7A6B9C', fontWeight: '800' },

    flareCard: {
        width: 140, marginRight: 12, borderRadius: 18, overflow: 'hidden',
        backgroundColor: '#1f2937',
    },
    flareVideo: { width: '100%', height: 180 },
    flarePlayBadge: {
        position: 'absolute', top: 8, right: 8,
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center', justifyContent: 'center',
    },
    flareCardText: {
        position: 'absolute', bottom: 8, left: 8, right: 8,
        fontSize: 11, color: '#fff', fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
    },

    threadCard: {
        backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: '#EFE9F8',
    },
    threadTitle: { fontSize: 14, fontWeight: '900', color: '#2D2445' },
    threadContent: { fontSize: 13, color: '#7A6B9C', marginTop: 6, lineHeight: 19 },
    threadMetaRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 10,
    },
    threadVisChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#F4EEFC', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    },
    threadVisText: { fontSize: 10, color: '#7A6B9C', fontWeight: '800', letterSpacing: 0.3 },
    threadDate: { fontSize: 10, color: '#9A8EBA', fontWeight: '600' },

    flareModalBackdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
        alignItems: 'center', justifyContent: 'center',
    },
    flareModalClose: {
        position: 'absolute', top: 50, right: 20, zIndex: 10,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    flareModalCaption: {
        position: 'absolute', bottom: 60, left: 20, right: 20,
        color: '#fff', fontSize: 14, fontWeight: '700',
        textAlign: 'center', lineHeight: 20,
    },
});
