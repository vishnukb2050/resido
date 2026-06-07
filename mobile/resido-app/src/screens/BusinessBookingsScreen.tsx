import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, FlatList, Alert, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { businessApi } from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { resolveMediaUrl } from '../utils/mediaUrl';

const SECURE_STORE_KEY = 'resido_saved_businesses';

// Per-profile per-day booking number → "0001"
const formatToken = (n?: number | null): string | null => {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return null;
    return String(n).padStart(4, '0');
};

type TabKey = 'BOOKINGS' | 'SAVED';

export default function BusinessBookingsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabKey>('BOOKINGS');

    const [bookings, setBookings] = useState<any[]>([]);
    const [savedProfiles, setSavedProfiles] = useState<any[]>([]);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const loadTabData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'BOOKINGS') {
                await fetchMyBookings();
            } else {
                await fetchSavedServices();
            }
        } catch (e) {
            console.error('Failed to load tab data:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab]);

    // `useFocusEffect` already fires on the initial focus (mount), so a separate
    // mount `useEffect` would double-fetch on first open. One trigger only.
    useFocusEffect(
        useCallback(() => {
            loadTabData();
        }, [loadTabData]),
    );

    const fetchMyBookings = async () => {
        try {
            const { data } = await businessApi.getMyBookings();
            const items = Array.isArray(data) ? data : (data?.items || []);
            const sorted = [...items].sort((a: any, b: any) => {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
            setBookings(sorted);
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
            setBookings([]);
        }
    };

    const fetchSavedServices = async () => {
        try {
            const savedStr = await SecureStore.getItemAsync(SECURE_STORE_KEY);
            if (!savedStr) {
                setSavedProfiles([]);
                return;
            }
            const ids: string[] = JSON.parse(savedStr);
            if (!Array.isArray(ids) || ids.length === 0) {
                setSavedProfiles([]);
                return;
            }

            // One batched request instead of an N+1 getProfile per saved id.
            const { data } = await businessApi.getProfilesByIds(ids);
            setSavedProfiles(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch saved services:', error);
            setSavedProfiles([]);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadTabData();
    };

    const handleCancelBooking = (bookingId: string) => {
        Alert.alert(
            'Cancel Booking',
            'Are you sure you want to cancel this service reservation?',
            [
                { text: 'No, Keep It', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await businessApi.cancelBooking(bookingId);
                            Alert.alert('Cancelled', 'Your booking was cancelled successfully.');
                            fetchMyBookings();
                        } catch (error: any) {
                            console.error('Failed to cancel booking:', error);
                            const msg = error.response?.data?.message || 'Failed to cancel reservation.';
                            Alert.alert('Error', msg);
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ],
        );
    };

    const renderBookingItem = ({ item }: { item: any }) => {
        const isCancelled = item.status === 'CANCELLED';
        const profile = item.slot?.businessProfile;
        const token = formatToken(item.tokenNumber);
        const updates: any[] = Array.isArray(item.updates) ? item.updates : [];
        const isExpanded = expandedIds.has(item.id);
        const businessName = profile?.businessName || 'Business Profile';

        return (
            <View style={styles.bookingCard}>
                <TouchableOpacity
                    style={styles.bookingHeader}
                    activeOpacity={profile?.id ? 0.7 : 1}
                    onPress={() => {
                        if (profile?.id) {
                            router.push({ pathname: '/business-detail', params: { id: profile.id } });
                        }
                    }}
                >
                    <View style={styles.businessBadge}>
                        <Ionicons name="business" size={16} color="#a084ca" style={{ marginRight: 6 }} />
                        <Text style={styles.businessName} numberOfLines={1}>
                            {businessName}
                        </Text>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: isCancelled ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' },
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: isCancelled ? '#ef4444' : '#10b981' },
                        ]}>
                            {item.status}
                        </Text>
                    </View>
                </TouchableOpacity>

                {!isCancelled && token ? (
                    <View style={styles.tokenStrip}>
                        <View style={styles.tokenChip}>
                            <Ionicons name="pricetag" size={14} color="#8b5cf6" style={{ marginRight: 6 }} />
                            <Text style={styles.tokenLabel}>Token</Text>
                            <Text style={styles.tokenValue}>#{token}</Text>
                        </View>
                        <Text style={styles.tokenHint}>Show this number when you arrive.</Text>
                    </View>
                ) : null}

                <View style={styles.bookingDetails}>
                    <Text style={styles.slotName}>{item.slot?.name}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.metaCol}>
                            <Text style={styles.metaLabel}>Date & Time</Text>
                            <Text style={styles.metaVal}>{item.bookingDate} • {item.timeSlot}</Text>
                        </View>
                        <View style={styles.metaCol}>
                            <Text style={styles.metaLabel}>Persons</Text>
                            <Text style={styles.metaVal}>{item.persons} guest(s)</Text>
                        </View>
                    </View>

                    {item.notes ? (
                        <View style={styles.notesBox}>
                            <Text style={styles.notesLabel}>Your Notes</Text>
                            <Text style={styles.notesText}>{item.notes}</Text>
                        </View>
                    ) : null}
                </View>

                {!isCancelled ? (
                    <TouchableOpacity
                        style={styles.updatesToggle}
                        onPress={() => toggleExpand(item.id)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color="#8b5cf6"
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.updatesToggleText}>
                            {updates.length > 0
                                ? `${isExpanded ? 'Hide' : 'View'} updates from ${businessName} (${updates.length})`
                                : `${isExpanded ? 'Hide' : 'View'} updates from ${businessName}`}
                        </Text>
                    </TouchableOpacity>
                ) : null}

                {!isCancelled && isExpanded ? (
                    <View style={styles.updatesBox}>
                        {updates.length === 0 ? (
                            <Text style={styles.updatesEmpty}>
                                No updates from {businessName} yet. You will see status notes or photos
                                they post here.
                            </Text>
                        ) : (
                            updates.map((u) => {
                                const photo = resolveMediaUrl(u.photoUrl);
                                return (
                                    <View key={u.id} style={styles.updateRow}>
                                        <View style={styles.updateHeader}>
                                            <Ionicons name="megaphone-outline" size={14} color="#8b5cf6" />
                                            <Text style={styles.updateAuthor}>{businessName}</Text>
                                            <Text style={styles.updateTime}>
                                                {new Date(u.createdAt).toLocaleString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </Text>
                                        </View>
                                        {u.message ? (
                                            <Text style={styles.updateMessage}>{u.message}</Text>
                                        ) : null}
                                        {photo ? (
                                            <Image
                                                source={{ uri: photo }}
                                                style={styles.updatePhoto}
                                                resizeMode="cover"
                                            />
                                        ) : null}
                                    </View>
                                );
                            })
                        )}
                    </View>
                ) : null}

                {!isCancelled && (
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancelBooking(item.id)}
                    >
                        <Ionicons name="close-circle-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                        <Text style={styles.cancelBtnText}>Cancel Appointment</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderProfileItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.profileCard}
            onPress={() => router.push({ pathname: '/business-detail', params: { id: item.id } })}
        >
            <View style={styles.logoContainer}>
                {item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.logo} />
                ) : (
                    <View style={styles.logoPlaceholder}>
                        <Ionicons name="business" size={24} color="#a084ca" />
                    </View>
                )}
            </View>
            <View style={styles.textDetails}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.cardName}>{item.businessName}</Text>
                    {item.isVerified && <Ionicons name="checkmark-circle" size={14} color="#10b981" />}
                </View>
                <Text style={styles.cardCategory}>{item.category}</Text>
                {item.slots && item.slots.length > 0 ? (
                    <View style={styles.bookNowBadge}>
                        <Text style={styles.bookNowText}>Book Online</Text>
                    </View>
                ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bookings</Text>
                <TouchableOpacity
                    style={styles.scannerBtn}
                    onPress={() => router.push('/business-scanner')}
                >
                    <Ionicons name="qr-code-outline" size={20} color="#1d4ed8" />
                </TouchableOpacity>
            </View>

            <View style={styles.tabsStrip}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'BOOKINGS' && styles.tabActive]}
                    onPress={() => setActiveTab('BOOKINGS')}
                >
                    <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={activeTab === 'BOOKINGS' ? '#ffffff' : '#9A8EBA'}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.tabText, activeTab === 'BOOKINGS' && styles.tabTextActive]}>My Bookings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'SAVED' && styles.tabActive]}
                    onPress={() => setActiveTab('SAVED')}
                >
                    <Ionicons
                        name="bookmark-outline"
                        size={16}
                        color={activeTab === 'SAVED' ? '#ffffff' : '#9A8EBA'}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.tabText, activeTab === 'SAVED' && styles.tabTextActive]}>Saved</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                </View>
            ) : activeTab === 'BOOKINGS' ? (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => item.id}
                    renderItem={renderBookingItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={60} color="#9A8EBA" style={{ marginBottom: 16 }} />
                            <Text style={styles.emptyTitle}>No Reservations Yet</Text>
                            <Text style={styles.emptySub}>
                                Slots you book with business profiles will appear here. Browse Services to find one.
                            </Text>
                            <TouchableOpacity
                                style={styles.exploreBtn}
                                onPress={() => router.push('/service-search')}
                            >
                                <Text style={styles.exploreBtnText}>Find Services</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={savedProfiles}
                    keyExtractor={(item) => item.id}
                    renderItem={renderProfileItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="bookmark-outline" size={60} color="#9A8EBA" style={{ marginBottom: 16 }} />
                            <Text style={styles.emptyTitle}>No Saved Profiles</Text>
                            <Text style={styles.emptySub}>
                                Open a business profile and tap the bookmark icon to save it. Saved profiles show up
                                here for quick access.
                            </Text>
                            <TouchableOpacity
                                style={styles.exploreBtn}
                                onPress={() => router.push('/service-search')}
                            >
                                <Text style={styles.exploreBtnText}>Explore Providers</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EFE9F8' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445' },
    scannerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbe2ff' },

    tabsStrip: { flexDirection: 'row', backgroundColor: '#ffffff', margin: 16, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#D4C9E8' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
    tabActive: { backgroundColor: '#8b5cf6' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#9A8EBA' },
    tabTextActive: { color: '#ffffff' },

    listContent: { padding: 16, paddingBottom: 40 },

    bookingCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#D4C9E8' },
    bookingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EFE9F8', paddingBottom: 12, marginBottom: 12 },
    businessBadge: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    businessName: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },

    bookingDetails: { marginBottom: 16 },
    slotName: { fontSize: 18, fontWeight: '900', color: '#2D2445', marginBottom: 12 },
    metaRow: { flexDirection: 'row', gap: 24, marginBottom: 12 },
    metaCol: { flex: 1 },
    metaLabel: { fontSize: 10, color: '#7A6B9C', fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
    metaVal: { fontSize: 13, color: '#7A6B9C', fontWeight: '700' },
    notesBox: { marginTop: 12, backgroundColor: '#F8F5FF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#EFE9F8' },
    notesLabel: { fontSize: 10, color: '#a084ca', fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
    notesText: { fontSize: 12, color: '#7A6B9C', lineHeight: 16 },

    cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#EFE9F8', paddingTop: 12, marginTop: 4 },
    cancelBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '800' },

    tokenStrip: {
        marginBottom: 12,
        backgroundColor: '#F4EEFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#D4C9E8',
    },
    tokenChip: { flexDirection: 'row', alignItems: 'center' },
    tokenLabel: { fontSize: 11, color: '#7A6B9C', fontWeight: '800', textTransform: 'uppercase', marginRight: 8 },
    tokenValue: { fontSize: 22, color: '#5b21b6', fontWeight: '900', letterSpacing: 1 },
    tokenHint: { fontSize: 11, color: '#7A6B9C', fontWeight: '600', marginTop: 4 },

    updatesToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        marginTop: 4,
        borderRadius: 10,
        backgroundColor: '#F8F5FF',
    },
    updatesToggleText: { color: '#8b5cf6', fontSize: 12, fontWeight: '800' },

    updatesBox: { marginTop: 12, gap: 12 },
    updatesEmpty: { fontSize: 12, color: '#7A6B9C', textAlign: 'center', paddingVertical: 8 },
    updateRow: {
        backgroundColor: '#F8F5FF',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: '#EFE9F8',
    },
    updateHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    updateAuthor: { fontSize: 12, fontWeight: '800', color: '#2D2445' },
    updateTime: { fontSize: 10, fontWeight: '700', color: '#9A8EBA', marginLeft: 'auto' },
    updateMessage: { fontSize: 13, color: '#2D2445', lineHeight: 18 },
    updatePhoto: { width: '100%', height: 180, borderRadius: 10, marginTop: 8, backgroundColor: '#EFE9F8' },

    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#D4C9E8' },
    logoContainer: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#F4EEFC', overflow: 'hidden' },
    logo: { width: '100%', height: '100%' },
    logoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    textDetails: { flex: 1, marginLeft: 16, marginRight: 8 },
    cardName: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
    cardCategory: { fontSize: 13, color: '#9A8EBA', marginTop: 2, marginBottom: 6 },
    bookNowBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    bookNowText: { color: '#10b981', fontSize: 10, fontWeight: '900' },

    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, marginTop: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445', marginBottom: 8, marginTop: 16 },
    emptySub: { fontSize: 14, color: '#7A6B9C', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
    exploreBtn: { backgroundColor: '#8b5cf6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    exploreBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});
