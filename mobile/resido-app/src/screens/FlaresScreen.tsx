import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Image, ScrollView, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import AppImage from '../components/AppImage';
import { getFeedSnapshot, setFeedSnapshot } from '../services/feedSnapshotCache';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { threadApi, authApi, unpackFeedPage } from '../services/api';
import BottomNav from '../components/BottomNav';
import PostSearchOverlay from '../components/PostSearchOverlay';
import { resolveMediaUrl } from '../utils/mediaUrl';
import { setFlareFeedCache } from '../services/feedCache';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

const TABS = [
    { id: 'foryou', label: 'For You', icon: 'sparkles' },
    { id: 'following', label: 'Following', icon: 'account-outline' },
    { id: 'public', label: 'Public', icon: 'earth' },
    { id: 'myflares', label: 'My Flares', icon: 'play-box-outline' },
    { id: 'saved', label: 'Saved', icon: 'bookmark-outline' },
    { id: 'reshared', label: 'Reshared', icon: 'repeat' },
];

type FlareGridItem = {
    id: string;
    author: string;
    title: string;
    likes: number;
    liked: boolean;
    mediaStatus: string;
    image: string;
};

// Memoized grid cell so unrelated parent state (search toggle, refresh flag,
// tab UI) doesn't re-render every visible tile. Only re-renders when its own
// item identity or the stable callbacks change.
const FlareGridCard = React.memo(function FlareGridCard({
    item,
    onOpen,
    onLike,
}: {
    item: FlareGridItem;
    onOpen: (id: string) => void;
    onLike: (id: string) => void;
}) {
    return (
        <TouchableOpacity style={styles.feedCard} onPress={() => onOpen(item.id)}>
            <AppImage uri={item.image} style={styles.feedImage} />
            {item.mediaStatus === 'PROCESSING' && (
                <View style={styles.processingBadge}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.processingText}>Processing</Text>
                </View>
            )}
            <View style={styles.feedGradient} />
            <View style={styles.playIconOverlay}>
                <Ionicons name="play" size={16} color="#fff" />
            </View>
            <View style={styles.feedOverlay}>
                <View style={styles.feedBottomInfo}>
                    <Text style={styles.feedAuthor}>@{item.author}</Text>
                    <Text style={styles.feedTitle} numberOfLines={1}>{item.title}</Text>
                </View>
                <TouchableOpacity style={styles.likesContainer} onPress={() => onLike(item.id)}>
                    <Ionicons
                        name={item.liked ? 'heart' : 'heart-outline'}
                        size={18}
                        color={item.liked ? '#ff3b30' : '#fff'}
                    />
                    <Text style={styles.likesText}>{item.likes}</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
});

