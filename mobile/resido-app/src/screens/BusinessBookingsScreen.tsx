import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    Image, SafeAreaView, ActivityIndicator, FlatList, 
    TextInput, Alert, RefreshControl, StatusBar, Dimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { authApi, businessApi, unpackBusinessProfileList } from '../services/api';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const SECURE_STORE_KEY = 'resido_saved_businesses';

export default function BusinessBookingsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'BOOKINGS' | 'SAVED' | 'SEARCH'>('BOOKINGS');
    
    // Lists and data states
    const [bookings, setBookings] = useState<any[]>([]);
    const [savedProfiles, setSavedProfiles] = useState<any[]>([]);
    const [allProfiles, setAllProfiles] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [searchLocation, setSearchLocation] = useState('');
    const [selectedLocation, setSelectedLocation] = useState<{ pincode?: string; district?: string; state?: string } | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; radius: number } | null>(null);
    
    // Loader and refreshers
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadTabData();
    }, [activeTab]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        if (activeTab === 'SEARCH') {
            fetchSearchProfiles();
        }
    }, [debouncedQuery, selectedLocation, userLocation, activeTab]);

    const loadTabData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'BOOKINGS') {
                await fetchMyBookings();
            } else if (activeTab === 'SAVED') {
                await fetchSavedServices();
            } else if (activeTab === 'SEARCH') {
                await fetchSearchProfiles();
            }
        } catch (e) {
            console.error('Failed to load tab data:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchMyBookings = async () => {
        try {
            const { data } = await businessApi.getMyBookings();
            // Sort bookings by creation or date descending
            const sorted = (data || []).sort((a: any, b: any) => {
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
            const ids = JSON.parse(savedStr);
            if (ids.length === 0) {
                setSavedProfiles([]);
                return;
            }

            // Fetch profile info for each saved ID
            const fetched = await Promise.all(
                ids.map(async (id: string) => {
                    try {
                        const { data } = await businessApi.getProfile(id);
                        return data;
                    } catch (err) {
                        console.warn(`Profile with ID ${id} not found:`, err);
                        return null;
                    }
                })
            );
            setSavedProfiles(fetched.filter(p => p !== null));
        } catch (error) {
            console.error('Failed to fetch saved services:', error);
            setSavedProfiles([]);
        }
    };

    const fetchSearchProfiles = async () => {
        try {
            const params: any = { limit: 50 };
            if (debouncedQuery.trim()) params.query = debouncedQuery.trim();
            if (userLocation) {
                params.lat = userLocation.latitude;
                params.lng = userLocation.longitude;
                params.radius = userLocation.radius;
            }
            if (selectedLocation) {
                if (selectedLocation.pincode) params.pincode = selectedLocation.pincode;
                if (selectedLocation.district) params.district = selectedLocation.district;
                if (selectedLocation.state) params.state = selectedLocation.state;
            }
            const { data } = await businessApi.getProfiles(params);
            setAllProfiles(unpackBusinessProfileList(data).items);
        } catch (error) {
            console.error('Failed to fetch search profiles:', error);
            setAllProfiles([]);
        }
    };

    const handleLocationSearch = async (text: string) => {
        setSearchLocation(text);
        if (text.length > 2) {
            try {
                const { data } = await authApi.searchLocations(text);
                const loc = data?.find((l: any) => l.pincode && l.latitude && l.longitude);
                if (loc) {
                    setSelectedLocation({ pincode: loc.pincode, district: loc.district, state: loc.state });
                    setUserLocation({
                        latitude: Number(loc.latitude),
                        longitude: Number(loc.longitude),
                        radius: 10,
                    });
                }
            } catch (e) {
                console.error('Location search failed', e);
            }
        }
    };

    const handleNearMe = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Enable location to search nearby businesses.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setUserLocation({ ...coords, radius: 10 });

            try {
                const { data } = await authApi.reverseGeocode(coords.latitude, coords.longitude);
                if (data && (data.pincode || data.district || data.state)) {
                    setSelectedLocation({
                        pincode: data.pincode || '',
                        district: data.district || '',
                        state: data.state || '',
                    });
                    setSearchLocation(
                        data.placeName
                            ? `Near Me — ${data.placeName}${data.district ? `, ${data.district}` : ''}`
                            : 'Near Me'
                    );
                } else {
                    setSelectedLocation(null);
                    setSearchLocation('Near Me');
                }
            } catch {
                setSelectedLocation(null);
                setSearchLocation('Near Me');
            }
        } catch (e) {
            console.error('GPS error', e);
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
                    }
                }
            ]
        );
    };

    const renderBookingItem = ({ item }: { item: any }) => {
        const isCancelled = item.status === 'CANCELLED';
        return (
            <View style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                    <View style={styles.businessBadge}>
                        <Ionicons name="business" size={16} color="#a084ca" style={{ marginRight: 6 }} />
                        <Text style={styles.businessName} numberOfLines={1}>{item.slot?.businessProfile?.businessName || 'Business Profile'}</Text>
                    </View>
                    <View style={[
                        styles.statusBadge, 
                        { backgroundColor: isCancelled ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: isCancelled ? '#ef4444' : '#10b981' }
                        ]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

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
                {item.distanceKm != null ? (
                    <Text style={{ fontSize: 11, color: '#9A8EBA', marginTop: 2 }}>
                        {Number(item.distanceKm).toFixed(1)} km away
                    </Text>
                ) : null}
                
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
            
            {/* Header Navbar */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bookings</Text>
                
                {/* QR Scanner Trigger Button */}
                <TouchableOpacity 
                    style={styles.scannerBtn}
                    onPress={() => router.push('/business-scanner')}
                >
                    <Ionicons name="qr-code-outline" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Glassmorphism Tabs Control */}
            <View style={styles.tabsStrip}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'BOOKINGS' && styles.tabActive]}
                    onPress={() => setActiveTab('BOOKINGS')}
                >
                    <Ionicons name="calendar-outline" size={16} color={activeTab === 'BOOKINGS' ? '#fff' : '#94a3b8'} style={{ marginRight: 6 }} />
                    <Text style={[styles.tabText, activeTab === 'BOOKINGS' && styles.tabTextActive]}>My Bookings</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'SAVED' && styles.tabActive]}
                    onPress={() => setActiveTab('SAVED')}
                >
                    <Ionicons name="bookmark-outline" size={16} color={activeTab === 'SAVED' ? '#fff' : '#94a3b8'} style={{ marginRight: 6 }} />
                    <Text style={[styles.tabText, activeTab === 'SAVED' && styles.tabTextActive]}>Saved</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'SEARCH' && styles.tabActive]}
                    onPress={() => setActiveTab('SEARCH')}
                >
                    <Ionicons name="search-outline" size={16} color={activeTab === 'SEARCH' ? '#fff' : '#94a3b8'} style={{ marginRight: 6 }} />
                    <Text style={[styles.tabText, activeTab === 'SEARCH' && styles.tabTextActive]}>Search</Text>
                </TouchableOpacity>
            </View>

            {/* Main Content Area */}
            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#a084ca" />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {activeTab === 'BOOKINGS' ? (
                        <FlatList
                            data={bookings}
                            keyExtractor={item => item.id}
                            renderItem={renderBookingItem}
                            contentContainerStyle={styles.listContent}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a084ca" />}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="calendar-outline" size={60} color="#475569" style={{ marginBottom: 16 }} />
                                    <Text style={styles.emptyTitle}>No Reservations Yet</Text>
                                    <Text style={styles.emptySub}>
                                        Any slot bookings or appointments you schedule with business profiles will appear here instantly.
                                    </Text>
                                    <TouchableOpacity style={styles.exploreBtn} onPress={() => setActiveTab('SEARCH')}>
                                        <Text style={styles.exploreBtnText}>Find Services</Text>
                                    </TouchableOpacity>
                                </View>
                            }
                        />
                    ) : activeTab === 'SAVED' ? (
                        <FlatList
                            data={savedProfiles}
                            keyExtractor={item => item.id}
                            renderItem={renderProfileItem}
                            contentContainerStyle={styles.listContent}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a084ca" />}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="bookmark-outline" size={60} color="#475569" style={{ marginBottom: 16 }} />
                                    <Text style={styles.emptyTitle}>No Saved Profiles</Text>
                                    <Text style={styles.emptySub}>
                                        Save business profiles in bookings/services so you can quickly access and schedule future reservations!
                                    </Text>
                                    <TouchableOpacity style={styles.exploreBtn} onPress={() => setActiveTab('SEARCH')}>
                                        <Text style={styles.exploreBtnText}>Explore Providers</Text>
                                    </TouchableOpacity>
                                </View>
                            }
                        />
                    ) : (
                        <View style={{ flex: 1 }}>
                            {/* Search bar inside the Search tab */}
                            <View style={styles.searchSection}>
                                <Ionicons name="search" size={20} color="#94a3b8" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search by profile name or category..."
                                    placeholderTextColor="#64748b"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery ? (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle" size={18} color="#94a3b8" />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                            <View style={[styles.searchSection, { marginTop: 0, marginBottom: 8 }]}>
                                <Ionicons name="location" size={18} color="#94a3b8" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Pincode or area..."
                                    placeholderTextColor="#64748b"
                                    value={searchLocation}
                                    onChangeText={handleLocationSearch}
                                />
                                <TouchableOpacity onPress={handleNearMe} style={{ paddingHorizontal: 8 }}>
                                    <Text style={{ color: '#8b5cf6', fontWeight: '800', fontSize: 12 }}>Near Me</Text>
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={allProfiles}
                                keyExtractor={item => item.id}
                                renderItem={renderProfileItem}
                                contentContainerStyle={styles.listContent}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a084ca" />}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Ionicons name="search-outline" size={60} color="#475569" style={{ marginBottom: 16 }} />
                                        <Text style={styles.emptyTitle}>No Results Found</Text>
                                        <Text style={styles.emptySub}>
                                            We couldn't find any business profiles matching "{searchQuery}". Try other keywords.
                                        </Text>
                                    </View>
                                }
                            />
                        </View>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Navbar
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EFE9F8' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445' },
    scannerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(139, 92, 246, 0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)' },

    // Glass tabs
    tabsStrip: { flexDirection: 'row', backgroundColor: '#ffffff', margin: 16, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#D4C9E8' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
    tabActive: { backgroundColor: '#8b5cf6' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#9A8EBA' },
    tabTextActive: { color: '#2D2445' },

    listContent: { padding: 16, paddingBottom: 40 },

    // Booking Cards
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
    notesBox: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
    notesLabel: { fontSize: 10, color: '#a084ca', fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
    notesText: { fontSize: 12, color: '#9A8EBA', lineHeight: 16 },

    cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#EFE9F8', paddingTop: 12, marginTop: 4 },
    cancelBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '800' },

    // Profile Cards
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#D4C9E8' },
    logoContainer: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#F4EEFC', overflow: 'hidden' },
    logo: { width: '100%', height: '100%' },
    logoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    textDetails: { flex: 1, marginLeft: 16, marginRight: 8 },
    cardName: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
    cardCategory: { fontSize: 13, color: '#9A8EBA', marginTop: 2, marginBottom: 6 },
    bookNowBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    bookNowText: { color: '#10b981', fontSize: 10, fontWeight: '900' },

    // Empty States
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, marginTop: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445', marginBottom: 8, marginTop: 16 },
    emptySub: { fontSize: 14, color: '#7A6B9C', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
    exploreBtn: { backgroundColor: '#8b5cf6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    exploreBtnText: { color: '#2D2445', fontWeight: '800', fontSize: 14 },

    // Search bar
    searchSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderLeftWidth: 1, borderRightWidth: 1, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D4C9E8', marginHorizontal: 16, marginTop: 8, marginBottom: 8, borderRadius: 14, paddingHorizontal: 16, height: 50 },
    searchInput: { flex: 1, marginLeft: 12, color: '#2D2445', fontSize: 14, fontWeight: '600' }
});
