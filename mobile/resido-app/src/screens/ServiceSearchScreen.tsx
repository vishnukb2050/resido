import React, { useState } from 'react';
import { 
    View, Text, TouchableOpacity, StyleSheet, ScrollView, 
    TextInput, SafeAreaView, Image, Dimensions, StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { businessApi } from '../services/api';
import { ActivityIndicator, Alert } from 'react-native';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: 'all', name: 'All', icon: 'apps', color: '#6366f1' },
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
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        fetchProfiles();
    }, [activeCat, searchLocation]);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (activeCat !== 'all') {
                const cat = CATEGORIES.find(c => c.id === activeCat);
                if (cat) params.category = cat.name;
            }
            if (searchLocation) {
                params.location = searchLocation;
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
                
                {/* Header */}
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

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#94a3b8" />
                        <TextInput 
                            placeholder="Search services or professionals..." 
                            style={styles.searchInput}
                            placeholderTextColor="#94a3b8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <TouchableOpacity style={styles.filterBtn}>
                            <Ionicons name="options-outline" size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={[styles.searchBar, { marginTop: 12, height: 48 }]}>
                        <Ionicons name="location" size={18} color="#6366f1" />
                        <TextInput 
                            placeholder="Search by area/location..." 
                            style={styles.searchInput}
                            placeholderTextColor="#94a3b8"
                            value={searchLocation}
                            onChangeText={setSearchLocation}
                        />
                    </View>
                </View>

                {/* Categories */}
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

                {/* Verified Banner */}
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
                        <MaterialCommunityIcons name="certificate" size={40} color="#6366f1" />
                        <View style={styles.checkInner}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                        </View>
                    </View>
                </View>

                {/* Popular Services */}
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
                                <MaterialCommunityIcons name={item.icon as any} size={18} color="#6366f1" />
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

                {/* Top Professionals / Search Results */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        {activeCat === 'all' && !searchLocation ? 'Top Professionals' : 'Search Results'}
                    </Text>
                    <TouchableOpacity><Text style={styles.viewAll}>View all</Text></TouchableOpacity>
                </View>

                {loading ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <ActivityIndicator color="#6366f1" size="large" />
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
                                        {pro.isVerified && <Ionicons name="checkmark-circle" size={16} color="#6366f1" />}
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

                {/* Feature Icons */}
                <View style={styles.featuresRow}>
                    <FeatureItem icon="shield-checkmark-outline" label="Verified" sub="Background verified" />
                    <FeatureItem icon="star-outline" label="Ratings" sub="Real customer reviews" />
                    <FeatureItem icon="shield-outline" label="Secure" sub="Safe & trusted payments" />
                    <FeatureItem icon="headset-outline" label="Support" sub="24/7 customer support" />
                </View>

                {/* Post a Job Footer */}
                <View style={styles.postJobCard}>
                    <View style={styles.postJobIcon}>
                        <Ionicons name="pricetag" size={24} color="#6366f1" />
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
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', height: 56, borderRadius: 18, paddingHorizontal: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1e293b', fontWeight: '500' },
    filterBtn: { padding: 4 },

    catScroll: { marginBottom: 25 },
    catContent: { paddingHorizontal: 20 },
    catItem: { alignItems: 'center', marginRight: 20, width: 64 },
    catIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    catIconActive: { borderWidth: 3, borderColor: '#fff' },
    catName: { fontSize: 12, fontWeight: '700', color: '#475569' },

    verifiedBanner: { marginHorizontal: 20, backgroundColor: '#f5f7ff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e0e7ff', marginBottom: 25 },
    verifiedIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOpacity: 0.1 },
    shieldIcon: { backgroundColor: '#6366f1', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    verifiedTextContent: { flex: 1, marginLeft: 12 },
    verifiedTitle: { fontSize: 14, fontWeight: '800', color: '#6366f1' },
    verifiedSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    verifiedBadgeContainer: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    checkInner: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', top: 11 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    viewAll: { fontSize: 13, color: '#6366f1', fontWeight: '700' },

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
    priceText: { fontSize: 12, color: '#6366f1', fontWeight: '800' },
    chatBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },

    featuresRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginBottom: 25 },
    featureItem: { width: '50%', flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
    featureIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
    featureLabel: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
    featureSub: { fontSize: 10, color: '#64748b', marginTop: 1 },

    postJobCard: { marginHorizontal: 20, backgroundColor: '#f8fafc', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    postJobIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
    postJobText: { flex: 1, marginLeft: 15 },
    postJobTitle: { fontSize: 16, fontWeight: '900', color: '#6366f1' },
    postJobSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 18 },
    postJobBtn: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    postJobBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
