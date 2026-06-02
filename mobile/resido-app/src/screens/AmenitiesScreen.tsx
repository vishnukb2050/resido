import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { amenitiesApi } from '../services/api';

export default function AmenitiesScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const isAdmin = ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF'].includes(activeWorkspace?.role || '');

    const [loading, setLoading] = useState(true);
    const [amenities, setAmenities] = useState([]);
    const [myBookings, setMyBookings] = useState([]);
    const [activeTab, setActiveTab] = useState<'LIST' | 'BOOKINGS'>('LIST');

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [activeTab])
    );

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'LIST') {
                const { data } = await amenitiesApi.getAmenities();
                setAmenities(data);
            } else {
                const { data } = await amenitiesApi.getMyBookings();
                setMyBookings(data);
            }
        } catch (error) {
            console.error('Fetch amenities failed:', error);
            Alert.alert('Error', 'Failed to load amenities data.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            'Delete Amenity',
            `Are you sure you want to permanently delete ${name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await amenitiesApi.deleteAmenity(id);
                            fetchData();
                            Alert.alert('Success', 'Amenity deleted successfully');
                        } catch (error) {
                            console.error('Delete failed:', error);
                            Alert.alert('Error', 'Could not delete amenity');
                        }
                    }
                }
            ]
        );
    };

    const renderAmenityItem = ({ item }: { item: any }) => (
        <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push(`/amenity-details?id=${item.id}`)}
            activeOpacity={0.9}
        >
            {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.cardImage} />
            ) : (
                <View style={styles.cardImagePlaceholder}>
                    <Ionicons name="sparkles-outline" size={40} color="#cbd5e1" />
                </View>
            )}
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {isAdmin && (
                        <TouchableOpacity 
                            style={styles.deleteBtn}
                            onPress={() => handleDelete(item.id, item.name)}
                        >
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.description || 'No description provided.'}
                </Text>
                <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="people-outline" size={14} color="#64748b" />
                        <Text style={styles.metaText}>{item.maxPersons} max / slot</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={14} color="#64748b" />
                        <Text style={styles.metaText}>{item.timeSlots?.length || 0} slots</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderBookingItem = ({ item }: { item: any }) => (
        <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
                <Text style={styles.bookingAmenityName}>{item.amenity?.name}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'CONFIRMED' ? '#ecfdf5' : '#fef2f2' }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.status === 'CONFIRMED' ? '#059669' : '#ef4444' }
                    ]}>{item.status}</Text>
                </View>
            </View>
            <View style={styles.bookingDetails}>
                <View style={styles.bookingDetailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#64748b" />
                    <Text style={styles.bookingDetailText}>{item.bookingDate}</Text>
                </View>
                <View style={styles.bookingDetailItem}>
                    <Ionicons name="time-outline" size={16} color="#64748b" />
                    <Text style={styles.bookingDetailText}>{item.timeSlot}</Text>
                </View>
                <View style={styles.bookingDetailItem}>
                    <Ionicons name="people-outline" size={16} color="#64748b" />
                    <Text style={styles.bookingDetailText}>{item.persons} person(s)</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Amenities</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Segment Controls */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'LIST' && styles.activeTabBtn]}
                    onPress={() => setActiveTab('LIST')}
                >
                    <Text style={[styles.tabText, activeTab === 'LIST' && styles.activeTabText]}>All Amenities</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'BOOKINGS' && styles.activeTabBtn]}
                    onPress={() => setActiveTab('BOOKINGS')}
                >
                    <Text style={[styles.tabText, activeTab === 'BOOKINGS' && styles.activeTabText]}>My Bookings</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <FlatList
                    data={activeTab === 'LIST' ? amenities : myBookings}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={activeTab === 'LIST' ? renderAmenityItem : renderBookingItem}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons 
                                name={activeTab === 'LIST' ? "football-outline" : "calendar-outline"} 
                                size={64} 
                                color="#cbd5e1" 
                            />
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'LIST' ? 'No Amenities Available' : 'No Bookings Found'}
                            </Text>
                            <Text style={styles.emptySub}>
                                {activeTab === 'LIST' 
                                    ? 'Check back later or add amenities as an administrator.' 
                                    : 'You have not booked any amenities yet.'}
                            </Text>
                        </View>
                    }
                />
            )}

            {isAdmin && activeTab === 'LIST' && (
                <TouchableOpacity 
                    style={styles.fab}
                    onPress={() => router.push('/add-amenity')}
                >
                    <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

    tabsContainer: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, margin: 16 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    activeTabBtn: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
    activeTabText: { color: '#6366f1', fontWeight: '800' },

    listContent: { padding: 16, paddingBottom: 100 },
    card: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    cardImage: { width: '100%', height: 160, backgroundColor: '#f1f5f9' },
    cardImagePlaceholder: { width: '100%', height: 160, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    cardContent: { padding: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    deleteBtn: { padding: 4 },
    cardDescription: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 12 },
    cardMeta: { flexDirection: 'row', gap: 16 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontSize: 12, color: '#64748b', fontWeight: '500' },

    bookingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    bookingAmenityName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: '800' },
    bookingDetails: { gap: 8 },
    bookingDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bookingDetailText: { fontSize: 13, color: '#64748b', fontWeight: '500' },

    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#475569', marginTop: 16 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },

    fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }
});
