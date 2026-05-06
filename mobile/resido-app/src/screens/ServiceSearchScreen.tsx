import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, FlatList } from 'react-native';
import { api } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORIES = ['PLUMBER', 'ELECTRICIAN', 'CLEANER', 'PAINTER', 'CARPENTER', 'MECHANIC', 'GARDENER', 'OTHER'];

export default function ServiceSearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('PLUMBER');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!query) return;
        setLoading(true);
        try {
            const { data } = await api.get('/profile/search', {
                params: { category, location: query }
            });
            setResults(data);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.resultCard}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color="#6366f1" />
                </View>
                <View>
                    <Text style={styles.providerName}>{item.user.name}</Text>
                    <Text style={styles.providerCat}>{item.category}</Text>
                </View>
                <TouchableOpacity style={styles.callBtn}>
                    <Ionicons name="call" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
            <Text style={styles.providerDesc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.cardFooter}>
                <Ionicons name="location" size={14} color="#64748b" />
                <Text style={styles.locationText}>{item.city}, {item.pincode}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Find Services</Text>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#64748b" />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search Pincode or City..."
                        placeholderTextColor="#64748b"
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                    />
                    <TouchableOpacity onPress={handleSearch} style={styles.goBtn}>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity 
                            key={cat} 
                            style={[styles.catBtn, category === cat && styles.catBtnActive]}
                            onPress={() => setCategory(cat)}
                        >
                            <Text style={[styles.catBtnText, category === cat && styles.catBtnTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>
            ) : results.length > 0 ? (
                <FlatList 
                    data={results}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                />
            ) : (
                <View style={styles.empty}>
                    <Ionicons name="construct-outline" size={80} color="#1e1e2e" />
                    <Text style={styles.emptyText}>Enter a location to find professionals nearby</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a', paddingTop: 60 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 24, marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '800', color: '#e2e8f0' },
    
    searchSection: { paddingHorizontal: 24, gap: 16, marginBottom: 20 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e2e', borderRadius: 15, paddingHorizontal: 15, height: 55, borderWidth: 1, borderColor: '#2d2d3d' },
    searchInput: { flex: 1, color: '#fff', fontSize: 16, marginLeft: 10 },
    goBtn: { backgroundColor: '#6366f1', width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    
    catScroll: { flexDirection: 'row' },
    catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e1e2e', marginRight: 10, borderWidth: 1, borderColor: '#2d2d3d' },
    catBtnActive: { backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: '#6366f1' },
    catBtnText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
    catBtnTextActive: { color: '#6366f1' },
    
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5, padding: 40 },
    emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 20, fontSize: 16 },
    
    list: { padding: 24, gap: 16 },
    resultCard: { backgroundColor: '#1e1e2e', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#2d2d3d' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
    providerName: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
    providerCat: { fontSize: 12, color: '#6366f1', textTransform: 'uppercase', fontWeight: '700' },
    callBtn: { marginLeft: 'auto', backgroundColor: '#22c55e', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    providerDesc: { color: '#94a3b8', fontSize: 14, lineHeight: 20, marginBottom: 12 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    locationText: { color: '#64748b', fontSize: 13 }
});