export default function FlaresScreen() {
    const [followingIds, setFollowingIds] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('foryou');
    const [flares, setFlares] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // Search overlay + hashtag pinning, mirrors ThreadScreen. While
    // `activeHashtag` is set we ignore the tab selector and render the
    // cross-tenant FLARE hashtag feed.
    const [searchOpen, setSearchOpen] = useState(false);
    const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    // For You merges two feeds; each keeps its own cursor for infinite scroll.
    const [forYouCursors, setForYouCursors] = useState<{
        following: string | null;
        public: string | null;
        followingHasMore: boolean;
        publicHasMore: boolean;
    }>({ following: null, public: null, followingHasMore: false, publicHasMore: false });
    const { refresh } = useLocalSearchParams();
    const router = useRouter();

    useEffect(() => {
        fetchInitialData();
    }, [activeTab, refresh, activeHashtag]);

    // Identifies the current feed slice for snapshot caching (instant revisits).
    const feedKey = useMemo(
        () => (activeHashtag ? `flare:hashtag:${activeHashtag}` : `flare:${activeTab}`),
        [activeHashtag, activeTab],
    );

    // Persist the loaded grid so returning to Flares restores it instantly.
    useEffect(() => {
        if (!loading && flares.length > 0) {
            setFeedSnapshot(feedKey, { flares, nextCursor, hasMore, forYouCursors });
        }
    }, [flares, nextCursor, hasMore, forYouCursors, feedKey, loading]);

    // Warm the (expo-image) disk cache for the first screenful of thumbnails so
    // grid tiles and the player's poster frame render instantly. We cap the set
    // instead of prefetching the entire feed on every update to avoid a request
    // storm and wasted bandwidth on items the user may never scroll to.
    useEffect(() => {
        const uris = flares
            .slice(0, 12)
            .map((f: any) =>
                resolveMediaUrl(f.thumbnailUrl || f.posterUrl || f.previewUrl || f.mediaUrls?.[0]),
            )
            .filter((u): u is string => !!u);
        if (uris.length) ExpoImage.prefetch(uris).catch(() => undefined);
    }, [flares]);

    // The full-screen player normally re-fetches the feed on open. We hand it
    // the list we already have (keyed by feed type) so it can start playing
    // immediately, then it refreshes in the background.
    const playerFeedType = activeHashtag
        ? 'PUBLIC'
        : activeTab === 'myflares'
        ? 'MY'
        : (activeTab.toUpperCase() as string);

    const openFlare = useCallback((id: string) => {
        setFlareFeedCache(playerFeedType, flares);
        router.push({
            pathname: '/flare-player',
            params: {
                initialId: id,
                feedType: playerFeedType,
                followingIds: followingIds.join(','),
            },
        });
    }, [playerFeedType, flares, followingIds, router]);

    const resolveFollowingIds = async (): Promise<string[]> => {
        if (activeTab === 'following' || activeTab === 'foryou' || activeHashtag) {
            const ids = await authApi.getFollowingIds();
            setFollowingIds(ids);
            return ids;
        }
        return followingIds;
    };

    const fetchFeedPage = async (cursor: string | null, append: boolean) => {
        const currentFollowing = await resolveFollowingIds();

        if (activeHashtag) {
            const res = await threadApi.getFlaresByHashtag(activeHashtag, currentFollowing, cursor);
            const page = unpackFeedPage(res.data);
            setFlares((prev) => (append ? [...prev, ...page.items] : page.items));
            setNextCursor(page.nextCursor);
            setHasMore(page.hasMore);
            return;
        }

        let apiFeedType: 'PUBLIC' | 'FOLLOWING' | 'MY' | 'SAVED' | 'RESHARE' = 'PUBLIC';
        if (activeTab === 'following') apiFeedType = 'FOLLOWING';
        if (activeTab === 'myflares') apiFeedType = 'MY';
        if (activeTab === 'saved') apiFeedType = 'SAVED';
        if (activeTab === 'reshared') apiFeedType = 'RESHARE';

        if (activeTab === 'foryou') {
            const fetchFollowing = !append || forYouCursors.followingHasMore;
            const fetchPublic = !append || forYouCursors.publicHasMore;
            const [fRes, pRes] = await Promise.all([
                fetchFollowing
                    ? threadApi.getFlares({
                          feedType: 'FOLLOWING',
                          followingIds: currentFollowing,
                          limit: 15,
                          cursor: append ? forYouCursors.following || undefined : undefined,
                      })
                    : Promise.resolve({ data: { items: [], nextCursor: null, hasMore: false } }),
                fetchPublic
                    ? threadApi.getFlares({
                          feedType: 'PUBLIC',
                          limit: 15,
                          cursor: append ? forYouCursors.public || undefined : undefined,
                      })
                    : Promise.resolve({ data: { items: [], nextCursor: null, hasMore: false } }),
            ]);
            const fPage = unpackFeedPage(fRes.data);
            const pPage = unpackFeedPage(pRes.data);
            const combined = [...fPage.items, ...pPage.items];
            const uniqueFlares = Array.from(new Map(combined.map((f) => [f.id, f])).values());
            const sorted = uniqueFlares.sort((a, b) => {
                const aIsFollowing = currentFollowing.includes(a.authorId);
                const bIsFollowing = currentFollowing.includes(b.authorId);
                if (aIsFollowing && !bIsFollowing) return -1;
                if (!aIsFollowing && bIsFollowing) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setFlares((prev) => (append ? [...prev, ...sorted] : sorted));
            setForYouCursors((prev) => ({
                following: fetchFollowing ? fPage.nextCursor : prev.following,
                public: fetchPublic ? pPage.nextCursor : prev.public,
                followingHasMore: fetchFollowing ? fPage.hasMore : false,
                publicHasMore: fetchPublic ? pPage.hasMore : false,
            }));
            setNextCursor(null);
            setHasMore(
                (fetchFollowing && fPage.hasMore) || (fetchPublic && pPage.hasMore),
            );
            return;
        }

        const res = await threadApi.getFlares({
            feedType: apiFeedType,
            followingIds: currentFollowing,
            limit: 15,
            cursor: cursor || undefined,
        });
        const page = unpackFeedPage(res.data);
        setFlares((prev) => (append ? [...prev, ...page.items] : page.items));
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
    };

    const fetchInitialData = async () => {
        // Seed instantly from the last snapshot for this tab/hashtag so returning
        // to the grid shows content immediately and refreshes in the background.
        const cached = getFeedSnapshot<any>(feedKey);
        const hasFresh = cached && Array.isArray(cached.flares) && cached.flares.length > 0;
        try {
            if (hasFresh) {
                setFlares(cached.flares);
                setNextCursor(cached.nextCursor ?? null);
                setHasMore(!!cached.hasMore);
                setForYouCursors(cached.forYouCursors ?? { following: null, public: null, followingHasMore: false, publicHasMore: false });
                setLoading(false);
            } else {
                setLoading(true);
                setNextCursor(null);
                setForYouCursors({ following: null, public: null, followingHasMore: false, publicHasMore: false });
            }
            await fetchFeedPage(null, false);
        } catch (error) {
            console.error('Failed to fetch flares', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreFlares = async () => {
        if (!hasMore || loadingMore) return;
        if (activeTab !== 'foryou' && !nextCursor) return;
        try {
            setLoadingMore(true);
            await fetchFeedPage(nextCursor, true);
        } catch (error) {
            console.error('Failed to load more flares', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchInitialData();
        setRefreshing(false);
    };

    // Derived view-models — memoized so we don't rebuild/re-reduce the whole
    // feed on every unrelated re-render (likes, refresh flag, search toggle).
    const recentFlares = useMemo(() => [
        { id: 'create', type: 'create' },
        ...Object.values(flares.reduce((acc: any, flare: any) => {
            const authorId = flare.authorId || flare.createdBy;
            if (!acc[authorId]) {
                acc[authorId] = {
                    id: flare.id,
                    authorId: authorId,
                    name: flare.authorName || 'Resident',
                    time: 'Just now',
                    image: resolveMediaUrl(flare.thumbnailUrl || flare.previewUrl || flare.mediaUrls?.[0]),
                    avatar: resolveMediaUrl(flare.authorAvatarThumb || flare.authorAvatar),
                    count: 1,
                    allIds: [flare.id]
                };
            } else {
                acc[authorId].count += 1;
                acc[authorId].allIds.push(flare.id);
            }
            return acc;
        }, {})).slice(0, 10)
    ], [flares]);

    const gridFlares = useMemo(() => flares.map((f: any) => ({
        id: f.id,
        author: f.authorName || 'User',
        title: f.title,
        likes: f.likesCount || 0,
        liked: f.liked || false,
        mediaStatus: f.mediaStatus || 'READY',
        image:
            resolveMediaUrl(f.thumbnailUrl || f.posterUrl || f.previewUrl || f.mediaUrls?.[0]) ||
            'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800',
    })), [flares]);

    const renderRecentItem = ({ item }: any) => {
        if (item.type === 'create') {
            return (
                <TouchableOpacity 
                    style={[styles.recentCard, styles.createCard]}
                    onPress={() => router.push('/create-flare')}
                >
                    <View style={styles.createIconBg}>
                        <Ionicons name="camera-outline" size={24} color="#fff" />
                    </View>
                    <Text style={styles.createLabel}>Create{"\n"}Flare</Text>
                </TouchableOpacity>
            );
        }

        const hasMultiple = item.count > 1;

        return (
            <TouchableOpacity 
                style={[
                    styles.recentCard,
                    hasMultiple && styles.groupedCard
                ]}
                onPress={() => openFlare(item.id)}
            >
                <AppImage uri={item.image} style={styles.recentBg} />
                <View style={styles.recentGradient} />
                
                {/* Border for multiple flares */}
                {hasMultiple && <View style={styles.stackBorder} />}

                <View style={[
                    styles.recentAvatarContainer,
                    hasMultiple && styles.groupedAvatarContainer
                ]}>
                    <AppImage uri={item.avatar} style={styles.recentAvatar} />
                </View>

                {/* Flare Count Badge */}
                {hasMultiple && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{item.count}</Text>
                    </View>
                )}

                <View style={styles.recentInfo}>
                    <Text style={styles.recentName}>{item.name}</Text>
                    <Text style={styles.recentTime}>{item.time}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const handleLike = useCallback(async (flareId: string) => {
        try {
            // Optimistic update
            setFlares(current => current.map(f => 
                f.id === flareId ? { ...f, likesCount: (f.likesCount || 0) + (f.liked ? -1 : 1), liked: !f.liked } : f
            ));
            await threadApi.toggleLike(flareId);
        } catch (error) {
            console.error('Failed to toggle like', error);
            // Revert on failure
            fetchInitialData();
        }
    }, []);

    const renderFeedItem = useCallback(
        ({ item }: { item: any }) => (
            <FlareGridCard item={item} onOpen={openFlare} onLike={handleLike} />
        ),
        [openFlare, handleLike],
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Flares</Text>
                    <Text style={styles.headerSubtitle}>Short videos from your community</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => setSearchOpen(true)}>
                        <Ionicons name="search" size={26} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}>
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {activeHashtag && (
                <View style={styles.activeHashtagBar}>
                    <View style={styles.activeHashtagChip}>
                        <Ionicons name="pricetag" size={14} color="#8b5cf6" />
                        <Text style={styles.activeHashtagText}>#{activeHashtag}</Text>
                    </View>
                    <Text style={styles.activeHashtagSubtle}>Public flares with this hashtag</Text>
                    <TouchableOpacity onPress={() => setActiveHashtag(null)} style={styles.activeHashtagClear}>
                        <Ionicons name="close" size={16} color="#8b5cf6" />
                    </TouchableOpacity>
                </View>
            )}

            {loading && !refreshing ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                </View>
            ) : (
                <FlatList
                    data={gridFlares}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.gridRow}
                    renderItem={renderFeedItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
                    }
                    onEndReached={loadMoreFlares}
                    onEndReachedThreshold={0.4}
                    initialNumToRender={10}
                    maxToRenderPerBatch={6}
                    windowSize={7}
                    removeClippedSubviews
                    ListHeaderComponent={
                        <>
                            {!activeHashtag && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                                    {TABS.map(tab => (
                                        <TouchableOpacity 
                                            key={tab.id} 
                                            style={[styles.tab, activeTab === tab.id ? styles.activeTab : styles.inactiveTab]}
                                            onPress={() => setActiveTab(tab.id)}
                                        >
                                            <MaterialCommunityIcons 
                                                name={tab.icon as any} 
                                                size={20} 
                                                color={activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.7)"} 
                                            />
                                            <Text style={[styles.tabLabel, activeTab === tab.id ? styles.activeTabLabel : styles.inactiveTabLabel]}>{tab.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            {!activeHashtag && (
                                <>
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>Recent Flares</Text>
                                        <TouchableOpacity>
                                            <Text style={styles.seeAll}>See all</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.recentList}
                                    >
                                        {recentFlares.map((item: any) => (
                                            <View key={item.id}>{renderRecentItem({ item })}</View>
                                        ))}
                                    </ScrollView>
                                </>
                            )}

                            <Text style={styles.sectionTitleGrid}>
                                {activeHashtag ? `#${activeHashtag}` :
                                 activeTab === 'foryou' ? 'For You' : 
                                 activeTab === 'following' ? 'Following' : 
                                 activeTab === 'public' ? 'Public' : 
                                 activeTab === 'saved' ? 'Saved Flares' : 
                                 activeTab === 'reshared' ? 'Reshared Flares' : 'My Flares'}
                            </Text>
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="videocam-outline" size={48} color="rgba(255,255,255,0.2)" />
                            <Text style={styles.emptyText}>No flares found in this section.</Text>
                        </View>
                    }
                    ListFooterComponent={
                        <>
                            {loadingMore ? (
                                <ActivityIndicator style={{ marginVertical: 20 }} color="#8b5cf6" />
                            ) : null}
                            <View style={{ height: 120 }} />
                        </>
                    }
                />
            )}

            <BottomNav activeTab="Flares" />

            <PostSearchOverlay
                visible={searchOpen}
                type="FLARE"
                onClose={() => setSearchOpen(false)}
                onPickHashtag={(tag) => setActiveHashtag(tag)}
                onPickUser={(u) => router.push({ pathname: '/user-profile', params: { id: u.id } })}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 15 },
    // Page sits on a pitch-black backdrop so any dark-purple brand text
    // ("#2D2445") becomes invisible. Use the bright violet ramp instead:
    //   #C4B5FD - primary headings (highest contrast on black)
    //   #A78BFA - secondary brand text
    //   #fff    - overlays sitting on top of imagery
    headerTitle: { fontSize: 32, fontWeight: '900', color: '#C4B5FD', marginTop: 5 },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBtn: { padding: 5 },
    avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

    // Hashtag-mode chip (rendered on the dark flares background, so we
    // use a low-opacity purple fill rather than the white surface used
    // by ThreadScreen's bar).
    activeHashtagBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 20,
        marginBottom: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: 'rgba(139,92,246,0.16)',
        borderWidth: 1,
        borderColor: 'rgba(139,92,246,0.35)',
    },
    activeHashtagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    activeHashtagText: { fontSize: 12, fontWeight: '900', color: '#8b5cf6' },
    activeHashtagSubtle: { flex: 1, fontSize: 11, fontWeight: '700', color: '#E2D9F2' },
    activeHashtagClear: { padding: 4 },
    
    scrollContent: { paddingTop: 5 },
    tabsContainer: { paddingHorizontal: 20, gap: 10, marginBottom: 25 },
    tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, gap: 8 },
    activeTab: { backgroundColor: '#8b5cf6' },
    inactiveTab: { backgroundColor: '#1c1c1e' },
    tabLabel: { fontWeight: '700', fontSize: 15 },
    activeTabLabel: { color: '#fff' },
    inactiveTabLabel: { color: 'rgba(255,255,255,0.7)' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: '#C4B5FD' },
    seeAll: { fontSize: 14, color: '#A78BFA', fontWeight: '700' },
    recentList: { paddingHorizontal: 20, gap: 12 },
    recentCard: { width: 110, height: 170, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1c1c1e' },
    recentBg: { ...StyleSheet.absoluteFillObject },
    recentGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
    createCard: { backgroundColor: '#2c2c2e', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)' },
    createIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    createLabel: { color: '#C4B5FD', fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 18 },
    recentAvatarContainer: { position: 'absolute', top: 12, left: 12, borderWidth: 2, borderColor: '#8b5cf6', borderRadius: 18, padding: 1 },
    recentAvatar: { width: 28, height: 28, borderRadius: 14 },
    recentInfo: { position: 'absolute', bottom: 12, left: 12 },
    // Sits on top of darkened thumbnail imagery — white reads best.
    recentName: { color: '#fff', fontSize: 13, fontWeight: '800' },
    recentTime: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },

    // Grouped Flare Styles
    groupedCard: { borderWidth: 2, borderColor: '#8b5cf6' },
    stackBorder: { position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 14 },
    groupedAvatarContainer: { borderColor: '#fff' },
    countBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#8b5cf6', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
    countText: { color: '#fff', fontSize: 11, fontWeight: '900' },

    sectionTitleGrid: { fontSize: 20, fontWeight: '800', color: '#C4B5FD', paddingHorizontal: 20, marginTop: 35, marginBottom: 15 },
    gridRow: { paddingHorizontal: 18, justifyContent: 'space-between' },
    feedCard: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.6, borderRadius: 22, overflow: 'hidden', marginBottom: 18, backgroundColor: '#1c1c1e' },
    feedImage: { ...StyleSheet.absoluteFillObject },
    feedGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
    playIconOverlay: { position: 'absolute', top: 15, right: 15, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    processingBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        zIndex: 2,
    },
    processingText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    feedOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    feedBottomInfo: { flex: 1, marginRight: 5 },
    feedAuthor: { color: '#fff', fontSize: 14, fontWeight: '800' },
    feedTitle: { color: 'rgba(255,255,255,0.92)', fontSize: 12, marginTop: 3 },
    likesContainer: { alignItems: 'center' },
    likesText: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 3 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 50 },
    emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 20, fontSize: 16, fontWeight: '600' },
});
