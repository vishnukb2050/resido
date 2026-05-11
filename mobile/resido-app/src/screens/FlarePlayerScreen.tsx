import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, ActivityIndicator, FlatList, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { threadApi } from '../services/api';

const { width, height } = Dimensions.get('window');
const SCREEN_HEIGHT = height;

interface Flare {
    id: string;
    title: string;
    content: string;
    authorName: string;
    authorAvatar?: string;
    location?: string;
    mediaUrls: string[];
    likesCount: number;
    commentsCount: number;
    resharesCount: number;
    musicName?: string;
    isVerified?: boolean;
}

export default function FlarePlayerScreen() {
    const { initialId } = useLocalSearchParams();
    const [flares, setFlares] = useState<Flare[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchFlares();
    }, []);

    const fetchFlares = async () => {
        try {
            setLoading(true);
            const { data } = await threadApi.getFlares();
            setFlares(data);
            
            if (initialId) {
                const idx = data.findIndex((f: any) => f.id === initialId);
                if (idx !== -1) setActiveIndex(idx);
            }
        } catch (error) {
            console.error('Failed to fetch flares for feed', error);
        } finally {
            setLoading(false);
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    const renderItem = ({ item, index }: { item: Flare, index: number }) => (
        <FlareItem 
            flare={item} 
            isActive={index === activeIndex} 
            onBack={() => router.back()}
        />
    );

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            {flares.length > 0 && (
                <FlatList
                    data={flares}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    pagingEnabled
                    showsVerticalScrollIndicator={false}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
                    getItemLayout={(_, index) => ({
                        length: SCREEN_HEIGHT,
                        offset: SCREEN_HEIGHT * index,
                        index,
                    })}
                    initialScrollIndex={activeIndex}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={3}
                    windowSize={5}
                />
            )}
        </View>
    );
}

function FlareItem({ flare, isActive, onBack }: { flare: Flare, isActive: boolean, onBack: () => void }) {
    const [status, setStatus] = useState<any>({});
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const video = useRef<Video>(null);
    const insets = useSafeAreaInsets();

    const toggleLike = async () => {
        setLiked(!liked);
        try {
            await threadApi.toggleLike(flare.id);
        } catch (e) {
            setLiked(liked);
        }
    };

    return (
        <View style={[styles.flareItem, { height: SCREEN_HEIGHT }]}>
            <Video
                ref={video}
                style={styles.video}
                source={{ uri: flare.mediaUrls[0] }}
                useNativeControls={false}
                resizeMode={ResizeMode.COVER}
                isLooping
                shouldPlay={isActive}
                onPlaybackStatusUpdate={status => setStatus(() => status)}
            />

            {/* Side Actions */}
            <View style={styles.sideActions}>
                <View style={styles.avatarContainer}>
                    <Image 
                        source={{ uri: flare.authorAvatar || `https://randomuser.me/api/portraits/lego/${Math.floor(Math.random() * 8)}.jpg` }} 
                        style={styles.authorAvatar} 
                    />
                    <TouchableOpacity style={styles.plusBtn}>
                        <Ionicons name="add" size={14} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ActionIcon 
                    icon="heart" 
                    label={flare.likesCount.toString()} 
                    active={liked} 
                    activeColor="#ff2d55" 
                    onPress={toggleLike}
                />
                <ActionIcon 
                    icon="chatbubble-ellipses" 
                    label={flare.commentsCount.toString()} 
                    onPress={() => {}} 
                />
                <ActionIcon 
                    icon="repeat" 
                    label={flare.resharesCount.toString()} 
                    onPress={() => {}} 
                />
                <ActionIcon 
                    icon="share-social" 
                    label="Share" 
                    onPress={() => {}} 
                />
                <ActionIcon 
                    icon="bookmark" 
                    label="Save" 
                    active={saved} 
                    activeColor="#ffcc00" 
                    onPress={() => setSaved(!saved)}
                />
            </View>

            {/* Bottom Info Overlay */}
            <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.flareHeader}>
                    <View style={styles.badge}>
                        <Ionicons name="sparkles" size={12} color="#ffcc00" />
                        <Text style={styles.badgeText}>Top Flare</Text>
                    </View>
                </View>
                
                <View style={styles.authorInfo}>
                    <Text style={styles.username}>@{flare.authorName}</Text>
                    {flare.isVerified && <MaterialCommunityIcons name="check-decagram" size={18} color="#6366f1" style={styles.verified} />}
                </View>
                
                <Text style={styles.locationText}>{flare.location || 'Greenwood Residency'}</Text>
                <Text style={styles.timeText}>2h ago • 🌐</Text>
                
                <Text style={styles.titleText}>{flare.title}</Text>
                <Text style={styles.descriptionText} numberOfLines={2}>{flare.content}</Text>
                
                <View style={styles.musicRow}>
                    <Ionicons name="musical-notes" size={14} color="#fff" />
                    <Text style={styles.musicText}>{flare.musicName || 'Golden Hour - JVKE'}</Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                <View 
                    style={[
                        styles.progressBar, 
                        { width: `${(status.positionMillis / status.durationMillis) * 100}%` }
                    ]} 
                />
            </View>

            {/* Top Actions */}
            <View style={[styles.topActions, { top: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreBtn}>
                    <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function ActionIcon({ icon, label, active, activeColor, onPress }: any) {
    return (
        <TouchableOpacity style={styles.actionIcon} onPress={onPress}>
            <Ionicons name={active ? icon : `${icon}-outline`} size={34} color={active ? activeColor : "#fff"} />
            <Text style={styles.actionLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    flareItem: { width: width, backgroundColor: '#000' },
    video: { ...StyleSheet.absoluteFillObject },
    
    topActions: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
    backBtn: { padding: 8 },
    moreBtn: { padding: 8 },

    sideActions: { position: 'absolute', right: 15, bottom: 100, alignItems: 'center', gap: 20, zIndex: 10 },
    avatarContainer: { marginBottom: 10, alignItems: 'center' },
    authorAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#fff' },
    plusBtn: { position: 'absolute', bottom: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
    
    actionIcon: { alignItems: 'center' },
    actionLabel: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },

    bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 80, paddingHorizontal: 20, zIndex: 10 },
    flareHeader: { marginBottom: 12 },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', gap: 6 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    
    authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    username: { color: '#fff', fontSize: 18, fontWeight: '900' },
    verified: { marginLeft: 2 },
    locationText: { color: '#fff', fontSize: 13, fontWeight: '600', opacity: 0.9 },
    timeText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
    
    titleText: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 15 },
    descriptionText: { color: '#fff', fontSize: 14, lineHeight: 20, marginTop: 5, opacity: 0.9 },
    
    musicRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, alignSelf: 'flex-start' },
    musicText: { color: '#fff', fontSize: 13, fontWeight: '600' },

    progressBarContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', zIndex: 20 },
    progressBar: { height: '100%', backgroundColor: '#6366f1' },
});
