import React, { useState } from 'react';
import { 
    View, Text, TouchableOpacity, StyleSheet, ScrollView, 
    TextInput, SafeAreaView, Image, Dimensions, StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Modal } from 'react-native';
import MapView, { Marker, Circle, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomNav from '../components/BottomNav';
import OSMMap from '../components/OSMMap';
import { authApi, businessApi } from '../services/api';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: 'all', name: 'All', icon: 'apps', color: '#1d4ed8' },
    { id: '1', name: 'Plumber', icon: 'water', color: '#60a5fa' },
    { id: '2', name: 'Electrician', icon: 'flash', color: '#fbbf24' },
    { id: '3', name: 'Carpenter', icon: 'construct', color: '#d97706' },
    { id: '4', name: 'Cleaner', icon: 'leaf', color: '#10b981' },
    { id: '5', name: 'Painter', icon: 'brush', color: '#ec4899' },
    { id: '6', name: 'More', icon: 'grid', color: '#64748b' },
];

const POPULAR_SERVICES = [
    { id: 'p1', name: 'Plumbing', rating: '4.6', reviews: '1.2K', image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400', icon: 'water' },
    { id: 'p2', name: 'Electrical Work', rating: '4.7', reviews: '1.5K', image: 'https://images.unsplash.com/photo-1621905181174-1133f4bf30e8?w=400', icon: 'flash' },
    { id: 'p3', name: 'Carpentry', rating: '4.5', reviews: '982', image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400', icon: 'construct' },
    { id: 'p4', name: 'Cleaning', rating: '4.6', reviews: '1.1K', image: 'https://images.unsplash.com/photo-1581578731522-745505146317?w=400', icon: 'leaf' },
];

const TOP_PROFESSIONALS = [
    {
        id: '1',
        name: 'Ramesh Kumar',
        category: 'Plumber',
        exp: '8 yrs exp.',
        rating: 4.7,
        reviews: 356,
        price: '₹300',
        verified: true,
        image: 'https://images.unsplash.com/photo-1540560942872-20bb5c39d29c?w=400',
    },
    {
        id: '2',
        name: 'Suresh Yadav',
        category: 'Electrician',
        exp: '6 yrs exp.',
        rating: 4.6,
        reviews: 289,
        price: '₹250',
        verified: true,
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    },
    {
        id: '3',
        name: 'Arjun Singh',
        category: 'Carpenter',
        exp: '10 yrs exp.',
        rating: 4.8,
        reviews: 412,
        price: '₹400',
        verified: true,
        image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
    },
];

export default function ServiceSearchScreen() {
    const router = useRouter();
    const [activeCat, setActiveCat] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLocation, setSearchLocation] = useState('');
    const [selectedLocationName, setSelectedLocationName] = useState('');
    const [locationResults, setLocationResults] = useState<any[]>([]);
    const [visibleCount, setVisibleCount] = useState(100); // Track how many results to show
    const [selectedLocation, setSelectedLocation] = useState<{ pincode?: string; district?: string; state?: string } | null>(null);
    const [showGlobalDropdown, setShowGlobalDropdown] = useState(false);
    const [showMapDropdown, setShowMapDropdown] = useState(false);
    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
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

    React.useEffect(() => {
        fetchProfiles();
    }, [activeCat, selectedLocation, userLocation]);

    const handleLocationSearch = async (text: string) => {
        setSearchLocation(text);
        if (text.length > 2) {
            try {
                const { data } = await authApi.searchLocations(text);
                
                // Filter to only show results that have valid coordinates
                const validResults = data.filter((loc: any) => loc.latitude && loc.longitude);
                
                if (validResults.length === 0) {
                    // If no valid results with coordinates, show the prompt
                    setLocationResults([{ id: 'no-results', isNoResult: true }]);
                } else {
                    // Store valid results but start by showing first 100
                    setLocationResults(validResults); 
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

        console.log('Selected location:', loc.placeName, 'Lat:', loc.latitude, 'Lng:', loc.longitude);
        setSearchLocation(''); // Clear search input to avoid confusion
        setSelectedLocationName(`${loc.placeName} (${loc.pincode})`); // Dedicated state for display
        setSelectedLocation({
            pincode: loc.pincode,
            district: loc.district,
            state: loc.state
        });
        setUserLocation(null); 
        setShowGlobalDropdown(false);
        
        // Always switch to MAP view immediately
        setViewMode('MAP');

        if (loc.latitude && loc.longitude) {
            const latDelta = (searchRadius * 2.5) / 111;
            setMapRegion({
                latitude: Number(loc.latitude),
                longitude: Number(loc.longitude),
                latitudeDelta: latDelta,
                longitudeDelta: latDelta
            });
            setSelectedPin({ latitude: Number(loc.latitude), longitude: Number(loc.longitude) });
        }
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
            setSearchRadius(5); 
            setMapRegion({
                ...coords,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            });

            // Assuming a helper or similar logic
            setSelectedLocationName('Near Me (GPS)');
        } catch (error) {
            console.error('Error getting current location:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkerDragEnd = (coord: { latitude: number, longitude: number }) => {
        setSelectedPin(coord);
        setUserLocation({
            ...coord,
            radius: searchRadius
        });
        // Sync with the top display badge
        setSelectedLocationName(`Custom: ${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)}`);
        setSelectedLocation(null); // Clear pincode search as we are now using GPS coords
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

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (activeCat !== 'all') {
                const cat = CATEGORIES.find(c => c.id === activeCat);
                if (cat) params.category = cat.name;
            }
            
            if (searchQuery) {
                params.query = searchQuery;
            }
            
            // 1. Coordinates (Pin takes priority over GPS)
            if (selectedPin) {
                params.lat = selectedPin.latitude;
                params.lng = selectedPin.longitude;
                params.radius = searchRadius;
            } else if (userLocation) {
                params.lat = userLocation.latitude;
                params.lng = userLocation.longitude;
                params.radius = userLocation.radius;
            }

            // 2. Administrative Context (Dropdown selection)
            if (selectedLocation) {
                params.pincode = selectedLocation.pincode;
                params.district = selectedLocation.district;
                params.state = selectedLocation.state;
            }

            const { data } = await businessApi.getProfiles(params);
            setProfiles(data);
        } catch (error) {
            console.error('Failed to fetch profiles', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Services</Text>
                        <Text style={styles.headerSubtitle}>Find trusted professionals for your needs</Text>
                    </View>
                    <TouchableOpacity style={styles.notifBtn}>
                        <Ionicons name="notifications-outline" size={26} color="#1e293b" />
                        <View style={styles.notifBadge} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#be185d" />
                        <TextInput 
                            placeholder="Search services or professionals..." 
                            style={styles.searchInput}
                            placeholderTextColor="#94a3b8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    
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
                                placeholder="Search by area/location..." 
                                style={styles.searchInput}
                                placeholderTextColor="#94a3b8"
                                value={searchLocation}
                                onChangeText={handleLocationSearch}
                                onBlur={() => setTimeout(() => setShowGlobalDropdown(false), 200)}
                            />
                            <TouchableOpacity style={styles.nearMeBtn} onPress={handleUseCurrentLocation}>
                                <MaterialCommunityIcons name="google-maps" size={18} color="#1d4ed8" />
                                <Text style={styles.nearMeText}>Near Me</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.catScroll}
                    contentContainerStyle={styles.catContent}
                >
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity 
                            key={cat.id} 
                            style={styles.catItem}
                            onPress={() => setActiveCat(cat.id)}
                        >
                            <View style={[styles.catIcon, { backgroundColor: cat.color }, activeCat === cat.id && styles.catIconActive]}>
                                <MaterialCommunityIcons name={cat.icon as any} size={26} color="#fff" />
                            </View>
                            <Text style={styles.catName}>{cat.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {viewMode === 'MAP' && (
                    <View style={styles.mapViewContainer}>
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
                                setViewMode('LIST');
                                fetchProfiles();
                            }}
                        >
                            <Text style={styles.mapDoneText}>Save & Apply Location</Text>
                        </TouchableOpacity>
                    </View>
                )}

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
                            <Image source={{ uri: item.image }} style={styles.popularImage} />
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

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        {activeCat === 'all' && !searchLocation ? 'Top Professionals' : 'Search Results'}
                    </Text>
                    <TouchableOpacity><Text style={styles.viewAll}>View all</Text></TouchableOpacity>
                </View>

                {loading ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <ActivityIndicator color="#1d4ed8" size="large" />
                        <Text style={{ marginTop: 12, color: '#64748b' }}>Finding best matches...</Text>
                    </View>
                ) : (
                    <View style={styles.prosList}>
                        {(profiles.length > 0 ? profiles : TOP_PROFESSIONALS).map(pro => (
                            <TouchableOpacity 
                                key={pro.id} 
                                style={styles.proCard}
                                onPress={() => router.push(`/business/${pro.id}`)}
                            >
                                <View style={styles.proImagePlaceholder}>
                                    <Ionicons name="person" size={30} color="#cbd5e1" />
                                </View>
                                <View style={styles.proInfo}>
                                    <View style={styles.proNameRow}>
                                        <Text style={styles.proName}>{pro.businessName || pro.name}</Text>
                                        {pro.isVerified && <Ionicons name="checkmark-circle" size={16} color="#1d4ed8" />}
                                    </View>
                                    <Text style={styles.proCat}>{pro.category} • {pro.experience || 'Experienced'}</Text>
                                    <View style={styles.proLocRow}>
                                        <Ionicons name="location-outline" size={14} color="#64748b" />
                                        <Text style={styles.proLocText}>{pro.location || 'Within Community'}</Text>
                                    </View>
                                </View>
                                <View style={styles.proRight}>
                                    <View style={styles.proRatingRow}>
                                        <Ionicons name="star" size={14} color="#f59e0b" />
                                        <Text style={styles.proRatingText}>4.5 <Text style={styles.proReviews}>(24)</Text></Text>
                                    </View>
                                    <View style={styles.priceBadge}>
                                        <Text style={styles.priceText}>Starts ₹{pro.services?.[0]?.price || '---'}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

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

                <View style={{ height: 120 }} />
            </ScrollView>

            <BottomNav activeTab="Home" />

            {showGlobalDropdown && locationResults.length > 0 && (
                <View style={[styles.dropdownContainer, { top: 180, left: 20, right: 20 }]}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                        {locationResults.slice(0, visibleCount).map((loc, idx) => (
                            <TouchableOpacity 
                                key={idx} 
                                style={styles.dropdownItem}
                                onPress={() => onSelectLocation(loc)}
                            >
                                <Ionicons name={loc.isNoResult ? "help-circle-outline" : "location-outline"} size={16} color={loc.isNoResult ? "#94a3b8" : "#1d4ed8"} />
                                <View style={{ marginLeft: 10, flex: 1 }}>
                                    <Text style={[styles.dropdownPlace, loc.isNoResult && { color: '#94a3b8', fontStyle: 'italic' }]}>
                                        {loc.isNoResult ? "Location not found" : `${loc.placeName} (${loc.pincode})`}
                                    </Text>
                                    {!loc.isNoResult && <Text style={styles.dropdownSub}>{loc.district}, {loc.state}</Text>}
                                    {loc.isNoResult && <Text style={styles.dropdownSub}>Try searching by Pincode</Text>}
                                </View>
                            </TouchableOpacity>
                        ))}
                        {locationResults.length > visibleCount && (
                            <TouchableOpacity 
                                style={[styles.dropdownItem, { justifyContent: 'center', backgroundColor: '#f8fafc' }]}
                                onPress={() => setVisibleCount(prev => prev + 100)}
                            >
                                <Text style={{ color: '#1d4ed8', fontWeight: '700', fontSize: 13 }}>
                                    Show More Results ({locationResults.length - visibleCount} remaining)
                                </Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            )}
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

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fcfcfd' },
    scrollContent: { paddingBottom: 20 },
    header: { padding: 20, paddingTop: 65, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#1e293b' },
    headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
    notifBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    notifBadge: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fcfcfd' },
    
    searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', height: 56, borderRadius: 18, paddingHorizontal: 16, borderWidth: 1.5, borderColor: '#be185d', shadowColor: '#be185d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1e293b', fontWeight: '500' },
    filterBtn: { padding: 4 },

    catScroll: { marginBottom: 25 },
    catContent: { paddingHorizontal: 20 },
    catItem: { alignItems: 'center', marginRight: 20, width: 64 },
    catIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    catIconActive: { borderWidth: 3, borderColor: '#fff' },
    catName: { fontSize: 12, fontWeight: '700', color: '#475569' },

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
    postJobBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

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
    mapDoneText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    radiusSelector: { position: 'absolute', right: 15, top: 80, backgroundColor: '#fff', borderRadius: 12, padding: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, zIndex: 100 },
    radiusBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 4 },
    radiusBtnActive: { backgroundColor: '#1d4ed8' },
    radiusText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    radiusTextActive: { color: '#fff' },
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
