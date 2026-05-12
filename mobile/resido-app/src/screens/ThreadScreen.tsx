import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView, SafeAreaView, Dimensions, StatusBar, Share, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { threadApi, authApi } from '../services/api';
import { Video, ResizeMode } from 'expo-av';
import { useAuthStore } from '../store/authStore';
import BottomNav from '../components/BottomNav';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: 'all', name: 'All', icon: 'apps-outline' },
    { id: 'general', name: 'General', icon: 'chatbubbles-outline' },
    { id: 'news', name: 'News', icon: 'newspaper-outline' },
    { id: 'event', name: 'Articles', icon: 'document-text-outline' },
    { id: 'marketplace', name: 'Services', icon: 'briefcase-outline' },
    { id: 'social', name: 'Arts', icon: 'color-palette-outline' },
];

const FEED_TABS = [
    { id: 'FORYOU', name: 'For You' },
    { id: 'FOLLOWING', name: 'Following' },
    { id: 'PUBLIC', name: 'Public' },
    { id: 'MY', name: 'My Space' },
    { id: 'RESHARE', name: 'Reshared' },
    { id: 'SAVED', name: 'Saved' },
];

export default function ThreadScreen() {
    const [threads, setThreads] = useState<any[]>([]);
    const [followingFlares, setFollowingFlares] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'FORYOU' | 'FOLLOWING' | 'PUBLIC' | 'MY' | 'RESHARE' | 'SAVED'>('FORYOU');
    const [activeCategory, setActiveCategory] = useState('all');
    
    const router = useRouter();
    const { refresh } = useLocalSearchParams();
    const { user, activeWorkspace } = useAuthStore();

    const [followingIds, setFollowingIds] = useState<string[]>([]);

    useEffect(() => {
        fetchInitialData();
        if (activeTab === 'MY' || activeTab === 'FOLLOWING') {
            fetchFollowingFlares();
        }
    }, [activeWorkspace, activeTab, activeCategory, refresh]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch Following IDs
            let currentFollowing: string[] = followingIds;
            if (activeTab === 'FOLLOWING' || activeTab === 'FORYOU') {
                const { data: followList } = await authApi.getFollowing();
                currentFollowing = followList || [];
                setFollowingIds(currentFollowing);
            }

            // 2. Fetch Threads
            const { data } = await threadApi.getThreads({ 
                feedType: activeTab as any,
                followingIds: currentFollowing,
                category: activeCategory !== 'all' ? activeCategory : undefined
            });

            // 3. For You Priority Logic
            if (activeTab === 'FORYOU') {
                const { data: publicThreads } = await threadApi.getThreads({ feedType: 'PUBLIC' });
                const combined = [...data, ...publicThreads];
                const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
                unique.sort((a, b) => {
                    const aIsFollowing = currentFollowing.includes(a.authorId);
                    const bIsFollowing = currentFollowing.includes(b.authorId);
                    if (aIsFollowing && !bIsFollowing) return -1;
                    if (!aIsFollowing && bIsFollowing) return 1;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });
                setThreads(unique);
            } else {
                setThreads(data || []);
            }
        } catch (e) {
            console.error('Failed to fetch threads', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchFollowingFlares = async () => {
        try {
            const { data } = await threadApi.getFlares({ feedType: 'FOLLOWING' });
            setFollowingFlares(data || []);
        } catch (e) {
            console.error('Failed to fetch following flares', e);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchInitialData(), fetchFollowingFlares()]);
        setRefreshing(false);
    };

    const handleLike = async (id: string) => {
        try {
            // Optimistic update
            setThreads(prev => prev.map(t => 
                t.id === id ? { ...t, likesCount: t.likesCount + (t.isLiked ? -1 : 1), isLiked: !t.isLiked } : t
            ));
            await threadApi.toggleLike(id);
        } catch (e) {
            console.error(e);
            // Revert on error
            setThreads(prev => prev.map(t => 
                t.id === id ? { ...t, likesCount: t.likesCount + (t.isLiked ? 1 : -1), isLiked: !t.isLiked } : t
            ));
        }
    };

    const handleShare = async (item: any) => {
        try {
            const result = await Share.share({
                message: `${item.title}\n\n${item.content}\n\nShared via Resido App`,
                url: item.mediaUrls && item.mediaUrls.length > 0 ? item.mediaUrls[0] : undefined
            });
        } catch (error: any) {
            console.error(error.message);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Thread',
            'Are you sure you want to delete this post? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await threadApi.deleteBlog(id);
                            setThreads(prev => prev.filter(t => t.id !== id));
                            Alert.alert('Success', 'Thread deleted');
                        } catch (e) {
                            console.error(e);
                            Alert.alert('Error', 'Failed to delete thread');
                        }
                    }
                }
            ]
        );
    };

    const handleReshare = async (id: string) => {
        try {
            await threadApi.reshare(id, { 
                authorName: user?.name || "Anonymous", 
                authorAvatar: user?.profilePhoto 
            });
            setThreads(prev => prev.map(t => t.id === id ? { 
                ...t, 
                resharesCount: (t.resharesCount || 0) + 1 
            } : t));
            Alert.alert('Success', 'Thread reshared to your profile!');
            if (activeTab === 'RESHARE') fetchInitialData();
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to reshare thread');
        }
    };

    const handleSave = async (id: string) => {
        try {
            const { data } = await threadApi.toggleSave(id);
            setThreads(prev => prev.map(t => t.id === id ? { ...t, saved: data.saved } : t));
            if (activeTab === 'SAVED') fetchInitialData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleVote = async (pollId: string, optionId: string) => {
        try {
            await threadApi.votePoll(pollId, optionId);
            // Instant refresh or optimistic update
            fetchInitialData();
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to submit vote');
        }
    };

    const handleEdit = (item: any) => {
        router.push({
            pathname: '/create-thread',
            params: { editId: item.id }
        });
    };

    const renderThreadItem = ({ item }: { item: any }) => (
        <View style={styles.threadCard}>
            <View style={styles.threadHeader}>
                <Image source={{ uri: item.authorAvatar || 'https://i.pravatar.cc/100' }} style={styles.authorAvatar} />
                <View style={styles.authorInfo}>
                    <View style={styles.authorRow}>
                        <Text style={styles.authorName}>{item.authorName || 'Anonymous'}</Text>
                        {item.isVerified && <MaterialCommunityIcons name="check-decagram" size={14} color="#6366f1" style={{ marginLeft: 4 }} />}
                    </View>
                    <Text style={styles.threadMeta}>{item.location || 'Resido Community'} • {dayjs(item.createdAt).fromNow()}</Text>
                </View>
                {(item.authorId === user?.id || item.isAuthor) && (
                    <TouchableOpacity onPress={() => {
                        Alert.alert(
                            'Post Options',
                            'Manage your thread',
                            [
                                { text: 'Edit', onPress: () => handleEdit(item) },
                                { text: 'Delete', onPress: () => handleDelete(item.id), style: 'destructive' },
                                { text: 'Cancel', style: 'cancel' }
                            ]
                        );
                    }}>
                        <Ionicons name="ellipsis-horizontal" size={20} color="#94a3b8" />
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity onPress={() => router.push(`/thread/${item.id}`)}>
                <Text style={styles.threadTitle}>{item.title}</Text>
                <Text style={styles.threadContent}>{item.content}</Text>
            </TouchableOpacity>

            {item.mediaUrls && item.mediaUrls.length > 0 && (
                <View style={styles.mediaCarouselContainer}>
                    <ScrollView 
                        horizontal 
                        pagingEnabled 
                        showsHorizontalScrollIndicator={false}
                        onScroll={(e) => {
                            const offset = e.nativeEvent.contentOffset.x;
                            // Could add indicator logic here
                        }}
                    >
                        {item.mediaUrls.map((url: string, idx: number) => (
                            <View key={idx} style={styles.carouselItem}>
                                {url.toLowerCase().endsWith('.mp4') || url.includes('video') ? (
                                    <Video
                                        source={{ uri: url }}
                                        style={styles.carouselMedia}
                                        resizeMode={ResizeMode.COVER}
                                        shouldPlay={false}
                                        isMuted
                                        useNativeControls={false}
                                    />
                                ) : (
                                    <Image source={{ uri: url }} style={styles.carouselMedia} />
                                )}
                            </View>
                        ))}
                    </ScrollView>
                    {item.mediaUrls.length > 1 && (
                        <View style={styles.mediaCounter}>
                            <Text style={styles.mediaCounterText}>1/{item.mediaUrls.length}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Poll Display */}
            {item.poll && (
                <View style={styles.pollContainer}>
                    <Text style={styles.pollQuestion}>{item.poll.question}</Text>
                    
                    {item.poll.options.map((opt: any) => {
                        const totalVotes = item.poll.options.reduce((sum: number, o: any) => sum + (o._count?.votes || 0), 0);
                        const percentage = totalVotes > 0 ? Math.round(((opt._count?.votes || 0) / totalVotes) * 100) : 0;
                        const hasVoted = item.poll.votes && item.poll.votes.length > 0;
                        const isSelected = hasVoted && item.poll.votes[0].optionId === opt.id;
                        const isExpired = new Date(item.poll.expiresAt) < new Date();

                        if (hasVoted || isExpired) {
                            return (
                                <View key={opt.id} style={styles.resultItem}>
                                    <View style={styles.resultLabelRow}>
                                        <Text style={[styles.resultText, isSelected && styles.selectedResultText]}>{opt.text}</Text>
                                        <Text style={styles.resultPercentage}>{percentage}%</Text>
                                    </View>
                                    <View style={styles.progressBg}>
                                        <View style={[styles.progressFill, { width: `${percentage}%` }, isSelected && { backgroundColor: '#6366f1' }]} />
                                    </View>
                                </View>
                            );
                        }

                        return (
                            <TouchableOpacity 
                                key={opt.id} 
                                style={styles.pollOptionBtn}
                                onPress={() => handleVote(item.poll.id, opt.id)}
                            >
                                <Text style={styles.pollOptionText}>{opt.text}</Text>
                            </TouchableOpacity>
                        );
                    })}

                    <View style={styles.pollFooter}>
                        <Text style={styles.pollMeta}>
                            {item.poll.options.reduce((sum: number, o: any) => sum + (o._count?.votes || 0), 0)} votes • {dayjs(item.poll.expiresAt).fromNow(true)} left
                        </Text>
                    </View>
                </View>
            )}

            <View style={styles.tagRow}>
                <View style={[styles.tag, { backgroundColor: '#f0fdf4' }]}>
                    <Text style={[styles.tagText, { color: '#16a34a' }]}># {item.category || 'General'}</Text>
                </View>
                {item.hashtags?.map((tag: string, i: number) => (
                    <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}># {tag}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.interactionBar}>
                <TouchableOpacity style={styles.interactionBtn} onPress={() => handleLike(item.id)}>
                    <Ionicons name={item.isLiked ? "heart" : "heart-outline"} size={20} color={item.isLiked ? "#ef4444" : "#64748b"} />
                    <Text style={[styles.interactionText, item.isLiked && { color: '#ef4444' }]}>{item.likesCount || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.interactionBtn} onPress={() => router.push(`/thread/${item.id}`)}>
                    <Ionicons name="chatbubble-outline" size={18} color="#64748b" />
                    <Text style={styles.interactionText}>{item.commentsCount || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.interactionBtn} onPress={() => handleReshare(item.id)}>
                    <Ionicons name="repeat-outline" size={20} color="#64748b" />
                    <Text style={styles.interactionText}>{item.resharesCount || 0}</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => handleSave(item.id)}>
                    <Ionicons name={item.saved ? "bookmark" : "bookmark-outline"} size={20} color={item.saved ? "#6366f1" : "#64748b"} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Resido</Text>
                    <Text style={styles.headerTitle}>Thread</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="search" size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-thread')}>
                        <Ionicons name="create-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Feed Tabs */}
            <View style={styles.tabBar}>
                {FEED_TABS.map(tab => (
                    <TouchableOpacity 
                        key={tab.id} 
                        style={[styles.tab, activeTab === tab.id && styles.activeTab]}
                        onPress={() => setActiveTab(tab.id as any)}
                    >
                        <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Category Selector */}
            <View style={styles.catWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catList}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity 
                            key={cat.id} 
                            style={[styles.catPill, activeCategory === cat.id && styles.activeCatPill]}
                            onPress={() => setActiveCategory(cat.id)}
                        >
                            {activeCategory === cat.id ? (
                                <View style={styles.catIconActive}>
                                    <Ionicons name={cat.icon as any} size={16} color="#fff" />
                                </View>
                            ) : (
                                <Ionicons name={cat.icon as any} size={18} color="#64748b" style={{ marginRight: 6 }} />
                            )}
                            <Text style={[styles.catText, activeCategory === cat.id && styles.activeCatText]}>{cat.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Following Flares (Stories Style) - Only in MY/FOLLOWING tab */}
            {(activeTab === 'MY' || activeTab === 'FOLLOWING') && (
                <View style={styles.storiesContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesList}>
                        <TouchableOpacity style={styles.storyItem} onPress={() => router.push('/create-flare')}>
                            <View style={[styles.storyAvatarContainer, { borderColor: '#e2e8f0', borderStyle: 'dashed' }]}>
                                <Image source={{ uri: user?.profilePhoto || 'https://i.pravatar.cc/100' }} style={styles.storyAvatar} />
                                <View style={styles.storyAddBtn}>
                                    <Ionicons name="add" size={12} color="#fff" />
                                </View>
                            </View>
                            <Text style={styles.storyName}>Create</Text>
                        </TouchableOpacity>

                        {followingFlares.map((flare, idx) => (
                            <TouchableOpacity 
                                key={flare.id} 
                                style={styles.storyItem} 
                                onPress={() => router.push({ pathname: '/flares', params: { initialId: flare.id } })}
                            >
                                <View style={styles.storyAvatarContainer}>
                                    <Image source={{ uri: flare.authorAvatar || 'https://i.pravatar.cc/100' }} style={styles.storyAvatar} />
                                    <View style={styles.flareBadge}>
                                        <Ionicons name="play" size={8} color="#fff" />
                                    </View>
                                </View>
                                <Text style={styles.storyName} numberOfLines={1}>{flare.authorName.split(' ')[0]}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Thread Creator Quick Access */}
            {activeTab === 'PUBLIC' && (
                <TouchableOpacity style={styles.quickAccess} onPress={() => router.push('/create-thread')}>
                    <Image source={{ uri: user?.profilePhoto || 'https://i.pravatar.cc/100' }} style={styles.miniAvatar} />
                    <Text style={styles.quickPlaceholder}>What's on your mind?</Text>
                    <Ionicons name="image-outline" size={24} color="#94a3b8" />
                </TouchableOpacity>
            )}

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <FlatList
                    data={threads}
                    keyExtractor={(item) => item.id}
                    renderItem={renderThreadItem}
                    contentContainerStyle={styles.listContent}
                    onRefresh={onRefresh}
                    refreshing={refreshing}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyTitle}>No threads yet</Text>
                            <Text style={styles.emptySub}>Be the first one to share something with your community!</Text>
                        </View>
                    }
                />
            )}

            <BottomNav activeTab="Threads" />

            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => router.push('/create-thread')}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 10 },
    welcomeText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1e293b', marginTop: 4 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: { marginRight: 15 },
    createBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    
    tabBar: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15 },
    tab: { paddingVertical: 8, marginRight: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#6366f1' },
    tabText: { fontSize: 15, fontWeight: '700', color: '#94a3b8' },
    activeTabText: { color: '#1e293b' },

    catWrapper: { marginBottom: 20 },
    catList: { paddingHorizontal: 20, gap: 10 },
    catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
    activeCatPill: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    catIconActive: { marginRight: 8 },
    catText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
    activeCatText: { color: '#fff' },

    quickAccess: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', marginHorizontal: 20, padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    miniAvatar: { width: 40, height: 40, borderRadius: 20 },
    quickPlaceholder: { flex: 1, marginLeft: 15, fontSize: 15, color: '#94a3b8', fontWeight: '500' },

    storiesContainer: { marginBottom: 25 },
    storiesList: { paddingHorizontal: 20, gap: 18 },
    storyItem: { alignItems: 'center', width: 72 },
    storyAvatarContainer: { 
        width: 72, 
        height: 72, 
        borderRadius: 36, 
        borderWidth: 2.5, 
        borderColor: '#6366f1', 
        padding: 3, 
        position: 'relative',
        backgroundColor: '#fff'
    },
    storyAvatar: { width: '100%', height: '100%', borderRadius: 33 },
    storyAddBtn: { 
        position: 'absolute', 
        bottom: 0, 
        right: 0, 
        width: 22, 
        height: 22, 
        borderRadius: 11, 
        backgroundColor: '#6366f1', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff'
    },
    flareBadge: { 
        position: 'absolute', 
        bottom: -2, 
        right: -2, 
        width: 20, 
        height: 20, 
        borderRadius: 10, 
        backgroundColor: '#ef4444', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff'
    },
    storyName: { fontSize: 12, fontWeight: '700', color: '#1e293b', marginTop: 8 },

    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    threadCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    threadHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    authorAvatar: { width: 44, height: 44, borderRadius: 22 },
    authorInfo: { flex: 1, marginLeft: 12 },
    authorRow: { flexDirection: 'row', alignItems: 'center' },
    authorName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    threadMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '500' },

    threadTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 8, lineHeight: 24 },
    threadContent: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 15 },
    
    mediaContainer: { width: '100%', height: 220, borderRadius: 20, overflow: 'hidden', marginBottom: 15, position: 'relative' },
    mainMedia: { width: '100%', height: '100%', backgroundColor: '#f1f5f9' },
    mediaBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    mediaBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
    tag: { backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    tagText: { fontSize: 12, color: '#6366f1', fontWeight: '700' },

    interactionBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 15 },
    interactionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
    interactionText: { fontSize: 13, fontWeight: '700', color: '#64748b', marginLeft: 6 },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 20 },

    mediaCarouselContainer: { width: '100%', height: 250, borderRadius: 20, overflow: 'hidden', marginBottom: 15, position: 'relative', backgroundColor: '#f1f5f9' },
    carouselItem: { width: width - 80, height: 250 },
    carouselMedia: { width: '100%', height: '100%' },
    mediaCounter: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    mediaCounterText: { color: '#fff', fontSize: 12, fontWeight: '800' },

    pollContainer: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#f1f5f9' },
    pollQuestion: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 15, lineHeight: 22 },
    pollOptionBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 15, marginBottom: 10, alignItems: 'center' },
    pollOptionText: { fontSize: 14, fontWeight: '700', color: '#6366f1' },
    pollFooter: { marginTop: 10 },
    pollMeta: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
    
    resultItem: { marginBottom: 12 },
    resultLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    resultText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
    selectedResultText: { color: '#1e293b', fontWeight: '800' },
    resultPercentage: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    progressBg: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#cbd5e1', borderRadius: 4 },

    fab: {
        position: 'absolute',
        bottom: 100, // Above bottom nav
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#6366f1',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
});
