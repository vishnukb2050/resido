import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

type TabKey = 'followers' | 'following';

export default function FollowListScreen() {
    const router = useRouter();
    const { userId, tab } = useLocalSearchParams<{ userId?: string; tab?: TabKey }>();
    const [activeTab, setActiveTab] = useState<TabKey>((tab as TabKey) || 'followers');
    const [data, setData] = useState<{ followers: any[]; following: any[] }>({
        followers: [], following: [],
    });
    const [counts, setCounts] = useState<{ followersCount: number; followingCount: number }>({
        followersCount: 0, followingCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = useCallback(async () => {
        if (!userId) return;
        try {
            const [{ data: followers }, { data: following }, { data: c }] = await Promise.all([
                authApi.getUserFollowers(userId as string),
                authApi.getUserFollowing(userId as string),
                authApi.getFollowCounts(userId as string),
            ]);
            setData({
                followers: Array.isArray(followers) ? followers : [],
                following: Array.isArray(following) ? following : [],
            });
            setCounts({
                followersCount: c?.followersCount || 0,
                followingCount: c?.followingCount || 0,
            });
        } catch (err) {
            console.error('Failed to fetch follow lists:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId]);

    useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

    const list = activeTab === 'followers' ? data.followers : data.following;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.title}>Connections</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabsBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'followers' && styles.tabActive]}
                    onPress={() => setActiveTab('followers')}
                >
                    <Text style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}>
                        Followers · {counts.followersCount}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'following' && styles.tabActive]}
                    onPress={() => setActiveTab('following')}
                >
                    <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
                        Following · {counts.followingCount}
                    </Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}><ActivityIndicator color="#8b5cf6" /></View>
            ) : (
                <FlatList
                    data={list}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={list.length === 0 ? { flex: 1 } : { padding: 16 }}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={9}
                    removeClippedSubviews={true}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchAll(); }}
                            tintColor="#8b5cf6"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={56} color="#9A8EBA" />
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                            </Text>
                            <Text style={styles.emptySub}>
                                {activeTab === 'followers'
                                    ? 'When people follow this profile, they\'ll appear here.'
                                    : 'Tap a profile in the feed and use the follow button to start.'}
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const photo = resolveMediaUrl(item.profilePhoto) ||
                            `https://i.pravatar.cc/150?u=${item.id}`;
                        return (
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => router.push({ pathname: '/user-profile', params: { id: item.id } })}
                            >
                                <Image source={{ uri: photo }} style={styles.avatar} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.name} numberOfLines={1}>{item.name || 'User'}</Text>
                                    {item.profileName ? (
                                        <Text style={styles.handle}>@{item.profileName}</Text>
                                    ) : null}
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#9A8EBA" />
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: '#EFE9F8',
    },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '900', color: '#2D2445' },

    tabsBar: {
        flexDirection: 'row', backgroundColor: '#fff', margin: 16, borderRadius: 14,
        padding: 4, borderWidth: 1, borderColor: '#D4C9E8',
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
    tabActive: { backgroundColor: '#8b5cf6' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#9A8EBA' },
    tabTextActive: { color: '#fff' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: '#2D2445' },
    emptySub: { fontSize: 13, color: '#7A6B9C', textAlign: 'center', lineHeight: 20 },

    row: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 18, padding: 12, marginBottom: 10,
        borderWidth: 1, borderColor: '#EFE9F8',
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8E2F2' },
    name: { fontSize: 14, fontWeight: '800', color: '#2D2445' },
    handle: { fontSize: 12, color: '#7A6B9C', fontWeight: '600', marginTop: 2 },
});
