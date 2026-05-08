import React, { useState, useEffect } from 'react';
import { 
    View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, 
    ScrollView, TextInput, FlatList, SafeAreaView, Image, Dimensions 
} from 'react-native';
import { api } from '../services/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { name: 'Plumber', icon: 'wrench', color: '#6366f1' },
    { name: 'Electrician', icon: 'flash', color: '#f59e0b' },
    { name: 'Cleaner', icon: 'broom', color: '#10b981' },
    { name: 'Painter', icon: 'format-paint', color: '#ec4899' },
    { name: 'Carpenter', icon: 'hammer', color: '#8b5cf6' },
    { name: 'Mechanic', icon: 'cog', color: '#64748b' },
    { name: 'Gardener', icon: 'leaf', color: '#22c55e' },
];

export default function ServiceSearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('Plumber');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Initial search or featured providers
        handleSearch();
    }, [category]);

    const handleSearch = async () => {
        setLoading(true);
        try {
            // Mocking for high-fidelity demonstration
            const mockResults = [
                { id: '1', user: { name: 'Rajesh Kumar' }, category: 'Plumber', description: 'Expert in leak detection and bathroom fittings. 10+ years experience.', city: 'Bangalore', pincode: '560001', rating: 4.8, jobs: 124, verified: true },
                { id: '2', user: { name: 'Amit Sharma' }, category: 'Plumber', description: 'Available 24/7 for emergency plumbing services. Certified professional.', city: 'Bangalore', pincode: '560002', rating: 4.5, jobs: 89, verified: true },
                { id: '3', user: { name: 'Sunil Verma' }, category: 'Plumber', description: 'Affordable plumbing and maintenance for residential societies.', city: 'Bangalore', pincode: '560003', rating: 4.2, jobs: 56, verified: false },
            ];
            
            // Real API call (uncomment in production)
            // const { data } = await api.get('/profile/search', { params: { category, location: query } });
            // setResults(data);
            
            setResults(mockResults);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderProvider = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} onPress={() => router.push(`/job-profile-details/${item.id}`)}>
            <View style={styles.cardTop}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.user.name[0]}</Text>
                    </View>
                    {item.verified && (
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#6366f1" />
                        </View>
                    )}
                </View>
                <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.providerName}>{item.user.name}</Text>
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={14} color="#f59e0b" />
                            <Text style={styles.ratingText}>{item.rating}</Text>
                        </View>
                    </View>
                    <Text style={styles.providerCat}>{item.category} • {item.jobs} Jobs Done</Text>
                </View>
                <TouchableOpacity style={styles.callBtn}>
                    <Ionicons name="call" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.cardFooter}>
                <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.locationText}>{item.city}, {item.pincode}</Text>
                </View>
                <Text style={styles.viewProfile}>View Profile</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#94a3b8" />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search pincode, city..."
                        placeholderTextColor="#94a3b8"
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                    />
                </View>
                <TouchableOpacity style={styles.filterBtn}>
                    <Ionicons name="options-outline" size={24} color="#1e293b" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
                {/* Categories */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Categories</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity 
                                key={cat.name} 
                                style={[styles.catItem, category === cat.name && styles.catItemActive]}
                                onPress={() => setCategory(cat.name)}
                            >
                                <View style={[styles.catIcon, { backgroundColor: `${cat.color}15` }]}>
                                    <MaterialCommunityIcons name={cat.icon as any} size={24} color={cat.color} />
                                </View>
                                <Text style={[styles.catText, category === cat.name && styles.catTextActive]}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Popular Services Promo */}
                <View style={styles.promoSection}>
                    <View style={styles.promoCard}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.promoTitle}>Emergency Plumbing?</Text>
                            <Text style={styles.promoSub}>Get verified professionals at your doorstep within 30 mins.</Text>
                            <TouchableOpacity style={styles.promoBtn}>
                                <Text style={styles.promoBtnText}>Book Now</Text>
                            </TouchableOpacity>
                        </View>
                        <MaterialCommunityIcons name="wrench-clock" size={80} color="rgba(255,255,255,0.2)" style={styles.promoIcon} />
                    </View>
                </View>

                {/* Results */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{category} Specialists</Text>
                        <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
                    ) : results.length > 0 ? (
                        results.map(item => <View key={item.id}>{renderProvider({ item })}</View>)
                    ) : (
                        <View style={styles.empty}>
                            <Ionicons name="search-outline" size={80} color="#f1f5f9" />
                            <Text style={styles.emptyText}>No professionals found in this area</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <BottomNav />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', gap: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#f1f5f9' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b', fontWeight: '500' },
    filterBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

    section: { padding: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 15 },
    viewAll: { fontSize: 13, color: '#6366f1', fontWeight: '800' },

    catScroll: { flexDirection: 'row', marginHorizontal: -20, paddingHorizontal: 20 },
    catItem: { alignItems: 'center', marginRight: 20, width: 70 },
    catIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    catItemActive: { opacity: 1 },
    catText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
    catTextActive: { color: '#1e293b', fontWeight: '800' },

    promoSection: { paddingHorizontal: 20, marginBottom: 10 },
    promoCard: { backgroundColor: '#6366f1', borderRadius: 24, padding: 20, flexDirection: 'row', overflow: 'hidden' },
    promoTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 6 },
    promoSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 18, marginBottom: 15, paddingRight: 40 },
    promoBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' },
    promoBtnText: { color: '#6366f1', fontWeight: '800', fontSize: 13 },
    promoIcon: { position: 'absolute', right: -10, bottom: -10 },

    card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    avatarContainer: { position: 'relative' },
    avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    verifiedBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#fff', borderRadius: 10, padding: 2 },
    cardInfo: { flex: 1, marginLeft: 14 },
    nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    providerName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff9eb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 4 },
    ratingText: { fontSize: 12, fontWeight: '800', color: '#f59e0b' },
    providerCat: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
    callBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
    cardDesc: { fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 15, fontWeight: '500' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 12 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    locationText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    viewProfile: { fontSize: 12, color: '#6366f1', fontWeight: '800' },

    empty: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#94a3b8', fontSize: 15, fontWeight: '600', marginTop: 10, textAlign: 'center' },
});
