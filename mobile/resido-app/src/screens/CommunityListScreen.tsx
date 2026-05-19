import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const MOCK_COMMUNITIES = [
    { id: '1', name: 'Greenwood Residency', type: 'Apartment', residents: 120, image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400' },
    { id: '2', name: 'Blue Sky Apartments', type: 'Condominium', residents: 85, image: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400' },
    { id: '3', name: 'Elite Villas', type: 'Gated Community', residents: 45, image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400' },
    { id: '4', name: 'Sunset Heights', type: 'Apartment', residents: 200, image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400' },
];

export default function CommunityListScreen() {
    const router = useRouter();
    const { workspaces, setActiveWorkspace } = useAuthStore();
    const [search, setSearch] = useState('');

    const handleSelect = (ws: any) => {
        setActiveWorkspace(ws, ''); // Token will be handled by interceptor or next login
        router.replace('/');
    };

    const renderItem = ({ item }: any) => (
        <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)}>
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View style={styles.cmcLogoBoxSmall}>
                        <MaterialCommunityIcons name="office-building" size={24} color="#4c1d95" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.cardTitle}>{item.tenantName}</Text>
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeText}>{item.role}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Communities</Text>
                <TouchableOpacity style={styles.addBtnHeader} onPress={() => router.push('/create-community')}>
                    <Ionicons name="add" size={28} color="#4c1d95" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#94a3b8" />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search for a community..."
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <FlatList 
                data={workspaces}
                keyExtractor={item => item.tenantId}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="office-building-marker-outline" size={80} color="#e2e8f0" />
                        <Text style={styles.emptyText}>No communities found</Text>
                    </View>
                }
            />

            {/* Footer removed as requested */}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, paddingTop: 65, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    addBtnHeader: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    
    searchSection: { padding: 20, backgroundColor: '#fff' },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 15, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#f1f5f9' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1e293b' },
    
    list: { padding: 20, paddingBottom: 100 },
    card: { backgroundColor: '#fff', borderRadius: 24, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
    cmcLogoBoxSmall: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    cardContent: { padding: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', flex: 1, marginRight: 10 },
    typeBadge: { backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    typeText: { fontSize: 10, fontWeight: '800', color: '#4c1d95', textTransform: 'uppercase' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
    joinBtn: { backgroundColor: '#4c1d95', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    
    footer: { position: 'absolute', bottom: 30, left: 20, right: 20 },
    createBtn: { backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60, borderRadius: 20, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    createBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    
    empty: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { marginTop: 20, fontSize: 16, color: '#94a3b8', fontWeight: '600' }
});
