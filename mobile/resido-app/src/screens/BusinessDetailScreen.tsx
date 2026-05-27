import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    Image, SafeAreaView, ActivityIndicator, Dimensions, 
    Modal, TextInput, Alert, StatusBar, FlatList
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { businessApi, threadApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import * as SecureStore from 'expo-secure-store';
import { Video, ResizeMode } from 'expo-av';
import { resolveMediaUrl } from '../utils/mediaUrl';

const { width } = Dimensions.get('window');
const SECURE_STORE_KEY = 'resido_saved_businesses';

export default function BusinessDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { user } = useAuthStore();

    const scrollViewRef = useRef<ScrollView>(null);
    const [bookingY, setBookingY] = useState(0);

    // Data states
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [slots, setSlots] = useState<any[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [businessPosts, setBusinessPosts] = useState<any[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    
    // Save state
    const [isSaved, setIsSaved] = useState(false);

    // Date picker states (next 7 days)
    const [datesList, setDatesList] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('');

    // Booking form states
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [selectedInterval, setSelectedInterval] = useState<string>('');
    const [bookingModalVisible, setBookingModalVisible] = useState(false);
    const [guestCount, setGuestCount] = useState(1);
    const [userName, setUserName] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [bookingSubmitting, setBookingSubmitting] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);

    const parseSlotDescription = (desc: string | null) => {
        if (!desc) return { text: '', rules: '', photoUrl: '' };
        try {
            const parsed = JSON.parse(desc);
            if (parsed && typeof parsed === 'object') {
                return {
                    text: parsed.text || '',
                    rules: parsed.rules || '',
                    photoUrl: parsed.photoUrl || '',
                };
            }
        } catch (e) {
            // Not JSON
        }
        return { text: desc, rules: '', photoUrl: '' };
    };

    useEffect(() => {
        if (id) {
            fetchProfileDetail();
            checkSavedStatus();
            generateDatesList();
            fetchBusinessPosts();
        }
    }, [id]);

    useEffect(() => {
        if (profile && selectedDate) {
            fetchDateSlots();
        }
    }, [selectedDate, profile]);

    // Load initial user details for the booking form
    useEffect(() => {
        if (user) {
            setUserName(user.name || '');
            setUserPhone(user.phone || '');
        }
    }, [user]);

    const fetchProfileDetail = async () => {
        try {
            setLoading(true);
            const { data } = await businessApi.getProfile(id as string);
            setProfile(data);
        } catch (error) {
            console.error('Failed to fetch business profile:', error);
            Alert.alert('Error', 'Failed to load business profile. It may have been removed.');
        } finally {
            setLoading(false);
        }
    };

    const generateDatesList = () => {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            
            const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = date.getDate();
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            
            dates.push({
                fullDate: dateStr,
                weekday,
                dayNum,
                month
            });
        }
        setDatesList(dates);
        setSelectedDate(dates[0].fullDate); // Default to today
    };

    const fetchBusinessPosts = async () => {
        try {
            setPostsLoading(true);
            const { data } = await threadApi.getBusinessPosts(id as string);
            setBusinessPosts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load business posts:', error);
            setBusinessPosts([]);
        } finally {
            setPostsLoading(false);
        }
    };

    const fetchDateSlots = async () => {
        try {
            setSlotsLoading(true);
            const { data } = await businessApi.getSlots(id as string, selectedDate);
            setSlots(data || []);
        } catch (error) {
            console.error('Failed to load slots:', error);
            setSlots([]);
        } finally {
            setSlotsLoading(false);
        }
    };

    // expo-secure-store Favorites operations
    const checkSavedStatus = async () => {
        try {
            const savedStr = await SecureStore.getItemAsync(SECURE_STORE_KEY);
            if (savedStr) {
                const list = JSON.parse(savedStr);
                setIsSaved(list.includes(id));
            }
        } catch (e) {
            console.error('Failed to read saved services:', e);
        }
    };

    const toggleSaveProfile = async () => {
        try {
            const savedStr = await SecureStore.getItemAsync(SECURE_STORE_KEY);
            let list = savedStr ? JSON.parse(savedStr) : [];
            
            if (isSaved) {
                list = list.filter((item: string) => item !== id);
                setIsSaved(false);
            } else {
                list.push(id);
                setIsSaved(true);
            }
            await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(list));
        } catch (e) {
            console.error('Failed to save service status:', e);
            Alert.alert('Error', 'Unable to save service status at this time.');
        }
    };

    const handleSelectSlot = (slot: any, time: string) => {
        setSelectedSlot(slot);
        setSelectedInterval(time);
        setGuestCount(1);
        setBookingModalVisible(true);
    };

    const handleConfirmBooking = async () => {
        if (!userName.trim()) {
            Alert.alert('Validation Error', 'Please enter your name.');
            return;
        }
        if (!userPhone.trim()) {
            Alert.alert('Validation Error', 'Please enter your phone number.');
            return;
        }

        try {
            setBookingSubmitting(true);
            const bookingPayload = {
                date: selectedDate,
                timeSlot: selectedInterval,
                persons: guestCount,
                userName: userName.trim(),
                userPhone: userPhone.trim(),
                notes: notes.trim()
            };

            await businessApi.bookSlot(id as string, selectedSlot.id, bookingPayload);
            setBookingModalVisible(false);
            setSuccessModalVisible(true);
            
            // Refresh slots
            fetchDateSlots();
        } catch (error: any) {
            console.error('Booking failed:', error);
            const msg = error.response?.data?.message || 'Failed to submit booking. Slot might be full.';
            Alert.alert('Booking Error', msg);
        } finally {
            setBookingSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#a084ca" />
                <Text style={styles.loadingText}>Loading Profile details...</Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <View style={styles.errorContent}>
                    <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
                    <Text style={styles.errorTitle}>Business Not Found</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Filter gallery items from profile services
    const galleryItems = profile.services?.filter((s: any) => s.pricingType === 'IMAGE' || s.pricingType === 'VIDEO') || [];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header Navbar */}
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.navTitle} numberOfLines={1}>{profile.businessName}</Text>
                <TouchableOpacity onPress={toggleSaveProfile} style={styles.navBtn}>
                    <Ionicons 
                        name={isSaved ? "bookmark" : "bookmark-outline"} 
                        size={24} 
                        color={isSaved ? "#fbbf24" : "#fff"} 
                    />
                </TouchableOpacity>
            </View>

            {/* Owner Actions Bar — only visible to profile owner */}
            {user && profile.userId && profile.userId === user.id && (
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    backgroundColor: '#ffffff',
                    borderBottomWidth: 1,
                    borderBottomColor: '#EFE9F8'
                }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
                        <Text style={{ color: '#9A8EBA', fontSize: 11, fontWeight: '700' }}>Owner View</Text>
                    </View>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row', alignItems: 'center', gap: 6,
                            backgroundColor: 'rgba(29, 78, 216, 0.15)',
                            paddingHorizontal: 14, paddingVertical: 8,
                            borderRadius: 20, borderWidth: 1, borderColor: '#8b5cf6'
                        }}
                        onPress={() => router.push({ pathname: '/business-profile', params: { id: profile.id } })}
                    >
                        <Feather name="edit-3" size={14} color="#a78bfa" />
                        <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '800' }}>Edit Profile</Text>
                    </TouchableOpacity>
                    {profile.slots !== undefined && (
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                paddingHorizontal: 14, paddingVertical: 8,
                                borderRadius: 20, borderWidth: 1, borderColor: '#8b5cf6'
                            }}
                            onPress={() => router.push({ pathname: '/business-profile', params: { id: profile.id, manageSlots: 'true' } })}
                        >
                            <Ionicons name="time" size={14} color="#a78bfa" />
                            <Text style={{ color: '#a78bfa', fontSize: 12, fontWeight: '800' }}>Manage Booking Slots</Text>
                        </TouchableOpacity>
                    )}
                    {profile.slots && profile.slots.length > 0 && (
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                paddingHorizontal: 14, paddingVertical: 8,
                                borderRadius: 20, borderWidth: 1, borderColor: '#10b981'
                            }}
                            onPress={() => router.push({ pathname: '/business-bookings-manage', params: { profileId: profile.id } })}
                        >
                            <Ionicons name="calendar" size={14} color="#10b981" />
                            <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '800' }}>Manage Bookings</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero / Cover */}
                <View style={styles.heroSection}>
                    {profile.logo ? (
                        <Image source={{ uri: resolveMediaUrl(profile.logo) || profile.logo }} style={styles.coverImage} />
                    ) : (
                        <View style={styles.placeholderCover}>
                            <Ionicons name="business" size={60} color="#a084ca" />
                            <Text style={styles.placeholderCoverText}>{profile.category}</Text>
                        </View>
                    )}
                    
                    {/* Floating Info Overlay */}
                    <View style={styles.heroOverlay}>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{profile.category}</Text>
                        </View>
                        {profile.isVerified && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={14} color="#fff" />
                                <Text style={styles.verifiedText}>Verified Partner</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Main Information */}
                <View style={styles.infoSection}>
                    <Text style={styles.businessTitle}>{profile.businessName}</Text>
                    
                    {profile.slots && profile.slots.length > 0 ? (
                        <TouchableOpacity 
                            style={styles.topBookBtn} 
                            onPress={() => scrollViewRef.current?.scrollTo({ y: bookingY, animated: true })}
                        >
                            <Ionicons name="calendar-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.topBookBtnText}>Book a Slot</Text>
                        </TouchableOpacity>
                    ) : null}
                    
                    {profile.about ? (
                        <Text style={styles.aboutText}>{profile.about}</Text>
                    ) : null}

                    {/* Quick Specs (Address, Contact info) */}
                    <View style={styles.specsGrid}>
                        {profile.phone ? (
                            <View style={styles.specCard}>
                                <Ionicons name="call" size={16} color="#a084ca" />
                                <Text style={styles.specVal}>{profile.phone}</Text>
                            </View>
                        ) : null}

                        {profile.area ? (
                            <View style={styles.specCard}>
                                <Ionicons name="location" size={16} color="#a084ca" />
                                <Text style={styles.specVal} numberOfLines={1}>{profile.area}</Text>
                            </View>
                        ) : null}
                        
                        <View style={styles.specCard}>
                            <Ionicons name="time" size={16} color="#a084ca" />
                            <Text style={styles.specVal}>Mon - Sun (9 AM - 6 PM)</Text>
                        </View>
                    </View>
                </View>

                {/* Showcase Showcase Gallery (Step 2 Visual Items) */}
                {galleryItems.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeaderTitle}>Showcase Gallery</Text>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={styles.galleryScroll}
                        >
                            {galleryItems.map((item: any, idx: number) => (
                                <View key={item.id || idx.toString()} style={styles.galleryCard}>
                                    <View style={styles.galleryMediaBox}>
                                        {item.pricingType === 'IMAGE' && item.responseTime ? (
                                            <Image source={{ uri: item.responseTime }} style={styles.galleryMedia} />
                                        ) : item.pricingType === 'VIDEO' ? (
                                            <View style={styles.videoPlaceholder}>
                                                <Ionicons name="play-circle" size={48} color="#a084ca" />
                                                <Text style={styles.videoText}>Video Showcase</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.imagePlaceholder}>
                                                <Ionicons name="image-outline" size={48} color="#475569" />
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.galleryMeta}>
                                        <Text style={styles.galleryItemTitle} numberOfLines={1}>{item.name}</Text>
                                        {item.description ? (
                                            <Text style={styles.galleryItemDesc} numberOfLines={2}>{item.description}</Text>
                                        ) : null}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                ) : null}

                {/* Business posts (flares + threads pinned to this profile) */}
                {(postsLoading || businessPosts.length > 0) && (
                    <View style={styles.section}>
                        <View style={styles.bookingHeaderRow}>
                            <Text style={styles.sectionHeaderTitle}>Recent Posts</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="albums-outline" size={16} color="#a084ca" />
                                <Text style={{ color: '#a084ca', fontSize: 12, fontWeight: '800' }}>{businessPosts.length}</Text>
                            </View>
                        </View>
                        {postsLoading ? (
                            <View style={styles.slotLoaderBox}>
                                <ActivityIndicator size="small" color="#a084ca" />
                                <Text style={styles.slotLoaderText}>Loading posts...</Text>
                            </View>
                        ) : (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.galleryScroll}
                            >
                                {businessPosts.map((post: any) => {
                                    const firstMedia = resolveMediaUrl(post.mediaUrls?.[0]);
                                    const isFlare = post.type === 'FLARE';
                                    const isVideo =
                                        post.mediaType === 'VIDEO' ||
                                        (firstMedia && (/\.(mp4|mov|m4v|webm)(\?|$)/i.test(firstMedia) || firstMedia.includes('/videos/')));
                                    return (
                                        <TouchableOpacity
                                            key={post.id}
                                            style={styles.galleryCard}
                                            activeOpacity={0.85}
                                            onPress={() => {
                                                if (isFlare) {
                                                    router.push({ pathname: '/flare-player', params: { initialId: post.id, feedType: 'PUBLIC' } });
                                                } else {
                                                    router.push(`/thread/${post.id}` as any);
                                                }
                                            }}
                                        >
                                            <View style={styles.galleryMediaBox}>
                                                {firstMedia ? (
                                                    isVideo ? (
                                                        <Video
                                                            source={{ uri: firstMedia, overrideFileExtension: 'mp4' } as any}
                                                            style={styles.galleryMedia}
                                                            resizeMode={ResizeMode.COVER}
                                                            isMuted
                                                            shouldPlay={false}
                                                            useNativeControls={false}
                                                        />
                                                    ) : (
                                                        <Image source={{ uri: firstMedia }} style={styles.galleryMedia} />
                                                    )
                                                ) : (
                                                    <View style={styles.imagePlaceholder}>
                                                        <Ionicons name={isFlare ? 'play-circle' : 'chatbubble-ellipses-outline'} size={36} color="#475569" />
                                                    </View>
                                                )}
                                                <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: isFlare ? '#ef4444' : '#1d4ed8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                                    <Text style={{ color: '#2D2445', fontSize: 10, fontWeight: '900' }}>
                                                        {isFlare ? 'FLARE' : 'THREAD'}
                                                    </Text>
                                                </View>
                                                {isVideo && (
                                                    <View style={{ position: 'absolute', bottom: 8, right: 8 }}>
                                                        <Ionicons name="play-circle" size={28} color="#fff" />
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.galleryMeta}>
                                                <Text style={styles.galleryItemTitle} numberOfLines={1}>{post.title || post.content || 'Post'}</Text>
                                                {post.content && post.title ? (
                                                    <Text style={styles.galleryItemDesc} numberOfLines={2}>{post.content}</Text>
                                                ) : null}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                )}

                {/* Slots Strip Calendar & Booking */}
                <View 
                    style={styles.section}
                    onLayout={(event) => {
                        setBookingY(event.nativeEvent.layout.y);
                    }}
                >
                    <View style={styles.bookingHeaderRow}>
                        <Text style={styles.sectionHeaderTitle}>Book an Appointment</Text>
                        <Ionicons name="sparkles" size={18} color="#fbbf24" />
                    </View>

                    {/* Date Horizontal Strip */}
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.dateStripScroll}
                    >
                        {datesList.map((dt) => {
                            const isAct = selectedDate === dt.fullDate;
                            return (
                                <TouchableOpacity 
                                    key={dt.fullDate} 
                                    style={[styles.dateCard, isAct && styles.dateCardActive]}
                                    onPress={() => setSelectedDate(dt.fullDate)}
                                >
                                    <Text style={[styles.dateWkday, isAct && styles.dateWkdayActive]}>{dt.weekday}</Text>
                                    <Text style={[styles.dateNum, isAct && styles.dateNumActive]}>{dt.dayNum}</Text>
                                    <Text style={[styles.dateMonth, isAct && styles.dateMonthActive]}>{dt.month}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Available Slots List */}
                    <Text style={styles.slotSubTitle}>Available Slots for {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
                    
                    {slotsLoading ? (
                        <View style={styles.slotLoaderBox}>
                            <ActivityIndicator size="small" color="#a084ca" />
                            <Text style={styles.slotLoaderText}>Loading slots...</Text>
                        </View>
                    ) : slots.length === 0 ? (
                        <View style={styles.emptySlotsBox}>
                            <Ionicons name="calendar-outline" size={36} color="#475569" style={{ marginBottom: 8 }} />
                            <Text style={styles.emptySlotsText}>No booking slots active on this day.</Text>
                        </View>
                    ) : (
                        <View style={styles.slotsContainer}>
                            {slots.map((slot) => {
                                const parsed = parseSlotDescription(slot.description);
                                return (
                                    <View key={slot.id} style={styles.slotItemRow}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                            {parsed.photoUrl ? (
                                                <Image source={{ uri: parsed.photoUrl }} style={{ width: 44, height: 44, borderRadius: 8, marginRight: 12, resizeMode: 'cover' }} />
                                            ) : (
                                                <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: 'rgba(139, 92, 246, 0.1)', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                                                    <Ionicons name="time" size={18} color="#8b5cf6" />
                                                </View>
                                            )}
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.slotItemName}>{slot.name}</Text>
                                                {parsed.text ? (
                                                    <Text style={styles.slotItemDesc} numberOfLines={2}>{parsed.text}</Text>
                                                ) : null}
                                            </View>
                                        </View>
                                        
                                        {parsed.rules ? (
                                            <View style={{ backgroundColor: 'rgba(251, 191, 36, 0.05)', borderLeftWidth: 3, borderColor: '#fbbf24', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginBottom: 12 }}>
                                                <Text style={{ fontSize: 11, color: '#fbbf24', fontWeight: '600' }}>Rules: {parsed.rules}</Text>
                                            </View>
                                        ) : null}
                                        
                                        <View style={styles.intervalsWrap}>
                                            {slot.timeSlots && slot.timeSlots.length > 0 ? (
                                                slot.timeSlots.map((interval: string) => (
                                                    <TouchableOpacity
                                                        key={interval}
                                                        style={styles.intervalBtn}
                                                        onPress={() => handleSelectSlot(slot, interval)}
                                                    >
                                                        <Ionicons name="time-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                                                        <Text style={styles.intervalText}>{interval}</Text>
                                                    </TouchableOpacity>
                                                ))
                                            ) : (
                                                <Text style={styles.noIntervals}>Closed</Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
                
                <View style={{ height: 60 }} />
            </ScrollView>

            {/* Modal 1: Booking Modifiers Form */}
            <Modal
                visible={bookingModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setBookingModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalHeaderTitle}>Confirm Reservation</Text>
                            <TouchableOpacity onPress={() => setBookingModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalFormContent} showsVerticalScrollIndicator={false}>
                            {/* Summary specs */}
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryLabel}>Business</Text>
                                <Text style={styles.summaryVal}>{profile.businessName}</Text>
                                
                                <Text style={styles.summaryLabel}>Service/Slot</Text>
                                <Text style={styles.summaryVal}>{selectedSlot?.name}</Text>

                                <Text style={styles.summaryLabel}>Date & Time</Text>
                                <Text style={styles.summaryVal}>
                                    {selectedDate} • {selectedInterval}
                                </Text>

                                {selectedSlot && parseSlotDescription(selectedSlot.description).rules ? (
                                    <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EFE9F8' }}>
                                        <Text style={[styles.summaryLabel, { color: '#fbbf24' }]}>Important Rules</Text>
                                        <Text style={{ fontSize: 12, color: '#fbbf24', fontWeight: '600' }}>
                                            {parseSlotDescription(selectedSlot.description).rules}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* Guest modifier */}
                            <Text style={styles.formLabel}>Number of Guests</Text>
                            <View style={styles.guestModifierRow}>
                                <TouchableOpacity 
                                    style={styles.guestBtn}
                                    onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
                                >
                                    <Ionicons name="remove" size={20} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.guestCountVal}>{guestCount}</Text>
                                <TouchableOpacity 
                                    style={styles.guestBtn}
                                    onPress={() => setGuestCount(Math.min(selectedSlot?.maxPersons || 10, guestCount + 1))}
                                >
                                    <Ionicons name="add" size={20} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.maxGuestText}>Max {selectedSlot?.maxPersons || 1} person(s)</Text>
                            </View>

                            {/* Textfields */}
                            <Text style={styles.formLabel}>Your Name</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="Enter name"
                                placeholderTextColor="#64748b"
                                value={userName}
                                onChangeText={setUserName}
                            />

                            <Text style={styles.formLabel}>Phone Number</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="Enter phone"
                                placeholderTextColor="#64748b"
                                keyboardType="phone-pad"
                                value={userPhone}
                                onChangeText={setUserPhone}
                            />

                            <Text style={styles.formLabel}>Special Notes (Optional)</Text>
                            <TextInput
                                style={[styles.formInput, styles.formInputArea]}
                                placeholder="Enter any extra requests or notes"
                                placeholderTextColor="#64748b"
                                multiline={true}
                                numberOfLines={3}
                                value={notes}
                                onChangeText={setNotes}
                            />

                            <TouchableOpacity 
                                style={styles.bookingConfirmBtn}
                                onPress={handleConfirmBooking}
                                disabled={bookingSubmitting}
                            >
                                {bookingSubmitting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.bookingConfirmBtnText}>Submit Reservation</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal 2: Success Premium Overlay */}
            <Modal
                visible={successModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setSuccessModalVisible(false)}
            >
                <View style={styles.successBackdrop}>
                    <View style={styles.successCard}>
                        <View style={styles.successCheckCircle}>
                            <Ionicons name="checkmark" size={54} color="#10b981" />
                        </View>
                        <Text style={styles.successTitle}>Booking Confirmed! 🚀</Text>
                        <Text style={styles.successSub}>
                            Your slot for {selectedSlot?.name} on {selectedDate} at {selectedInterval} was reserved successfully.
                        </Text>
                        
                        <TouchableOpacity 
                            style={styles.successDoneBtn}
                            onPress={() => {
                                setSuccessModalVisible(false);
                                router.replace('/business-bookings');
                            }}
                        >
                            <Text style={styles.successDoneBtnText}>Go to Bookings Dashboard</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    loadingContainer: { flex: 1, backgroundColor: '#F8F5FF', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#9A8EBA', fontSize: 15, marginTop: 12, fontWeight: '600' },
    
    errorContainer: { flex: 1, backgroundColor: '#F8F5FF' },
    errorContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorTitle: { color: '#2D2445', fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 24 },
    backBtn: { backgroundColor: '#8b5cf6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    backBtnText: { color: '#2D2445', fontWeight: '800' },

    // Navbar
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EFE9F8' },
    navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    navTitle: { flex: 1, color: '#2D2445', fontSize: 18, fontWeight: '800', textAlign: 'center', marginHorizontal: 12 },

    scrollContent: { paddingBottom: 40 },

    // Hero / Logo banner
    heroSection: { width: '100%', height: 220, position: 'relative', overflow: 'hidden' },
    coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    placeholderCover: { width: '100%', height: '100%', backgroundColor: 'rgba(160, 132, 202, 0.08)', alignItems: 'center', justifyContent: 'center' },
    placeholderCoverText: { color: '#a084ca', fontSize: 18, fontWeight: '900', marginTop: 8 },
    heroOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', gap: 10 },
    categoryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#8b5cf6' },
    categoryBadgeText: { color: '#2D2445', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
    verifiedBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', gap: 4 },
    verifiedText: { color: '#2D2445', fontSize: 12, fontWeight: '900' },

    // Info section
    infoSection: { padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#EFE9F8' },
    businessTitle: { fontSize: 26, fontWeight: '900', color: '#2D2445', marginBottom: 12 },
    aboutText: { fontSize: 15, color: '#7A6B9C', lineHeight: 22, marginBottom: 20 },
    topBookBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8b5cf6',
        borderRadius: 14,
        paddingVertical: 14,
        marginBottom: 16,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    topBookBtnText: {
        color: '#2D2445',
        fontSize: 15,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    specCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#D4C9E8' },
    specVal: { fontSize: 13, color: '#9A8EBA', fontWeight: '700' },

    // Dynamic step 2 Showcase Gallery
    section: { paddingVertical: 24, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#EFE9F8' },
    sectionHeaderTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445', marginBottom: 16 },
    galleryScroll: { gap: 16 },
    galleryCard: { width: 200, backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#D4C9E8' },
    galleryMediaBox: { width: '100%', height: 120, backgroundColor: '#ffffff' },
    galleryMedia: { width: '100%', height: '100%', resizeMode: 'cover' },
    videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    videoText: { color: '#a084ca', fontSize: 11, marginTop: 4, fontWeight: '800' },
    imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    galleryMeta: { padding: 12 },
    galleryItemTitle: { color: '#2D2445', fontSize: 14, fontWeight: '800' },
    galleryItemDesc: { color: '#9A8EBA', fontSize: 11, marginTop: 4, lineHeight: 15 },

    // Strip Calendar Layout
    bookingHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    dateStripScroll: { gap: 10, paddingBottom: 10 },
    dateCard: { width: 62, height: 95, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#D4C9E8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    dateCardActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
    dateWkday: { fontSize: 10, fontWeight: '800', color: '#9A8EBA', textTransform: 'uppercase' },
    dateWkdayActive: { color: '#2D2445' },
    dateNum: { fontSize: 20, fontWeight: '900', color: '#2D2445', marginVertical: 4 },
    dateNumActive: { color: '#2D2445' },
    dateMonth: { fontSize: 10, fontWeight: '800', color: '#9A8EBA', textTransform: 'uppercase' },
    dateMonthActive: { color: '#2D2445' },

    slotSubTitle: { color: '#a084ca', fontSize: 14, fontWeight: '800', marginTop: 16, marginBottom: 16 },
    slotLoaderBox: { padding: 30, alignItems: 'center', justifyContent: 'center' },
    slotLoaderText: { color: '#7A6B9C', fontSize: 12, marginTop: 8 },
    emptySlotsBox: { padding: 30, backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#D4C9E8', alignItems: 'center', justifyContent: 'center' },
    emptySlotsText: { color: '#7A6B9C', fontSize: 13, fontWeight: '600' },

    slotsContainer: { gap: 12 },
    slotItemRow: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#D4C9E8', borderRadius: 16, padding: 16 },
    slotInfoCol: { marginBottom: 12 },
    slotItemName: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    slotItemDesc: { fontSize: 12, color: '#9A8EBA', marginTop: 2 },
    intervalsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    intervalBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#D4C9E8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    intervalText: { color: '#2D2445', fontSize: 12, fontWeight: '800' },
    noIntervals: { color: '#ef4444', fontSize: 12, fontWeight: '700' },

    // Modal 1 booking form styles
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: 20 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EFE9F8' },
    modalHeaderTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    modalFormContent: { paddingTop: 20, paddingBottom: 40 },

    summaryBox: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#D4C9E8' },
    summaryLabel: { fontSize: 11, color: '#9A8EBA', fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
    summaryVal: { fontSize: 15, color: '#2D2445', fontWeight: '800', marginBottom: 12 },

    formLabel: { fontSize: 14, fontWeight: '800', color: '#9A8EBA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    formInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#D4C9E8', borderRadius: 12, padding: 14, color: '#2D2445', fontSize: 15, fontWeight: '600', marginBottom: 20 },
    formInputArea: { height: 80, textAlignVertical: 'top' },

    guestModifierRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
    guestBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EFE9F8', alignItems: 'center', justifyContent: 'center' },
    guestCountVal: { fontSize: 18, fontWeight: '900', color: '#2D2445', minWidth: 20, textAlign: 'center' },
    maxGuestText: { color: '#7A6B9C', fontSize: 12, fontWeight: '700', marginLeft: 10 },

    bookingConfirmBtn: { backgroundColor: '#8b5cf6', paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    bookingConfirmBtnText: { color: '#2D2445', fontSize: 16, fontWeight: '800' },

    // Modal 2 success screen styles
    successBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
    successCard: { width: '85%', padding: 30, backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#D4C9E8', alignItems: 'center' },
    successCheckCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#10b981', marginBottom: 24 },
    successTitle: { fontSize: 22, fontWeight: '900', color: '#2D2445', marginBottom: 12 },
    successSub: { fontSize: 15, color: '#9A8EBA', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    successDoneBtn: { width: '100%', backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    successDoneBtnText: { color: '#2D2445', fontSize: 16, fontWeight: '800' }
});
