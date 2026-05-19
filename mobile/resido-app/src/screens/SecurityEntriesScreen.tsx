import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const FILTERS = ['All', 'Visitors', 'Deliveries', 'Cabs', 'Staff'];

export default function SecurityEntriesScreen() {
    const [activeFilter, setActiveFilter] = useState('All');
    const router = useRouter();

    const ENTRIES = [
        { id: '1', name: 'Rahul Sharma', sub: 'Flat A-203 • Visitor', time: '10:30 AM', status: 'IN', photo: 'https://i.pravatar.cc/100?u=1', type: 'Visitors' },
        { id: '2', name: 'Swiggy Delivery', sub: 'KL07CS1234 - Delivery', time: '10:22 AM', status: 'IN', icon: 'bicycle', type: 'Deliveries' },
        { id: '3', name: 'Uber - White Swift', sub: 'KL07CP4567 - Cab', time: '10:15 AM', status: 'IN', icon: 'car', type: 'Cabs' },
        { id: '4', name: 'Amit (Plumber)', sub: 'Staff - Maintenance', time: '09:50 AM', status: 'IN', photo: 'https://i.pravatar.cc/100?u=4', type: 'Staff' },
        { id: '5', name: 'Amazon Delivery', sub: 'KL07DE7788 - Delivery', time: '09:40 AM', status: 'OUT', icon: 'bicycle', type: 'Deliveries' },
    ];

    const filteredEntries = activeFilter === 'All' ? ENTRIES : ENTRIES.filter(e => e.type === activeFilter);

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
            <FlatList
                data={filteredEntries}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
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

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.totalText}>Total Entries: 64</Text>
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
    filterChipActive: { backgroundColor: '#4c1d95', borderColor: '#4c1d95' },
    filterText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    filterTextActive: { color: '#fff' },
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
    exportText: { fontSize: 13, fontWeight: '800', color: '#4c1d95' },
});
