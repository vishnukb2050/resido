import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Image, SafeAreaView, ScrollView, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { threadApi } from '../services/api';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

const TABS = [
    { id: 'foryou', label: 'For You', icon: 'sparkles' },
    { id: 'following', label: 'Following', icon: 'account-outline' },
    { id: 'public', label: 'Public', icon: 'earth' },
    { id: 'myflares', label: 'My Flares', icon: 'play-box-outline' },
];

export default function FlaresScreen() {
    const [activeTab, setActiveTab] = useState('foryou');
    const [flares, setFlares] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchFlares();
    }, []);

    const fetchFlares = async () => {
        try {
            setLoading(true);
            const { data } = await threadApi.getFlares();
            setFlares(data);
        } catch (error) {
            console.error('Failed to fetch flares', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchFlares();
        setRefreshing(false);
    };

    const recentFlares = [
        { id: 'create', type: 'create' },
        ...flares.slice(0, 5).map((f: any) => ({
            id: f.id,
            name: f.authorName || 'User', // Fallback if name not joined
            time: 'Just now', // Could use moment/dayjs
            image: f.mediaUrls?.[0] || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400',
            avatar: `https://randomuser.me/api/portraits/lego/${Math.floor(Math.random() * 8)}.jpg`
        }))
    ];

    const forYouFlares = flares.map((f: any) => ({
        id: f.id,
        author: f.authorName || 'User',
        title: f.title,
        likes: f.likesCount || 0,
        liked: f.liked || false,
        image: f.mediaUrls?.[0] || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=800'
    }));

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

        return (
            <TouchableOpacity 
                style={styles.recentCard}
                onPress={() => router.push({
                    pathname: '/flare-player',
                    params: { initialId: item.id }
                })}
            >
                <Image source={{ uri: item.image }} style={styles.recentBg} />
                <View style={styles.recentGradient} />
                <View style={styles.recentAvatarContainer}>
                    <Image source={{ uri: item.avatar }} style={styles.recentAvatar} />
                </View>
                <View style={styles.recentInfo}>
                    <Text style={styles.recentName}>{item.name}</Text>
                    <Text style={styles.recentTime}>{item.time}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const handleLike = async (flareId: string) => {
        try {
            // Optimistic update
            setFlares(current => current.map(f => 
                f.id === flareId ? { ...f, likesCount: (f.likesCount || 0) + (f.liked ? -1 : 1), liked: !f.liked } : f
            ));
            await threadApi.toggleLike(flareId);
        } catch (error) {
            console.error('Failed to toggle like', error);
            // Revert on failure
            fetchFlares();
        }
    };

    const renderFeedItem = (item: any) => (
        <TouchableOpacity 
            key={item.id} 
            style={styles.feedCard}
            onPress={() => router.push({
                pathname: '/flare-player',
                params: { initialId: item.id }
            })}
        >
            <Image source={{ uri: item.image }} style={styles.feedImage} />
            <View style={styles.feedGradient} />
            <View style={styles.playIconOverlay}>
                <Ionicons name="play" size={16} color="#fff" />
            </View>
            <View style={styles.feedOverlay}>
                <View style={styles.feedBottomInfo}>
                    <Text style={styles.feedAuthor}>@{item.author}</Text>
                    <Text style={styles.feedTitle} numberOfLines={1}>{item.title}</Text>
                </View>
                <TouchableOpacity 
                    style={styles.likesContainer}
                    onPress={() => handleLike(item.id)}
                >
                    <Ionicons 
                        name={item.liked ? "heart" : "heart-outline"} 
                        size={18} 
                        color={item.liked ? "#ff3b30" : "#fff"} 
                    />
                    <Text style={styles.likesText}>{item.likes}</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
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
                    <TouchableOpacity style={styles.iconBtn}>
                        <Ionicons name="search" size={26} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}>
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#5856d6" />
                </View>
            ) : (
                <ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5856d6" />
                    }
                >
                    {/* Tabs */}
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

                    {/* Recent Flares */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Flares</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={recentFlares}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id}
                        renderItem={renderRecentItem}
                        contentContainerStyle={styles.recentList}
                    />

                    {/* For You Grid */}
                    <Text style={styles.sectionTitleGrid}>For You</Text>
                    
                    {flares.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="videocam-outline" size={48} color="rgba(255,255,255,0.2)" />
                            <Text style={styles.emptyText}>No flares found. Be the first to create one!</Text>
                        </View>
                    ) : (
                        <View style={styles.gridContainer}>
                            {forYouFlares.map(item => renderFeedItem(item))}
                        </View>
                    )}
                    
                    <View style={{ height: 120 }} />
                </ScrollView>
            )}

            <BottomNav activeTab="Flares" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
    headerTitle: { fontSize: 32, fontWeight: '900', color: '#fff' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBtn: { padding: 5 },
    avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    
    scrollContent: { paddingTop: 5 },
    tabsContainer: { paddingHorizontal: 20, gap: 10, marginBottom: 25 },
    tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, gap: 8 },
    activeTab: { backgroundColor: '#5856d6' },
    inactiveTab: { backgroundColor: '#1c1c1e' },
    tabLabel: { fontWeight: '700', fontSize: 15 },
    activeTabLabel: { color: '#fff' },
    inactiveTabLabel: { color: 'rgba(255,255,255,0.7)' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    seeAll: { fontSize: 14, color: '#5856d6', fontWeight: '700' },
    recentList: { paddingHorizontal: 20, gap: 12 },
    recentCard: { width: 110, height: 170, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1c1c1e' },
    recentBg: { ...StyleSheet.absoluteFillObject },
    recentGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
    createCard: { backgroundColor: '#2c2c2e', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    createIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#5856d6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    createLabel: { color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 18 },
    recentAvatarContainer: { position: 'absolute', top: 12, left: 12, borderWidth: 2, borderColor: '#5856d6', borderRadius: 18, padding: 1 },
    recentAvatar: { width: 28, height: 28, borderRadius: 14 },
    recentInfo: { position: 'absolute', bottom: 12, left: 12 },
    recentName: { color: '#fff', fontSize: 13, fontWeight: '800' },
    recentTime: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 1 },

    sectionTitleGrid: { fontSize: 20, fontWeight: '800', color: '#fff', paddingHorizontal: 20, marginTop: 35, marginBottom: 15 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 18, justifyContent: 'space-between' },
    feedCard: { width: COLUMN_WIDTH, height: COLUMN_WIDTH * 1.6, borderRadius: 22, overflow: 'hidden', marginBottom: 18, backgroundColor: '#1c1c1e' },
    feedImage: { ...StyleSheet.absoluteFillObject },
    feedGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
    playIconOverlay: { position: 'absolute', top: 15, right: 15, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    feedOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    feedBottomInfo: { flex: 1, marginRight: 5 },
    feedAuthor: { color: '#fff', fontSize: 14, fontWeight: '800' },
    feedTitle: { color: '#fff', fontSize: 12, marginTop: 3, opacity: 0.9 },
    likesContainer: { alignItems: 'center' },
    likesText: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 3 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 50 },
    emptyText: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 20, fontSize: 16, fontWeight: '600' },
});
