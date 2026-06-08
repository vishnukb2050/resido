import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList, TextInput, Dimensions, StatusBar, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Modal } from 'react-native';
import MapView, { Marker, Circle, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomNav from '../components/BottomNav';
import OSMMap from '../components/OSMMap';
import AppImage from '../components/AppImage';
import { authApi, businessApi, unpackBusinessProfileList } from '../services/api';

const PAGE_SIZE = 50;

const { width, height: windowHeight } = Dimensions.get('window');

const CATEGORIES = [
    { id: 'all', name: 'All', icon: 'apps', color: '#1d4ed8' },
    { id: '1', name: 'Plumbing', icon: 'water', color: '#60a5fa' },
    { id: '2', name: 'Electrical', icon: 'flash', color: '#fbbf24' },
    { id: '3', name: 'Carpentry', icon: 'construct', color: '#d97706' },
    { id: '4', name: 'Cleaning', icon: 'leaf', color: '#10b981' },
    { id: '5', name: 'Pest Control', icon: 'bug', color: '#f59e0b' },
    { id: '6', name: 'Painter', icon: 'brush', color: '#ec4899' },
    { id: '7', name: 'AC Repair', icon: 'snowflake', color: '#0ea5e9' },
    { id: '8', name: 'Fashion', icon: 'hanger', color: '#f472b6' },
    { id: '9', name: 'Jobs', icon: 'briefcase', color: '#3b82f6' },
    { id: '10', name: 'Real Estate', icon: 'home-city', color: '#8b5cf6' },
    { id: '11', name: 'Education', icon: 'school', color: '#10b981' },
    { id: '12', name: 'Tours and Travels', icon: 'airplane', color: '#14b8a6' },
    { id: '13', name: 'Health', icon: 'heart-pulse', color: '#ef4444' },
    { id: '14', name: 'Repair Service', icon: 'wrench', color: '#f97316' },
    { id: '15', name: 'Electronics and Appliances', icon: 'television', color: '#6b7280' },
    { id: '16', name: 'More', icon: 'grid', color: '#64748b' },
];

const POPULAR_SERVICES = [
    { id: 'p1', name: 'Plumbing', rating: '4.6', reviews: '1.2K', image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400', icon: 'water' },
    { id: 'p2', name: 'Electrical Work', rating: '4.7', reviews: '1.5K', image: 'https://images.unsplash.com/photo-1621905181174-1133f4bf30e8?w=400', icon: 'flash' },
    { id: 'p3', name: 'Carpentry', rating: '4.5', reviews: '982', image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400', icon: 'construct' },
    { id: 'p4', name: 'Cleaning', rating: '4.6', reviews: '1.1K', image: 'https://images.unsplash.com/photo-1581578731522-745505146317?w=400', icon: 'leaf' },
];

export default function ServiceSearchScreen() {
    const router = useRouter();
    const routeParams = useLocalSearchParams<{ query?: string; category?: string }>();
    const initialQuery = typeof routeParams?.query === 'string' ? routeParams.query : '';
    const initialCategoryParam = typeof routeParams?.category === 'string' ? routeParams.category : '';
    // Map a category name (e.g. "Plumbing") to its internal id; default to 'all'.
    const initialCatId = React.useMemo(() => {
        if (!initialCategoryParam) return 'all';
        const match = CATEGORIES.find(
            c => c.name.toLowerCase() === initialCategoryParam.toLowerCase(),
        );
        return match ? match.id : 'all';
    }, [initialCategoryParam]);

    const [activeCat, setActiveCat] = useState(initialCatId);
    // Horizontal category strip auto-scroll. We track each item's measured x/width
    // via onLayout so we can centre the active category in the viewport instead
    // of forcing the user to manually scroll to find their selection.
    const catScrollRef = useRef<ScrollView | null>(null);
    const catPositionsRef = useRef<Record<string, { x: number; w: number }>>({});
    const scrollCategoryIntoView = useCallback((catId: string) => {
        const pos = catPositionsRef.current[catId];
        if (!pos || !catScrollRef.current) return;
        const screenWidth = Dimensions.get('window').width;
        const targetX = Math.max(0, pos.x + pos.w / 2 - screenWidth / 2);
        catScrollRef.current.scrollTo({ x: targetX, animated: true });
    }, []);
    useEffect(() => {
        const t = setTimeout(() => scrollCategoryIntoView(activeCat), 80);
        return () => clearTimeout(t);
    }, [activeCat, scrollCategoryIntoView]);
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [searchLocation, setSearchLocation] = useState('');
    const [selectedLocationName, setSelectedLocationName] = useState('');
    const [locationResults, setLocationResults] = useState<any[]>([]);
    const [visibleCount, setVisibleCount] = useState(100); // Track how many results to show
    const [selectedLocation, setSelectedLocation] = useState<{ pincode?: string; district?: string; state?: string } | null>(null);
    const [showGlobalDropdown, setShowGlobalDropdown] = useState(false);
    const [showMapDropdown, setShowMapDropdown] = useState(false);
    const [showTopDropdown, setShowTopDropdown] = useState(false);
    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [profiles, setProfiles] = useState<any[]>([]);
    // Map of business owner userId -> lightweight identity, populated by
    // /profile/users/identities/batch after profiles load. Only owners
    // who enabled "Link Business Profile" appear here, so presence in
    // the map is the gate for rendering the linked-owner chip.
    const [ownerIdentities, setOwnerIdentities] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const loadingMoreRef = useRef(false);
    const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number, radius: number } | null>(null);
    const [mapSearchResults, setMapSearchResults] = useState<any[]>([]);
    const [isMapSearching, setIsMapSearching] = useState(false);
    const [searchRadius, setSearchRadius] = useState(10); // Default 10km
    const [selectedPin, setSelectedPin] = useState<{ latitude: number, longitude: number } | null>(null);
    const [mapRegion, setMapRegion] = useState({
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    const [debouncedQuery, setDebouncedQuery] = React.useState(searchQuery);
    const [suggestItems, setSuggestItems] = React.useState<any[]>([]);
    const locationInputRef = React.useRef<TextInput>(null);
    const serviceSearchInputRef = React.useRef<TextInput>(null);

    const dismissKeyboard = () => {
        Keyboard.dismiss();
        locationInputRef.current?.blur();
        serviceSearchInputRef.current?.blur();
    };

    React.useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    React.useEffect(() => {
        fetchProfiles();
    }, [activeCat, selectedLocation, userLocation, selectedPin, searchRadius, debouncedQuery]);

    React.useEffect(() => {
        const loadSuggest = async () => {
            const q = searchQuery.trim();
            if (q.length < 2) {
                setSuggestItems([]);
                return;
            }
            try {
                const { data } = await businessApi.suggestProfiles(q, 10);
                const items: any[] = [];
                (data?.categories || []).forEach((name: string) => {
                    items.push({ type: 'category', name, id: name });
                });
                (data?.profiles || []).forEach((p: any) => {
                    items.push({ type: 'profile', name: p.name, profileId: p.id });
                });
                (data?.services || []).forEach((s: any) => {
                    items.push({ type: 'service', name: s.name });
                });
                setSuggestItems(items.slice(0, 10));
            } catch {
                setSuggestItems(getTopSuggestions());
            }
        };
        loadSuggest();
    }, [searchQuery, profiles]);

    const getTopSuggestions = () => {
        if (!searchQuery || searchQuery.trim().length === 0) return [];
        const queryLower = searchQuery.toLowerCase().trim();
        
        const suggestions: Array<{
            type: 'category' | 'service' | 'profile';
            name: string;
            id?: string;
            profileId?: string;
        }> = [];

        // 1. Match Categories
        CATEGORIES.forEach(cat => {
            if (cat.name.toLowerCase().includes(queryLower) && cat.id !== 'all') {
                suggestions.push({
                    type: 'category',
                    name: cat.name,
                    id: cat.id
                });
            }
        });

        // 2. Match Profiles & their Services (from the fetched profiles list)
        const matchedServices = new Set<string>();
        profiles.forEach(pro => {
            // Profile Name Match
            if (pro.businessName && pro.businessName.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    type: 'profile',
                    name: pro.businessName,
                    profileId: pro.id
                });
            }

            // Services/Subcategories match
            if (pro.services && Array.isArray(pro.services)) {
                pro.services.forEach((srv: any) => {
                    if (srv.name && srv.name.toLowerCase().includes(queryLower)) {
                        matchedServices.add(srv.name);
                    }
                });
            }
        });

        // Add service suggestions (subcategories)
        matchedServices.forEach(srvName => {
            suggestions.push({
                type: 'service',
                name: srvName
            });
        });

        return suggestions.slice(0, 10); // Limit to top 10 suggestions
    };

    const handleLocationSearch = async (text: string) => {
        setSearchLocation(text);
        if (text.length > 2) {
            try {
                const { data } = await authApi.searchLocations(text);
                const queryLower = text.toLowerCase().trim();

                // Place-level rows (pincode searchable on the map) need
                // coordinates; state/district aggregates do not — the
                // business search uses admin names, not lat/lng.
                const placeResults = (data || []).filter(
                    (loc: any) => loc.latitude && loc.longitude,
                );

                const distinctStates = new Set<string>();
                const distinctDistricts = new Set<string>();
                const stateCoords: Record<string, { lat: number; lng: number }> = {};
                const districtCoords: Record<
                    string,
                    { lat: number; lng: number; state: string }
                > = {};

                // Aggregate state/district names from EVERY row (with or
                // without coordinates). Match either via the explicit column
                // or via a substring of the typed query, so "Trivandrum"
                // surfaces "Thiruvananthapuram" rows once the backend
                // returns them and vice versa.
                (data || []).forEach((loc: any) => {
                    const stateName = (loc.state || '').toString();
                    const districtName = (loc.district || '').toString();

                    if (
                        stateName &&
                        (stateName.toLowerCase().includes(queryLower) ||
                            queryLower.includes(stateName.toLowerCase()))
                    ) {
                        distinctStates.add(stateName);
                        if (loc.latitude && loc.longitude && !stateCoords[stateName]) {
                            stateCoords[stateName] = {
                                lat: Number(loc.latitude),
                                lng: Number(loc.longitude),
                            };
                        }
                    }
                    if (
                        districtName &&
                        (districtName.toLowerCase().includes(queryLower) ||
                            queryLower.includes(districtName.toLowerCase()))
                    ) {
                        distinctDistricts.add(districtName);
                        if (loc.latitude && loc.longitude && !districtCoords[districtName]) {
                            districtCoords[districtName] = {
                                lat: Number(loc.latitude),
                                lng: Number(loc.longitude),
                                state: stateName,
                            };
                        }
                    }
                });

                const stateSuggestions = Array.from(distinctStates).map((state) => ({
                    id: `state_${state}`,
                    placeName: `Entire State: ${state}`,
                    state,
                    district: '',
                    pincode: '',
                    isState: true,
                    latitude: stateCoords[state]?.lat,
                    longitude: stateCoords[state]?.lng,
                }));

                const districtSuggestions = Array.from(distinctDistricts).map((dist) => ({
                    id: `district_${dist}`,
                    placeName: `Entire District: ${dist}`,
                    district: dist,
                    state: districtCoords[dist]?.state || '',
                    pincode: '',
                    isDistrict: true,
                    latitude: districtCoords[dist]?.lat,
                    longitude: districtCoords[dist]?.lng,
                }));

                const combinedResults = [
                    ...stateSuggestions,
                    ...districtSuggestions,
                    ...placeResults,
                ];

                if (combinedResults.length === 0) {
                    setLocationResults([{ id: 'no-results', isNoResult: true }]);
                } else {
                    setLocationResults(combinedResults);
                    setVisibleCount(100);
                }
                setShowGlobalDropdown(true);
            } catch (error) {
                console.error('Location search failed', error);
            }
        } else {
            setLocationResults([]);
            setShowGlobalDropdown(false);
        }
    };

    const handleMapPlaceSearch = async (text: string) => {
        setMapSearchQuery(text);
        if (text.length > 2) {
            setIsMapSearching(true);
            try {
                console.log('Searching map places for:', text);
                const { data } = await authApi.searchLocations(text);
                console.log('Found places:', data.length);
                const results = data.map((item: any, idx: number) => ({
                    id: item.id || `loc_${idx}`,
                    display_name: `${item.placeName}, ${item.district} (${item.pincode})`,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    type: 'area',
                    pincode: item.pincode
                })).filter((item: any) => item.latitude && item.longitude);
                
                console.log('Filtered map results:', results.length);
                setMapSearchResults(results);
                setShowMapDropdown(results.length > 0);
            } catch (error) {
                console.error('Map place search error:', error);
            } finally {
                setIsMapSearching(false);
            }
        } else {
            setMapSearchResults([]);
            setShowMapDropdown(false);
        }
    };

    const onRegionChangeComplete = (newRegion: any) => {
        const latDiff = Math.abs(newRegion.latitude - mapRegion.latitude);
        const lngDiff = Math.abs(newRegion.longitude - mapRegion.longitude);
        const deltaDiff = Math.abs(newRegion.latitudeDelta - mapRegion.latitudeDelta);
        
        // Only update state if the movement is significant (prevents jitter during pinch)
        if (latDiff > 0.005 || lngDiff > 0.005 || deltaDiff > 0.005) {
            setMapRegion(newRegion);
        }
    };

    const onSelectMapPlace = (place: any) => {
        dismissKeyboard();
        setMapSearchQuery(place.display_name);
        const latDelta = (searchRadius * 2.5) / 111;
        setMapRegion({
            latitude: place.latitude,
            longitude: place.longitude,
            latitudeDelta: latDelta,
            longitudeDelta: latDelta
        });
        setSelectedPin({ latitude: place.latitude, longitude: place.longitude });
        
        if (place.pincode) {
            setSelectedLocation({
                pincode: place.pincode,
                district: '', 
                state: ''
            });
        } else {
            setUserLocation({
                latitude: place.latitude,
                longitude: place.longitude,
                radius: 5
            });
            setSelectedLocation(null);
        }
        
        setShowMapDropdown(false);
        setMapSearchResults([]);
    };

    const onSelectLocation = (loc: any) => {
        if (loc.isNoResult) {
            Alert.alert(
                "Location Not Found",
                "We couldn't find that area. Please try entering a 6-digit Pincode (e.g., 682021) for a more accurate search.",
                [{ text: "OK", onPress: () => setShowGlobalDropdown(false) }]
            );
            return;
        }

        dismissKeyboard();
        setShowGlobalDropdown(false);
        setLocationResults([]);

        console.log('Selected location:', loc.placeName, 'Lat:', loc.latitude, 'Lng:', loc.longitude);
        setSearchLocation('');
        
        if (loc.isState) {
            setSelectedLocationName(`State: ${loc.state}`);
            setSelectedLocation({
                pincode: '',
                district: '',
                state: loc.state
            });
        } else if (loc.isDistrict) {
            setSelectedLocationName(`District: ${loc.district}`);
            setSelectedLocation({
                pincode: '',
                district: loc.district,
                state: loc.state
            });
        } else {
            setSelectedLocationName(`${loc.placeName} (${loc.pincode})`);
            setSelectedLocation({
                pincode: loc.pincode,
                district: loc.district,
                state: loc.state
            });
        }
        
        // Keep LIST view for broad state/district picks so results are visible;
        // only switch to MAP for a specific place (pincode) where fine-tuning helps.
        if (!loc.isState && !loc.isDistrict) {
            setViewMode('MAP');
        } else {
            setViewMode('LIST');
        }

        if (loc.latitude && loc.longitude) {
            const coords = { latitude: Number(loc.latitude), longitude: Number(loc.longitude) };
            const latDelta = (searchRadius * 2.5) / 111;
            setMapRegion({
                ...coords,
                latitudeDelta: latDelta,
                longitudeDelta: latDelta,
            });
            setSelectedPin(coords);
            setUserLocation({ ...coords, radius: searchRadius });
        } else {
            setSelectedPin(null);
            setUserLocation(null);
        }
    };

    const resolveAdminContext = async (coords: { latitude: number; longitude: number }) => {
        try {
            const { data } = await authApi.reverseGeocode(coords.latitude, coords.longitude);
            if (data && (data.pincode || data.district || data.state)) {
                setSelectedLocation({
                    pincode: data.pincode || '',
                    district: data.district || '',
                    state: data.state || '',
                });
                return data;
            }
        } catch (e) {
            console.warn('Reverse geocode failed:', e);
        }
        setSelectedLocation(null);
        return null;
    };

    const handleUseCurrentLocation = async () => {
        setLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            setSelectedPin(coords);
            setUserLocation({ ...coords, radius: searchRadius });
            setSearchRadius(5);
            setMapRegion({
                ...coords,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            });

            const admin = await resolveAdminContext(coords);
            const label = admin?.placeName
                ? `Near Me — ${admin.placeName}${admin.district ? `, ${admin.district}` : ''}`
                : 'Near Me (GPS)';
            setSelectedLocationName(label);
        } catch (error) {
            console.error('Error getting current location:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkerDragEnd = async (coord: { latitude: number, longitude: number }) => {
        setSelectedPin(coord);
        setUserLocation({ ...coord, radius: searchRadius });
        const admin = await resolveAdminContext(coord);
        const label = admin?.placeName
            ? `${admin.placeName}${admin.district ? `, ${admin.district}` : ''}`
            : `Custom: ${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)}`;
        setSelectedLocationName(label);
    };

    const handleRadiusChange = (radius: number) => {
        setSearchRadius(radius);
        if (selectedPin) {
            setUserLocation({
                ...selectedPin,
                radius: radius
            });
            const latDelta = (radius * 2.5) / 111;
            setMapRegion({
                ...mapRegion,
                latitudeDelta: latDelta,
                longitudeDelta: latDelta
            });
        }
    };

    // True whenever the user has narrowed the catalog in any way — category,
    // search query, custom location pin or admin area. In this state we hide
    // the marketing/promo blocks (Popular Services, verified banner, post-a-
    // job, features row) and show only filtered Search Results.
    const isSearching = (
        activeCat !== 'all' ||
        debouncedQuery.trim().length > 0 ||
        !!selectedLocationName ||
        !!selectedLocation ||
        !!selectedPin ||
        !!userLocation
    );

    /**
     * Has the user narrowed by category or free-text query? When true we
     * MUST also have a location pinned before listing results — otherwise
     * we'd surface profiles from anywhere in India, which the product
     * spec forbids. QR scans and direct profile-name picks route to
     * /business-detail, so they bypass this listing entirely.
     */
    const hasCategoryFilter = activeCat !== 'all' || debouncedQuery.trim().length > 0;
    const hasLocation = !!(selectedLocation || userLocation || selectedPin);
    const locationRequired = hasCategoryFilter && !hasLocation;

    /** Nudge the user to pick a location: alert + focus the location input. */
    const promptForLocation = () => {
        Alert.alert(
            'Choose a location',
            'Please select a location (area, pincode, district or state) so we can show services near you.',
            [{ text: 'OK' }],
        );
        setTimeout(() => locationInputRef.current?.focus(), 250);
    };

    const buildSearchParams = (offset: number) => {
        const params: any = {};
        if (activeCat !== 'all') {
            const cat = CATEGORIES.find(c => c.id === activeCat);
            if (cat) params.category = cat.name;
        }

        if (debouncedQuery.trim()) {
            params.query = debouncedQuery.trim();
        }
        params.limit = PAGE_SIZE;
        params.offset = offset;

        if (selectedPin) {
            params.lat = selectedPin.latitude;
            params.lng = selectedPin.longitude;
            params.radius = searchRadius;
        } else if (userLocation) {
            params.lat = userLocation.latitude;
            params.lng = userLocation.longitude;
            params.radius = userLocation.radius;
        }

        if (selectedLocation) {
            params.pincode = selectedLocation.pincode;
            params.district = selectedLocation.district;
            params.state = selectedLocation.state;
        }

        return params;
    };

    // Hydrate "owned by …" chips. Only userIds whose owner enabled the link
    // toggle come back, so the chip renders selectively. `merge` keeps already
    // resolved identities when appending a paginated page.
    const hydrateOwnerIdentities = async (items: any[], merge: boolean) => {
        const userIds = Array.from(new Set(
            items.map((p: any) => p?.userId).filter(Boolean)
        )) as string[];
        if (!userIds.length) {
            if (!merge) setOwnerIdentities({});
            return;
        }
        try {
            const { data: ids } = await authApi.getPublicIdentitiesBatch(userIds);
            setOwnerIdentities(prev => (merge ? { ...prev, ...(ids || {}) } : (ids || {})));
        } catch (idErr) {
            console.warn('owner identities hydrate failed', idErr);
            if (!merge) setOwnerIdentities({});
        }
    };

    const fetchProfiles = async () => {
        // Refuse to list "all profiles in India" when a category/query is
        // active but no location has been picked. The UI shows a banner
        // explaining what to do.
        if (locationRequired) {
            setProfiles([]);
            setLoading(false);
            setHasMore(false);
            return;
        }

        setLoading(true);
        try {
            const { data } = await businessApi.getProfiles(buildSearchParams(0));
            const unpacked = unpackBusinessProfileList(data);
            setProfiles(unpacked.items);
            setHasMore(unpacked.hasMore);
            await hydrateOwnerIdentities(unpacked.items, false);
        } catch (error) {
            console.error('Failed to fetch profiles', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreProfiles = async () => {
        if (loadingMoreRef.current) return;
        if (!hasMore || loading || locationRequired) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
            const { data } = await businessApi.getProfiles(buildSearchParams(profiles.length));
            const unpacked = unpackBusinessProfileList(data);
            setProfiles(prev => {
                const map = new Map(prev.map((p: any) => [p.id, p]));
                for (const it of unpacked.items) map.set(it.id, it);
                return Array.from(map.values());
            });
            setHasMore(unpacked.hasMore);
            await hydrateOwnerIdentities(unpacked.items, true);
        } catch (error) {
            console.error('Failed to load more profiles', error);
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    };

    // Primary marketplace list is the root virtualized scroller. When the
    // user must pick a location first, or while results are loading, we feed
    // an empty list so the ListEmptyComponent renders the right gate/spinner.
    const listData = locationRequired || loading ? [] : profiles;

    const ListHeader = (
        <>
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Services</Text>
                        <Text style={styles.headerSubtitle}>Find trusted professionals for your needs</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity
                            style={styles.myBookingsBtn}
                            onPress={() => router.push('/business-bookings')}
                        >
                            <Ionicons name="calendar-outline" size={16} color="#1d4ed8" />
                            <Text style={styles.myBookingsText}>My Bookings</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.notifBtn}>
                            <Ionicons name="notifications-outline" size={26} color="#1e293b" />
                            <View style={styles.notifBadge} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#be185d" />
                        <TextInput
                            ref={serviceSearchInputRef}
                            placeholder="Search services or professionals..."
                            style={styles.searchInput}
                            placeholderTextColor="#94a3b8"
                            value={searchQuery}
                            returnKeyType="search"
                            blurOnSubmit
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                setShowTopDropdown(true);
                            }}
                            onFocus={() => setShowTopDropdown(true)}
                            onBlur={() => setTimeout(() => setShowTopDropdown(false), 400)}
                            onSubmitEditing={dismissKeyboard}
                        />
                        {searchQuery ? (
                            <TouchableOpacity onPress={() => {
                                setSearchQuery('');
                                setShowTopDropdown(false);
                            }}>
                                <Ionicons name="close-circle" size={18} color="#94a3b8" />
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity
                            style={styles.scannerInlineBtn}
                            onPress={() => router.push('/business-scanner')}
                        >
                            <Ionicons name="qr-code-outline" size={20} color="#1d4ed8" />
                        </TouchableOpacity>
                    </View>

                    {showTopDropdown && searchQuery.trim().length > 0 && (
                        <View style={[styles.dropdownContainer, { position: 'absolute', top: 60, left: 20, right: 20, zIndex: 9999, elevation: 11 }]}>
                            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 250 }}>
                                {(suggestItems.length > 0 ? suggestItems : getTopSuggestions()).map((item, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            if (item.type === 'category') {
                                                // Look up by name first so the suggestion (which
                                                // may carry a backend id that doesn't match our
                                                // local CATEGORIES list) still highlights the
                                                // matching round icon strip below.
                                                const match = CATEGORIES.find(c => c.name.toLowerCase() === item.name.toLowerCase());
                                                setActiveCat(match ? match.id : (item.id || 'all'));
                                                setSearchQuery('');
                                                setShowTopDropdown(false);
                                                if (!hasLocation) promptForLocation();
                                            } else if (item.type === 'profile') {
                                                // Direct profile pick — no need to enforce
                                                // location, navigate straight to the detail screen.
                                                router.push({ pathname: '/business-detail', params: { id: item.profileId } });
                                                setSearchQuery('');
                                                setShowTopDropdown(false);
                                            } else if (item.type === 'service') {
                                                setSearchQuery(item.name);
                                                setShowTopDropdown(false);
                                                if (!hasLocation) promptForLocation();
                                            }
                                        }}
                                    >
                                        <Ionicons 
                                            name={
                                                item.type === 'category' ? "grid-outline" : 
                                                item.type === 'profile' ? "business-outline" : "construct-outline"
                                            } 
                                            size={16} 
                                            color="#be185d" 
                                            style={{ marginRight: 10 }}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>{item.name}</Text>
                                            <Text style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>
                                                {item.type === 'category' ? 'Category' : item.type === 'profile' ? 'Professional' : 'Service Subcategory'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                {suggestItems.length === 0 && getTopSuggestions().length === 0 && (
                                    <View style={{ padding: 15, alignItems: 'center' }}>
                                        <Text style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>No matches found</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    )}
                    
                    {viewMode !== 'MAP' && (
                        <View style={{ zIndex: 100 }}>
                            {selectedLocationName ? (
                                <View style={styles.selectedAreaHeader}>
                                    <View style={styles.selectedAreaBadge}>
                                        <Ionicons name="location" size={16} color="#1d4ed8" />
                                        <Text style={styles.selectedAreaText}>{selectedLocationName}</Text>
                                        <TouchableOpacity onPress={() => {
                                            setSelectedLocationName('');
                                            setSelectedLocation(null);
                                        }}>
                                            <Ionicons name="close-circle" size={16} color="#94a3b8" style={{ marginLeft: 8 }} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : null}
                            <View style={[styles.searchBar, { marginTop: selectedLocationName ? 8 : 12 }]}>
                                <Ionicons name="location" size={18} color="#be185d" />
                                <TextInput
                                    ref={locationInputRef}
                                    placeholder="Search by area/location..."
                                    style={styles.searchInput}
                                    placeholderTextColor="#94a3b8"
                                    value={searchLocation}
                                    onChangeText={handleLocationSearch}
                                    onFocus={() => setShowGlobalDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowGlobalDropdown(false), 400)}
                                    returnKeyType="search"
                                    blurOnSubmit
                                    onSubmitEditing={dismissKeyboard}
                                />
                                <TouchableOpacity style={styles.nearMeBtn} onPress={handleUseCurrentLocation}>
                                    <MaterialCommunityIcons name="google-maps" size={18} color="#1d4ed8" />
                                    <Text style={styles.nearMeText}>Near Me</Text>
                                </TouchableOpacity>
                            </View>

                            {showGlobalDropdown && locationResults.length > 0 && (
                                <View style={styles.locationDropdown}>
                                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                                        {locationResults.slice(0, visibleCount).map((loc, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                style={styles.dropdownItem}
                                                onPress={() => {
                                                    dismissKeyboard();
                                                    onSelectLocation(loc);
                                                }}
                                            >
                                                <Ionicons
                                                    name={loc.isNoResult ? 'help-circle-outline' : 'location-outline'}
                                                    size={16}
                                                    color={loc.isNoResult ? '#94a3b8' : '#1d4ed8'}
                                                />
                                                <View style={{ marginLeft: 10, flex: 1 }}>
                                                    <Text
                                                        style={[
                                                            styles.dropdownPlace,
                                                            loc.isNoResult && { color: '#94a3b8', fontStyle: 'italic' },
                                                        ]}
                                                    >
                                                        {loc.isNoResult
                                                            ? 'Location not found'
                                                            : loc.isState || loc.isDistrict
                                                                ? loc.placeName
                                                                : `${loc.placeName} (${loc.pincode})`}
                                                    </Text>
                                                    {!loc.isNoResult && (
                                                        <Text style={styles.dropdownSub}>
                                                            {loc.isState
                                                                ? 'State Area'
                                                                : loc.isDistrict
                                                                    ? `District in ${loc.state}`
                                                                    : `${loc.district}, ${loc.state}`}
                                                        </Text>
                                                    )}
                                                    {loc.isNoResult && (
                                                        <Text style={styles.dropdownSub}>Try searching by Pincode</Text>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                        {locationResults.length > visibleCount && (
                                            <TouchableOpacity
                                                style={[styles.dropdownItem, { justifyContent: 'center', backgroundColor: '#f8fafc' }]}
                                                onPress={() => setVisibleCount((prev) => prev + 100)}
                                            >
                                                <Text style={{ color: '#1d4ed8', fontWeight: '700', fontSize: 13 }}>
                                                    Show More Results ({locationResults.length - visibleCount} remaining)
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {viewMode !== 'MAP' && (
                    <ScrollView
                        ref={catScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.catScroll}
                        contentContainerStyle={styles.catContent}
                    >
                        {CATEGORIES.map(cat => {
                            const isActive = activeCat === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={styles.catItem}
                                    onLayout={(e) => {
                                        const { x, width: w } = e.nativeEvent.layout;
                                        catPositionsRef.current[cat.id] = { x, w };
                                        // If this item is the one that's already selected
                                        // (e.g. arriving from search with a preset category),
                                        // bring it into view as soon as we know its position.
                                        if (cat.id === activeCat) scrollCategoryIntoView(cat.id);
                                    }}
                                    onPress={() => {
                                        setActiveCat(cat.id);
                                        // Once the user picks a specific category, force a
                                        // location pick. Tapping "All" doesn't require one
                                        // because it clears the filter.
                                        if (cat.id !== 'all' && !hasLocation) promptForLocation();
                                    }}
                                >
                                    <View
                                        style={[
                                            styles.catIcon,
                                            { backgroundColor: cat.color },
                                            isActive && styles.catIconActive,
                                        ]}
                                    >
                                        <MaterialCommunityIcons name={cat.icon as any} size={26} color="#fff" />
                                    </View>
                                    <Text style={[styles.catName, isActive && styles.catNameActive]}>
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}

                {viewMode === 'MAP' && (
                    <View style={[styles.mapViewContainer, { height: Math.min(windowHeight * 0.58, 520) }]}>
                        <OSMMap
                            style={styles.map}
                            region={mapRegion}
                            onRegionChangeComplete={onRegionChangeComplete}
                            draggableMarker={selectedPin || undefined}
                            onMarkerDragEnd={handleMarkerDragEnd}
                            circle={selectedPin ? {
                                center: selectedPin,
                                radius: searchRadius * 1000
                            } : undefined}
                            markers={profiles.filter(p => p.latitude && p.longitude).map(pro => ({
                                id: pro.id,
                                latitude: pro.latitude,
                                longitude: pro.longitude,
                                title: pro.businessName || pro.name,
                                description: pro.category
                            }))}
                        />

                        <View style={styles.radiusSelector}>
                            {[5, 10, 20].map(r => (
                                <TouchableOpacity 
                                    key={r} 
                                    style={[styles.radiusBtn, searchRadius === r && styles.radiusBtnActive]}
                                    onPress={() => handleRadiusChange(r)}
                                >
                                    <Text style={[styles.radiusText, searchRadius === r && styles.radiusTextActive]}>{r}km</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.mapOverlayHeader}>
                            <View style={styles.selectedLocationBadge}>
                                <Ionicons name="location" size={18} color="#1d4ed8" />
                                <Text style={styles.selectedLocationText} numberOfLines={1}>
                                    {selectedLocationName || 'Current Location'}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.mapGpsBtn} onPress={handleUseCurrentLocation}>
                            <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#1d4ed8" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.mapDoneBtn}
                            onPress={() => {
                                dismissKeyboard();
                                setViewMode('LIST');
                                fetchProfiles();
                            }}
                        >
                            <Text style={styles.mapDoneText}>Save & Apply Location</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!isSearching && (
                    <>
                        <View style={styles.verifiedBanner}>
                            <View style={styles.verifiedIconContainer}>
                                <View style={styles.shieldIcon}>
                                    <Ionicons name="shield-checkmark" size={20} color="#fff" />
                                </View>
                            </View>
                            <View style={styles.verifiedTextContent}>
                                <Text style={styles.verifiedTitle}>Verified & Trusted Professionals</Text>
                                <Text style={styles.verifiedSubtitle}>Background verified • Quality service • On-time</Text>
                            </View>
                            <View style={styles.verifiedBadgeContainer}>
                                <MaterialCommunityIcons name="certificate" size={40} color="#1d4ed8" />
                                <View style={styles.checkInner}>
                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                </View>
                            </View>
                        </View>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Popular Services</Text>
                            <TouchableOpacity><Text style={styles.viewAll}>View all</Text></TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.popularScroll}
                            contentContainerStyle={styles.popularContent}
                        >
                            {POPULAR_SERVICES.map(item => (
                                <TouchableOpacity key={item.id} style={styles.popularCard}>
                                    <AppImage uri={item.image} style={styles.popularImage} />
                                    <View style={styles.popularIconOverlay}>
                                        <MaterialCommunityIcons name={item.icon as any} size={18} color="#1d4ed8" />
                                    </View>
                                    <View style={styles.popularInfo}>
                                        <Text style={styles.popularName}>{item.name}</Text>
                                        <View style={styles.ratingRow}>
                                            <Ionicons name="star" size={12} color="#f59e0b" />
                                            <Text style={styles.ratingText}>{item.rating} ({item.reviews})</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </>
                )}

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        {isSearching ? 'Search Results' : 'Nationwide Providers'}
                    </Text>
                    {isSearching && !locationRequired ? (
                        <Text style={[styles.viewAll, { color: '#64748b', fontWeight: '600' }]}>
                            {profiles.length} result{profiles.length === 1 ? '' : 's'}
                        </Text>
                    ) : !isSearching ? (
                        <TouchableOpacity><Text style={styles.viewAll}>View all</Text></TouchableOpacity>
                    ) : null}
                </View>
        </>
    );

    const ListEmpty = locationRequired ? (
        <View style={styles.locationGate}>
            <Ionicons name="location" size={28} color="#1d4ed8" style={{ marginBottom: 10 }} />
            <Text style={styles.locationGateTitle}>Select a location</Text>
            <Text style={styles.locationGateText}>
                Tell us where you need this service and we'll show you matching professionals
                who serve that area.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                    style={styles.locationGateBtn}
                    onPress={() => {
                        setTimeout(() => locationInputRef.current?.focus(), 100);
                    }}
                >
                    <Ionicons name="search" size={14} color="#ffffff" />
                    <Text style={styles.locationGateBtnText}>Type Area / Pincode</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.locationGateBtn, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#1d4ed8' }]}
                    onPress={handleUseCurrentLocation}
                >
                    <MaterialCommunityIcons name="crosshairs-gps" size={14} color="#1d4ed8" />
                    <Text style={[styles.locationGateBtnText, { color: '#1d4ed8' }]}>Use My GPS</Text>
                </TouchableOpacity>
            </View>
        </View>
    ) : loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color="#1d4ed8" size="large" />
            <Text style={{ marginTop: 12, color: '#64748b' }}>Finding best matches...</Text>
        </View>
    ) : (
        <View style={styles.prosList}>
            <View style={{ padding: 40, alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 10 }}>
                <Ionicons name="business-outline" size={48} color="#94a3b8" style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#2D2445', marginBottom: 4 }}>No Providers in this Area</Text>
                <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18 }}>
                    {selectedLocationName
                        ? `No professionals are registered for "${activeCat !== 'all' ? CATEGORIES.find(c => c.id === activeCat)?.name + ' in ' : ''}${selectedLocationName}". Try a different area or category.`
                        : isSearching
                            ? 'No professionals match your filters. Try changing the category or selecting a different location.'
                            : 'Pick an area or use "Near Me" to discover nearby professionals.'}
                </Text>
            </View>
        </View>
    );

    const ListFooter = (
        <>
            {!isSearching && (
                <View style={{ marginTop: 25 }}>
                    <View style={styles.featuresRow}>
                        <FeatureItem icon="shield-checkmark-outline" label="Verified" sub="Background verified" />
                        <FeatureItem icon="star-outline" label="Ratings" sub="Real customer reviews" />
                        <FeatureItem icon="shield-outline" label="Secure" sub="Safe & trusted payments" />
                        <FeatureItem icon="headset-outline" label="Support" sub="24/7 customer support" />
                    </View>

                    <View style={styles.postJobCard}>
                        <View style={styles.postJobIcon}>
                            <Ionicons name="pricetag" size={24} color="#1d4ed8" />
                        </View>
                        <View style={styles.postJobText}>
                            <Text style={styles.postJobTitle}>Post a Job for Free</Text>
                            <Text style={styles.postJobSubtitle}>Tell us what you need, professionals will reach out to you.</Text>
                        </View>
                        <TouchableOpacity style={styles.postJobBtn}>
                            <Text style={styles.postJobBtnText}>Post a Job</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={{ height: 120 }} />
        </>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <FlatList
                data={listData}
                keyExtractor={(item: any) => String(item.id)}
                renderItem={({ item }) => (
                    <View style={{ paddingHorizontal: 20 }}>
                        <ProCard pro={item} ownerIdentities={ownerIdentities} router={router} />
                    </View>
                )}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={ListEmpty}
                ListFooterComponent={
                    <>
                        {loadingMore ? (
                            <ActivityIndicator style={{ marginVertical: 20 }} color="#1d4ed8" />
                        ) : null}
                        {ListFooter}
                    </>
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                removeClippedSubviews
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={11}
                onEndReached={hasMore ? loadMoreProfiles : undefined}
                onEndReachedThreshold={0.4}
            />

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

function FeatureItem({ icon, label, sub }: any) {
    return (
        <View style={styles.featureItem}>
            <View style={styles.featureIconBox}>
                <Ionicons name={icon} size={20} color="#10b981" />
            </View>
            <View>
                <Text style={styles.featureLabel}>{label}</Text>
                <Text style={styles.featureSub}>{sub}</Text>
            </View>
        </View>
    );
}

const ProCard = React.memo(function ProCard({ pro, ownerIdentities, router }: any) {
    // Lowest priced billable service for this profile. Show "Starts ₹X" only
    // when at least one service has a real, positive price; otherwise omit the
    // badge entirely so we never render a "₹---" or "₹0" placeholder.
    const positiveServicePrices = (pro.services || [])
        .map((s: any) => Number(s?.price))
        .filter((n: number) => Number.isFinite(n) && n > 0);
    const minPrice = positiveServicePrices.length
        ? Math.min(...positiveServicePrices)
        : null;

    const owner = pro.userId ? ownerIdentities[pro.userId] : null;
    const ownerLocked =
        !!owner &&
        owner.profileVisibility &&
        owner.profileVisibility !== 'GLOBAL';

    return (
        <TouchableOpacity
            style={styles.proCard}
            onPress={() => router.push({ pathname: '/business-detail', params: { id: pro.id } })}
        >
            <View style={styles.proImagePlaceholder}>
                {pro.logo ? (
                    <AppImage uri={pro.logo} style={{ width: 60, height: 60, borderRadius: 30 }} />
                ) : (
                    <Ionicons name="person" size={30} color="#cbd5e1" />
                )}
            </View>
            <View style={styles.proInfo}>
                <View style={styles.proNameRow}>
                    <Text style={styles.proName}>{pro.businessName || pro.name}</Text>
                    {pro.isVerified && <Ionicons name="checkmark-circle" size={16} color="#1d4ed8" />}
                </View>
                <Text style={styles.proCat}>{pro.category} • {pro.experience || 'Experienced'}</Text>
                <View style={styles.proLocRow}>
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.proLocText}>
                        {pro.distanceKm != null
                            ? `${Number(pro.distanceKm).toFixed(1)} km away`
                            : (pro.area || pro.location || 'Service area')}
                    </Text>
                </View>
                {pro.slots && pro.slots.length > 0 ? (
                    <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="calendar" size={10} color="#10b981" />
                        <Text style={{ color: '#10b981', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>Book Online</Text>
                    </View>
                ) : null}
                {owner ? (
                    <TouchableOpacity
                        style={styles.ownerChip}
                        activeOpacity={0.8}
                        onPress={(e) => {
                            e.stopPropagation?.();
                            router.push({ pathname: '/user-profile', params: { id: owner.id } });
                        }}
                    >
                        {owner.profilePhoto ? (
                            <AppImage uri={owner.profilePhoto} style={styles.ownerChipAvatar} />
                        ) : (
                            <View style={[styles.ownerChipAvatar, { backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' }]}>
                                <Ionicons name="person" size={10} color="#8b5cf6" />
                            </View>
                        )}
                        <Text style={styles.ownerChipText} numberOfLines={1}>
                            by {owner.name || `@${owner.profileName}` || 'owner'}
                        </Text>
                        {ownerLocked ? (
                            <Ionicons name="lock-closed" size={10} color="#8b5cf6" style={{ marginLeft: 4 }} />
                        ) : null}
                    </TouchableOpacity>
                ) : null}
            </View>
            {minPrice != null && (
                <View style={styles.proRight}>
                    <View style={styles.priceBadge}>
                        <Text style={styles.priceText}>Starts ₹{minPrice.toLocaleString()}</Text>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fcfcfd' },
    scrollContent: { paddingBottom: 20 },
    header: { padding: 20, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#1e293b' },
    headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
    notifBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    notifBadge: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fcfcfd' },
    myBookingsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: '#eef2ff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#dbe2ff',
    },
    myBookingsText: { fontSize: 12, fontWeight: '800', color: '#1d4ed8' },
    scannerInlineBtn: {
        marginLeft: 8,
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eef2ff',
        borderWidth: 1,
        borderColor: '#dbe2ff',
    },
    
    searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', height: 56, borderRadius: 18, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#be185d', shadowColor: '#be185d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1e293b', fontWeight: '500' },
    filterBtn: { padding: 4 },

    catScroll: { marginBottom: 25 },
    catContent: { paddingHorizontal: 20 },
    catItem: { alignItems: 'center', marginRight: 20, width: 64 },
    catIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    catIconActive: { borderWidth: 3, borderColor: '#1d4ed8' },
    catName: { fontSize: 12, fontWeight: '700', color: '#475569' },
    catNameActive: { color: '#1d4ed8' },

    locationGate: {
        marginHorizontal: 20,
        marginTop: 10,
        padding: 22,
        backgroundColor: '#eef2ff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#dbe2ff',
        alignItems: 'center',
    },
    locationGateTitle: { fontSize: 16, fontWeight: '900', color: '#1d4ed8', marginBottom: 6 },
    locationGateText: { fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 18 },
    locationGateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#1d4ed8',
        borderRadius: 10,
    },
    locationGateBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },

    verifiedBanner: { marginHorizontal: 20, backgroundColor: '#f5f7ff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e0e7ff', marginBottom: 25 },
    verifiedIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#1d4ed8', shadowOpacity: 0.1 },
    shieldIcon: { backgroundColor: '#1d4ed8', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    verifiedTextContent: { flex: 1, marginLeft: 12 },
    verifiedTitle: { fontSize: 14, fontWeight: '800', color: '#1d4ed8' },
    verifiedSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    verifiedBadgeContainer: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    checkInner: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', top: 11 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    viewAll: { fontSize: 13, color: '#1d4ed8', fontWeight: '700' },

    popularScroll: { marginBottom: 25 },
    popularContent: { paddingHorizontal: 20 },
    popularCard: { width: 150, backgroundColor: '#fff', borderRadius: 20, marginRight: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
    popularImage: { width: '100%', height: 100 },
    popularIconOverlay: { position: 'absolute', top: 8, left: 8, backgroundColor: '#fff', padding: 6, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.1 },
    popularInfo: { padding: 12 },
    popularName: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    ratingText: { fontSize: 11, color: '#64748b', marginLeft: 4, fontWeight: '600' },

    prosList: { paddingHorizontal: 20, marginBottom: 25 },
    proCard: { backgroundColor: '#fff', borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    proImage: { width: 60, height: 60, borderRadius: 30 },
    proImagePlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    proInfo: { flex: 1, marginLeft: 12 },
    proNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    proName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    proCat: { fontSize: 12, color: '#64748b', marginTop: 1 },
    proLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    proLocText: { fontSize: 11, color: '#94a3b8' },
    proRight: { alignItems: 'flex-end', marginRight: 8 },
    proRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    proRatingText: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
    proReviews: { color: '#94a3b8', fontWeight: '500' },
    priceBadge: { backgroundColor: '#f5f7ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
    priceText: { fontSize: 12, color: '#1d4ed8', fontWeight: '800' },
    ownerChip: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F4EEFC', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 12, marginTop: 6, alignSelf: 'flex-start',
        borderWidth: 1, borderColor: '#E2D9F2', maxWidth: '95%',
    },
    ownerChipAvatar: { width: 16, height: 16, borderRadius: 8, marginRight: 6, backgroundColor: '#E8E2F2' },
    ownerChipText: { fontSize: 11, color: '#8b5cf6', fontWeight: '800', flexShrink: 1 },
    chatBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },

    featuresRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginBottom: 25 },
    featureItem: { width: '50%', flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
    featureIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
    featureLabel: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
    featureSub: { fontSize: 10, color: '#64748b', marginTop: 1 },

    postJobCard: { marginHorizontal: 20, backgroundColor: '#f8fafc', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    postJobIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
    postJobText: { flex: 1, marginLeft: 15 },
    postJobTitle: { fontSize: 16, fontWeight: '900', color: '#1d4ed8' },
    postJobSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 18 },
    postJobBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    postJobBtnText: { color: '#2D2445', fontWeight: '800', fontSize: 13 },

    dropdownContainer: {
        position: 'absolute',
        top: 200, // Lowered to clear the double search bar area
        left: 20,
        right: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        maxHeight: 350,
        zIndex: 9999,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    locationDropdown: {
        // Anchored to the relative wrapper that holds the location input,
        // so it always opens directly UNDER the input — never on top of it.
        marginTop: 6,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        maxHeight: 320,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 9999,
    },
    dropdownItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownText: {
        fontSize: 14,
        color: '#1E293B',
        flex: 1,
    },
    dropdownPlace: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    dropdownSub: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    noResultItem: {
        padding: 15,
        alignItems: 'center'
    },
    noResultText: {
        fontSize: 12,
        color: '#94a3b8',
        fontStyle: 'italic'
    },
    nearMeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: '#e0e7ff' },
    nearMeText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8', marginLeft: 4 },
    mapViewContainer: { height: 450, marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 25, position: 'relative', zIndex: 1 },
    map: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
    mapOverlayHeader: { position: 'absolute', top: 15, left: 15, right: 15, zIndex: 9999 },
    mapSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', height: 48, borderRadius: 12, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, zIndex: 10000 },
    mapSearchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b' },
    mapGpsBtn: { position: 'absolute', right: 15, bottom: 85, backgroundColor: '#fff', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, zIndex: 100 },
    mapDoneBtn: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#1d4ed8', height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 8, zIndex: 100 },
    mapDoneText: { color: '#2D2445', fontWeight: '800', fontSize: 15 },
    radiusSelector: { position: 'absolute', right: 15, top: 80, backgroundColor: '#fff', borderRadius: 12, padding: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, zIndex: 100 },
    radiusBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 4 },
    radiusBtnActive: { backgroundColor: '#1d4ed8' },
    radiusText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    radiusTextActive: { color: '#2D2445' },
    markerContainer: { alignItems: 'center', justifyContent: 'center' },
    markerCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
    markerArrow: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#ef4444', marginTop: -2 },
    selectedLocationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
        maxWidth: '90%',
    },
    selectedLocationText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        marginLeft: 8,
    },
    selectedAreaHeader: {
        marginBottom: 8,
        flexDirection: 'row',
    },
    selectedAreaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef2ff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e7ff',
        shadowColor: '#1d4ed8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    selectedAreaText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1d4ed8',
        marginLeft: 8,
    },
});
