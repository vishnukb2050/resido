import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, ActivityIndicator, FlatList, Image, Share, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { io } from 'socket.io-client';
import { threadApi, API_URL } from '../services/api';
import { useAuthStore } from '../store/authStore';
import CommentSheet from '../components/CommentSheet';

const { width, height } = Dimensions.get('window');
const SCREEN_HEIGHT = height;

interface Flare {
    id: string;
    title: string;
    content: string;
    authorName: string;
    authorId: string;
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
    const { initialId, feedType, followingIds } = useLocalSearchParams();
    const [flares, setFlares] = useState<Flare[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchFlares();
    }, [feedType, initialId]);

    const fetchFlares = async () => {
        try {
            setLoading(true);
            const fIds = typeof followingIds === 'string' ? followingIds.split(',') : [];
            const type = (feedType as string) || 'PUBLIC';
            
            let fetchedFlares: any[] = [];
            
            if (type === 'FORYOU') {
                // Combine Following + Public with Priority
                const { data: followingFlares } = await threadApi.getFlares({ feedType: 'FOLLOWING', followingIds: fIds });
                const { data: publicFlares } = await threadApi.getFlares({ feedType: 'PUBLIC' });
                
                const combined = [...followingFlares, ...publicFlares];
                // Deduplicate
                fetchedFlares = Array.from(new Map(combined.map(f => [f.id, f])).values());
                
                // Sort: Following first, then by date
                fetchedFlares.sort((a, b) => {
                    const aIsFollowing = fIds.includes(a.authorId);
                    const bIsFollowing = fIds.includes(b.authorId);
                    if (aIsFollowing && !bIsFollowing) return -1;
                    if (!aIsFollowing && bIsFollowing) return 1;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });
            } else {
                const { data } = await threadApi.getFlares({ 
                    feedType: type as any, 
                    followingIds: fIds 
                });
                fetchedFlares = data;
            }

            setFlares(fetchedFlares);
            
            if (initialId) {
                const idx = fetchedFlares.findIndex((f: any) => f.id === initialId);
                if (idx !== -1) setActiveIndex(idx);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSave = (id: string, saved: boolean, savesCount: number) => {
        setFlares(prev => prev.map(f => f.id === id ? { ...f, saved, savesCount } : f));
    };

    const handleToggleLike = (id: string, liked: boolean, likesCount: number) => {
        setFlares(prev => prev.map(f => f.id === id ? { ...f, liked, likesCount } : f));
    };

    const handleToggleReshare = (id: string, reshared: boolean, resharesCount: number) => {
        setFlares(prev => prev.map(f => f.id === id ? { ...f, reshared, resharesCount } : f));
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
            onFinish={() => {
                if (activeIndex < flares.length - 1) {
                    setActiveIndex(activeIndex + 1);
                }
            }}
            onToggleSave={handleToggleSave}
            onToggleLike={handleToggleLike}
            onToggleReshare={handleToggleReshare}
        />
    );

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0d9488" />
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

function FlareItem({ flare, isActive, onBack, onFinish, onToggleSave, onToggleLike, onToggleReshare }: { flare: any, isActive: boolean, onBack: () => void, onFinish: () => void, onToggleSave: (id: string, saved: boolean, count: number) => void, onToggleLike: (id: string, liked: boolean, count: number) => void, onToggleReshare: (id: string, reshared: boolean, count: number) => void }) {
    const [status, setStatus] = useState<any>({});
    const [liked, setLiked] = useState(flare.liked || false);
    const [saved, setSaved] = useState(flare.saved || false);
    const [reshared, setReshared] = useState(flare.reshared || false);
    const [displayLikes, setDisplayLikes] = useState(flare.likesCount || 0);
    const [displayComments, setDisplayComments] = useState(flare.commentsCount || 0);
    const [displayReshares, setDisplayReshares] = useState(flare.resharesCount || 0);
    const [displaySaves, setDisplaySaves] = useState(flare.savesCount || 0);
    const [showHeart, setShowHeart] = useState(false);
    const lastTap = useRef<number>(0);
    const video = useRef<Video>(null);
    const [showComments, setShowComments] = useState(false);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();

    useEffect(() => {
        setLiked(flare.liked || false);
        setSaved(flare.saved || false);
        setReshared(flare.reshared || false);
        setDisplayLikes(flare.likesCount || 0);
        setDisplaySaves(flare.savesCount || 0);
        setDisplayReshares(flare.resharesCount || 0);
    }, [flare]);

    useEffect(() => {
        if (!flare.id || !activeWorkspace) return;

        // Connect to flares namespace for live comments
        const socket = io(`${API_URL}/flares`, {
            transports: ['websocket'],
            auth: { 
                tenantId: activeWorkspace?.tenantId,
                dbName: activeWorkspace?.dbName,
                memberId: user?.id 
            }
        });

        socket.on('connect', () => {
            socket.emit('join_flare', { flareId: flare.id });
        });

        socket.on('new_comment', (data) => {
            if (data.blogId === flare.id) {
                setDisplayComments((prev: number) => (prev || 0) + 1);
            }
        });

        return () => { 
            socket.disconnect(); 
        };
    }, [flare.id, activeWorkspace]);

    const toggleLike = async () => {
        try {
            const newLiked = !liked;
            const newCount = newLiked ? displayLikes + 1 : Math.max(0, displayLikes - 1);
            setLiked(newLiked);
            setDisplayLikes(newCount);
            await threadApi.toggleLike(flare.id);
            onToggleLike(flare.id, newLiked, newCount);
        } catch (e) {
            console.error(e);
            setLiked(liked);
            setDisplayLikes(displayLikes);
        }
    };

    const handleDoubleTap = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
            if (!liked) toggleLike();
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 800);
        } else {
            lastTap.current = now;
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${flare.title}\n\n${flare.content}\n\nShared via Resido App`,
                url: flare.mediaUrls[0]
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Flare',
            'Remove this flare forever?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await threadApi.deleteBlog(flare.id);
                            Alert.alert('Success', 'Flare deleted', [
                                { text: 'OK', onPress: onBack }
                            ]);
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete flare');
                        }
                    }
                }
            ]
        );
    };

    const handleEdit = () => {
        router.push({
            pathname: '/create-flare',
            params: { editId: flare.id }
        });
    };

    const handleReshare = async () => {
        try {
            const newReshared = !reshared;
            const newCount = newReshared ? (displayReshares || 0) + 1 : Math.max(0, (displayReshares || 0) - 1);
            setReshared(newReshared);
            setDisplayReshares(newCount);
            
            await threadApi.reshare(flare.id, {
                authorName: user?.name || "Anonymous",
                authorAvatar: user?.profilePhoto
            });
            
            onToggleReshare(flare.id, newReshared, newCount);
            Alert.alert('Success', newReshared ? 'Flare reshared to your profile!' : 'Flare removed from your profile!');
        } catch (e) {
            console.error(e);
            setReshared(reshared);
            setDisplayReshares(displayReshares);
            Alert.alert('Error', 'Failed to update reshare status');
        }
    };

    const toggleSave = async () => {
        try {
            const newSaved = !saved;
            const newCount = newSaved ? (displaySaves || 0) + 1 : Math.max(0, (displaySaves || 0) - 1);
            setSaved(newSaved);
            setDisplaySaves(newCount);
            await threadApi.toggleSave(flare.id);
            onToggleSave(flare.id, newSaved, newCount);
        } catch (e) {
            console.error(e);
            setSaved(saved);
            setDisplaySaves(displaySaves);
        }
    };

    return (
        <View style={[styles.flareItem, { height: SCREEN_HEIGHT }]}>
            <TouchableOpacity 
                activeOpacity={1} 
                style={StyleSheet.absoluteFill} 
                onPress={handleDoubleTap}
            >
                <Video
                    ref={video}
                    style={styles.video}
                    source={{ uri: flare.mediaUrls[0] }}
                    useNativeControls={false}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    shouldPlay={isActive}
                    onPlaybackStatusUpdate={status => {
                        setStatus(() => status);
                        // Correctly handle status types
                        if (status.isLoaded && status.didJustFinish && !status.isLooping) {
                            onFinish();
                        }
                    }}
                    onError={(error) => {
                        console.error('Video load error:', error);
                    }}
                />
            </TouchableOpacity>

            {showHeart && (
                <View style={styles.heartOverlay}>
                    <Ionicons name="heart" size={100} color="rgba(255, 45, 85, 0.8)" />
                </View>
            )}

            {/* Side Actions */}
            <View style={styles.sideActions}>
                <TouchableOpacity 
                    style={styles.avatarContainer}
                    onPress={() => router.push({
                        pathname: '/member-profile',
                        params: { 
                            userId: flare.authorId,
                            name: flare.authorName,
                            profileName: flare.authorName,
                            profilePhoto: flare.authorAvatar
                        }
                    })}
                >
                    <Image 
                        source={{ uri: flare.authorAvatar || `https://randomuser.me/api/portraits/lego/${Math.floor(Math.random() * 8)}.jpg` }} 
                        style={styles.authorAvatar} 
                    />
                    <TouchableOpacity style={styles.plusBtn}>
                        <Ionicons name="add" size={14} color="#fff" />
                    </TouchableOpacity>
                </TouchableOpacity>

                <ActionIcon 
                    icon="heart" 
                    label={displayLikes.toString()} 
                    active={liked} 
                    activeColor="#ff2d55" 
                    onPress={toggleLike}
                />
                <ActionIcon 
                    icon="chatbubble-ellipses" 
                    label={displayComments.toString()} 
                    onPress={() => setShowComments(true)} 
                />
                <ActionIcon 
                    icon="repeat" 
                    label={displayReshares.toString()} 
                    active={reshared}
                    activeColor="#ffcc00"
                    onPress={handleReshare} 
                />
                <ActionIcon 
                    icon="share-social" 
                    label="Share" 
                    onPress={handleShare} 
                />
                <ActionIcon 
                    icon="bookmark" 
                    label={displaySaves.toString()} 
                    active={saved} 
                    activeColor="#ffcc00" 
                    onPress={toggleSave}
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
                
                <TouchableOpacity 
                    style={styles.authorInfo}
                    onPress={() => router.push({
                        pathname: '/member-profile',
                        params: { 
                            userId: flare.authorId,
                            name: flare.authorName,
                            profileName: flare.authorName,
                            profilePhoto: flare.authorAvatar
                        }
                    })}
                >
                    <Text style={styles.username}>@{flare.authorName}</Text>
                    {flare.isVerified && <MaterialCommunityIcons name="check-decagram" size={18} color="#0d9488" style={styles.verified} />}
                </TouchableOpacity>
                
                <Text style={styles.locationText}>{flare.location || 'Greenwood Residency'}</Text>
                <Text style={styles.timeText}>2h ago • 🌐</Text>
                
                <Text style={styles.titleText}>{flare.title}</Text>
                <Text style={styles.descriptionText} numberOfLines={2}>{flare.content}</Text>
                
                <View style={styles.musicRow}>
                    <Ionicons name="musical-notes" size={14} color="#fff" />
                    <Text style={styles.musicText}>{flare.musicName || 'Golden Hour - JVKE'}</Text>
                </View>

                {/* Poll Section */}
                {flare.poll && (
                    <View style={styles.pollContainer}>
                        <Text style={styles.pollQuestion}>{flare.poll.question}</Text>
                        
                        {flare.poll.options.map((opt: any) => {
                            const totalVotes = flare.poll.options.reduce((sum: number, o: any) => sum + (o._count?.votes || 0), 0);
                            const percentage = totalVotes > 0 ? Math.round(((opt._count?.votes || 0) / totalVotes) * 100) : 0;
                            const hasVoted = flare.poll.votes && flare.poll.votes.length > 0;
                            const isSelected = hasVoted && flare.poll.votes[0].optionId === opt.id;
                            const isExpired = new Date(flare.poll.expiresAt) < new Date();

                            if (hasVoted || isExpired) {
                                return (
                                    <View key={opt.id} style={styles.resultItem}>
                                        <View style={styles.resultLabelRow}>
                                            <Text style={[styles.resultText, isSelected && styles.selectedResultText]}>{opt.text}</Text>
                                            <Text style={styles.resultPercentage}>{percentage}%</Text>
                                        </View>
                                        <View style={styles.progressBg}>
                                            <View style={[styles.progressFill, { width: `${percentage}%` }, isSelected && { backgroundColor: '#0d9488' }]} />
                                        </View>
                                    </View>
                                );
                            }

                            return (
                                <TouchableOpacity 
                                    key={opt.id} 
                                    style={styles.pollOptionBtn}
                                    onPress={() => {
                                        threadApi.votePoll(flare.poll.id, opt.id)
                                            .then(() => {
                                                // We don't have a direct way to refresh the individual flare object easily here
                                                // but we can at least notify the user or try to refresh
                                                Alert.alert("Success", "Vote recorded!");
                                            })
                                            .catch(e => {
                                                console.error(e);
                                                Alert.alert("Error", "Failed to vote");
                                            });
                                    }}
                                >
                                    <Text style={styles.pollOptionText}>{opt.text}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
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
                {flare.authorId === user?.id && (
                    <TouchableOpacity style={styles.moreBtn} onPress={() => {
                        Alert.alert(
                            'Flare Options',
                            'Manage your flare',
                            [
                                { text: 'Edit', onPress: handleEdit },
                                { text: 'Delete', onPress: handleDelete, style: 'destructive' },
                                { text: 'Cancel', style: 'cancel' }
                            ]
                        );
                    }}>
                        <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            {showComments && (
                <CommentSheet 
                    flareId={flare.id}
                    authorId={flare.authorId}
                    onClose={() => setShowComments(false)}
                />
            )}
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
    heartOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 15 },
    
    topActions: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
    backBtn: { padding: 8 },
    moreBtn: { padding: 8 },

    sideActions: { position: 'absolute', right: 15, bottom: 100, alignItems: 'center', gap: 20, zIndex: 10 },
    avatarContainer: { marginBottom: 10, alignItems: 'center' },
    authorAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#fff' },
    plusBtn: { position: 'absolute', bottom: -5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#0d9488', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
    
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
    progressBar: { height: '100%', backgroundColor: '#0d9488' },

    // Poll Styles
    pollContainer: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, padding: 15, marginTop: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    pollQuestion: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 12 },
    pollOptionBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    pollOptionText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    resultItem: { marginBottom: 10 },
    resultLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    resultText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    selectedResultText: { color: '#fff', fontWeight: '800' },
    resultPercentage: { fontSize: 13, fontWeight: '800', color: '#fff' },
    progressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
});
