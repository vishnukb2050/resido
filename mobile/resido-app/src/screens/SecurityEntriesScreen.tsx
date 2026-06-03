import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { visitorApi } from '../services/api';

const FILTERS = ['All', 'Visitors', 'Deliveries', 'Cabs', 'Staff'];

// Map the free-text `category` stored on a visitor entry to a UI filter bucket.
function categoryToType(category?: string): string {
    const c = (category || '').toLowerCase();
    if (c.includes('deliver')) return 'Deliveries';
    if (c.includes('cab') || c.includes('taxi')) return 'Cabs';
    if (c.includes('staff') || c.includes('maintenance') || c.includes('repair')) return 'Staff';
    return 'Visitors';
}

function iconForType(type: string): string {
    switch (type) {
        case 'Deliveries': return 'bicycle';
        case 'Cabs': return 'car';
        case 'Staff': return 'construct';
        default: return 'person';
    }
}

interface UiEntry {
    id: string;
    name: string;
    sub: string;
    time: string;
    status: 'IN' | 'OUT';
    photo?: string;
    icon: string;
    type: string;
}

export default function SecurityEntriesScreen() {
    const [activeFilter, setActiveFilter] = useState('All');
    const [entries, setEntries] = useState<UiEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const router = useRouter();

    const loadEntries = useCallback(async () => {
        try {
            const { data } = await visitorApi.getEntries();
            const list = Array.isArray(data) ? data : (data?.entries ?? []);
            const mapped: UiEntry[] = list.map((e: any) => {
                const type = categoryToType(e.category);
                const subParts = [e.unitToVisit, e.category || type].filter(Boolean);
                return {
                    id: e.id,
                    name: e.visitorName || 'Unknown',
                    sub: subParts.join(' • '),
                    time: e.inTime ? dayjs(e.inTime).format('hh:mm A') : '',
                    status: e.outTime ? 'OUT' : 'IN',
                    photo: e.photoUrl || undefined,
                    icon: iconForType(type),
                    type,
                };
            });
            setEntries(mapped);
        } catch (err) {
            console.error('Failed to load visitor entries', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadEntries();
    }, [loadEntries]);

    const filteredEntries = useMemo(() => {
        const byFilter = activeFilter === 'All' ? entries : entries.filter(e => e.type === activeFilter);
        const q = search.trim().toLowerCase();
        if (!q) return byFilter;
        return byFilter.filter(e =>
            e.name.toLowerCase().includes(q) || e.sub.toLowerCase().includes(q),
        );
    }, [entries, activeFilter, search]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fcfcfd' }}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Today's Entries</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={20} color="#94a3b8" />
                    <TextInput 
                        placeholder="Search by name, number or vehicle..." 
                        style={styles.searchInput}
                        placeholderTextColor="#94a3b8"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {/* Filters */}
            <View>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={FILTERS}
                    contentContainerStyle={styles.filterList}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
                            onPress={() => setActiveFilter(item)}
                        >
                            <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* List */}
            {loading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#1d4ed8" />
                </View>
            ) : (
            <FlatList
                data={filteredEntries}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                        <Ionicons name="file-tray-outline" size={40} color="#cbd5e1" />
                        <Text style={{ color: '#94a3b8', marginTop: 10, fontWeight: '600' }}>No entries yet</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.entryItem}>
                        <View style={styles.avatarBox}>
                            {item.photo ? (
                                <Image source={{ uri: item.photo }} style={styles.avatarImg} />
                            ) : (
                                <View style={styles.iconBox}>
                                    <Ionicons name={item.icon as any} size={20} color="#64748b" />
                                </View>
                            )}
                        </View>
                        <View style={styles.contentBox}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.sub}>{item.sub}</Text>
                        </View>
                        <View style={styles.rightBox}>
                            <View style={[styles.badge, item.status === 'OUT' && styles.badgeOut]}>
                                <Text style={[styles.badgeText, item.status === 'OUT' && styles.badgeTextOut]}>
                                    {item.status}
                                </Text>
                            </View>
                            <Text style={styles.time}>{item.time}</Text>
                        </View>
                    </View>
                )}
            />
            )}

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.totalText}>Total Entries: {entries.length}</Text>
                <TouchableOpacity>
                    <Text style={styles.exportText}>Export</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    searchContainer: { paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#fff' },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#f1f5f9' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b', fontWeight: '500' },
    filterList: { paddingHorizontal: 20, paddingBottom: 15, gap: 8, backgroundColor: '#fff' },
    filterChip: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
    filterChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    filterText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    filterTextActive: { color: '#2D2445' },
    listContent: { padding: 20, gap: 12 },
    entryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    avatarBox: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%' },
    iconBox: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    contentBox: { flex: 1, marginLeft: 12 },
    name: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    sub: { fontSize: 11, color: '#64748b', marginTop: 2 },
    rightBox: { alignItems: 'flex-end', gap: 6 },
    badge: { backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeOut: { backgroundColor: '#fff1f2' },
    badgeText: { fontSize: 9, color: '#10b981', fontWeight: '900' },
    badgeTextOut: { color: '#ef4444' },
    time: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
    footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalText: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
    exportText: { fontSize: 13, fontWeight: '800', color: '#1d4ed8' },
});
