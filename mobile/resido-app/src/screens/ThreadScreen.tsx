import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, ScrollView, SafeAreaView, Dimensions, StatusBar, Share } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { threadApi } from '../services/api';
import { useRouter } from 'expo-router';
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
    { id: 'PUBLIC', name: 'Explore' },
    { id: 'FOLLOWING', name: 'Following' },
    { id: 'MY', name: 'My Space' },
];

export default function ThreadScreen() {
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'PUBLIC' | 'FOLLOWING' | 'MY'>('PUBLIC');
    const [activeCategory, setActiveCategory] = useState('all');
    
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();

    useEffect(() => {
        fetchThreads();
    }, [activeWorkspace, activeTab]);

    const fetchThreads = async () => {
        try {
            setLoading(true);
            const { data } = await threadApi.getThreads({ 
                feedType: activeTab,
                followingIds: [] // TODO: Get following IDs from authStore
            });
            setThreads(data || []);
        } catch (e) {
            console.error('Failed to fetch threads', e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchThreads();
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
                <TouchableOpacity>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#94a3b8" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push(`/thread/${item.id}`)}>
                <Text style={styles.threadTitle}>{item.title}</Text>
                <Text style={styles.threadContent} numberOfLines={4}>{item.content}</Text>
            </TouchableOpacity>

            {item.mediaUrls && item.mediaUrls.length > 0 && (
                <View style={styles.mediaContainer}>
                    <Image source={{ uri: item.mediaUrls[0] }} style={styles.mainMedia} />
                    {item.mediaUrls.length > 1 && (
                        <View style={styles.mediaBadge}>
                            <Text style={styles.mediaBadgeText}>+{item.mediaUrls.length - 1}</Text>
                        </View>
                    )}
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
                <TouchableOpacity style={styles.interactionBtn}>
                    <Ionicons name="repeat-outline" size={20} color="#64748b" />
                    <Text style={styles.interactionText}>{item.resharesCount || 0}</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity>
                    <Ionicons name="bookmark-outline" size={20} color="#64748b" />
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
    welcomeText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1e293b', marginTop: -4 },
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
});
