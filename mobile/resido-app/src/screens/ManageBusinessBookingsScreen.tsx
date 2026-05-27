import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    SafeAreaView, ActivityIndicator, RefreshControl, Alert, 
    Linking, StatusBar, Dimensions 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { businessApi } from '../services/api';

const { width } = Dimensions.get('window');

export default function ManageBusinessBookingsScreen() {
    const router = useRouter();
    const { profileId } = useLocalSearchParams();

    const [bookings, setBookings] = useState<any[]>([]);
    const [profileName, setProfileName] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'CANCELLED'>('ACTIVE');

    useEffect(() => {
        if (profileId) {
            fetchData();
        }
    }, [profileId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch business profile name
            const profileRes = await businessApi.getProfile(profileId as string);
            if (profileRes?.data) {
                setProfileName(profileRes.data.businessName);
            }

            // Fetch bookings
            const bookingsRes = await businessApi.getProfileBookings(profileId as string);
            setBookings(bookingsRes?.data || []);
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
            Alert.alert('Error', 'Failed to retrieve bookings for this business profile.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleCallCustomer = (phone: string) => {
        if (!phone) {
            Alert.alert('Not Available', 'This customer did not provide a phone number.');
            return;
        }
        Linking.openURL(`tel:${phone}`).catch((err) => {
            console.error('Failed to open dialer:', err);
            Alert.alert('Error', 'Failed to open dialer on this device.');
        });
    };

    const handleCancelBooking = (bookingId: string) => {
        Alert.alert(
            'Cancel Booking',
            'Are you sure you want to cancel this customer reservation?',
            [
                { text: 'Keep Reservation', style: 'cancel' },
                { 
                    text: 'Yes, Cancel', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await businessApi.cancelBooking(bookingId);
                            Alert.alert('Success', 'Booking cancelled successfully.');
                            // Fetch fresh list
                            const bookingsRes = await businessApi.getProfileBookings(profileId as string);
                            setBookings(bookingsRes?.data || []);
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

    const filteredBookings = bookings.filter((b) => {
        if (activeTab === 'ACTIVE') {
            return b.status === 'CONFIRMED';
        } else {
            return b.status === 'CANCELLED';
        }
    });

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#c084fc" />
                <Text style={styles.loadingText}>Loading Bookings...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Text style={styles.headerTitle}>Manage Bookings</Text>
                    {profileName ? (
                        <Text style={styles.headerSubtitle} numberOfLines={1}>{profileName}</Text>
                    ) : null}
                </View>
                <View style={{ width: 40 }} /> {/* Spacer to center the title */}
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'ACTIVE' && styles.activeTab]}
                    onPress={() => setActiveTab('ACTIVE')}
                >
                    <Ionicons name="calendar-outline" size={16} color={activeTab === 'ACTIVE' ? '#fff' : '#94a3b8'} style={{ marginRight: 6 }} />
                    <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.activeTabText]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'CANCELLED' && styles.activeTab]}
                    onPress={() => setActiveTab('CANCELLED')}
                >
                    <Ionicons name="close-circle-outline" size={16} color={activeTab === 'CANCELLED' ? '#fff' : '#94a3b8'} style={{ marginRight: 6 }} />
                    <Text style={[styles.tabText, activeTab === 'CANCELLED' && styles.activeTabText]}>Cancelled</Text>
                </TouchableOpacity>
            </View>

            {/* Scrollable list */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c084fc" />
                }
                showsVerticalScrollIndicator={false}
            >
                {filteredBookings.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconBox}>
                            <MaterialCommunityIcons 
                                name={activeTab === 'ACTIVE' ? 'calendar-blank' : 'calendar-remove'} 
                                size={64} 
                                color="#4b5563" 
                            />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'ACTIVE' ? 'No Active Reservations' : 'No Cancelled Bookings'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {activeTab === 'ACTIVE' 
                                ? 'When customers book your services or slots, they will appear here instantly.'
                                : 'Bookings that are cancelled by you or your customers will be shown in this list.'
                            }
                        </Text>
                    </View>
                ) : (
                    filteredBookings.map((booking) => (
                        <View key={booking.id} style={styles.bookingCard}>
                            {/* Card Header: Slot name and Guests */}
                            <View style={styles.cardHeader}>
                                <View style={styles.slotBadge}>
                                    <Ionicons name="bookmark-outline" size={14} color="#c084fc" style={{ marginRight: 6 }} />
                                    <Text style={styles.slotNameText}>{booking.slot?.name || 'Service Slot'}</Text>
                                </View>
                                <View style={styles.guestBadge}>
                                    <Ionicons name="people-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                                    <Text style={styles.guestText}>{booking.persons} {booking.persons === 1 ? 'Guest' : 'Guests'}</Text>
                                </View>
                            </View>

                            {/* Customer Details */}
                            <View style={styles.customerBox}>
                                <Text style={styles.customerLabel}>Customer Details</Text>
                                <Text style={styles.customerName}>{booking.userName || 'Resident'}</Text>
                                {booking.userPhone ? (
                                    <TouchableOpacity 
                                        style={styles.phoneLink} 
                                        onPress={() => handleCallCustomer(booking.userPhone)}
                                    >
                                        <Ionicons name="call-outline" size={14} color="#a084ca" style={{ marginRight: 4 }} />
                                        <Text style={styles.phoneLinkText}>{booking.userPhone}</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={styles.noPhoneText}>No phone number provided</Text>
                                )}
                            </View>

                            {/* Date and Time Section */}
                            <View style={styles.dateTimeGrid}>
                                <View style={styles.dateTimeCol}>
                                    <Text style={styles.gridLabel}>Date</Text>
                                    <Text style={styles.gridValue}>
                                        {new Date(booking.bookingDate).toLocaleDateString(undefined, { 
                                            weekday: 'short', month: 'short', day: 'numeric' 
                                        })}
                                    </Text>
                                </View>
                                <View style={styles.dateTimeCol}>
                                    <Text style={styles.gridLabel}>Time Window</Text>
                                    <Text style={styles.gridValue}>{booking.timeSlot}</Text>
                                </View>
                            </View>

                            {/* Custom Notes */}
                            {booking.notes ? (
                                <View style={styles.notesBox}>
                                    <Text style={styles.notesLabel}>Notes from Customer</Text>
                                    <Text style={styles.notesText}>{booking.notes}</Text>
                                </View>
                            ) : null}

                            {/* Actions footer */}
                            {booking.status === 'CONFIRMED' ? (
                                <View style={styles.cardActions}>
                                    <TouchableOpacity 
                                        style={styles.cancelBtn}
                                        onPress={() => handleCancelBooking(booking.id)}
                                    >
                                        <Ionicons name="close-circle-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                                        <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.cancelledBadge}>
                                    <Ionicons name="alert-circle-outline" size={14} color="#ef4444" style={{ marginRight: 6 }} />
                                    <Text style={styles.cancelledText}>Cancelled Reservation</Text>
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    loadingContainer: { flex: 1, backgroundColor: '#F8F5FF', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#9A8EBA', fontSize: 15, marginTop: 12, fontWeight: '600' },
    
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingTop: 15, 
        paddingBottom: 15,
        borderBottomWidth: 1, 
        borderBottomColor: '#EFE9F8' 
    },
    backBtn: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: '#F4EEFC', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    headerTitleBox: { flex: 1, alignItems: 'center', marginHorizontal: 12 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    headerSubtitle: { fontSize: 13, color: '#9A8EBA', marginTop: 2, fontWeight: '700' },

    tabContainer: { 
        flexDirection: 'row', 
        backgroundColor: '#ffffff', 
        margin: 16, 
        borderRadius: 14, 
        padding: 4, 
        borderWidth: 1, 
        borderColor: '#D4C9E8' 
    },
    tab: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingVertical: 10, 
        borderRadius: 10 
    },
    activeTab: { backgroundColor: '#8b5cf6' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#9A8EBA' },
    activeTabText: { color: '#2D2445' },

    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, marginTop: 60 },
    emptyIconBox: { 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        backgroundColor: '#ffffff', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 20 
    },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: '#7A6B9C', textAlign: 'center', lineHeight: 22 },

    bookingCard: { 
        backgroundColor: '#ffffff', 
        borderRadius: 20, 
        padding: 16, 
        marginBottom: 16, 
        borderWidth: 1, 
        borderColor: '#D4C9E8' 
    },
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottomWidth: 1, 
        borderBottomColor: '#EFE9F8', 
        paddingBottom: 12, 
        marginBottom: 12 
    },
    slotBadge: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    slotNameText: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    guestBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#ffffff', 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 8 
    },
    guestText: { fontSize: 12, color: '#7A6B9C', fontWeight: '800' },

    customerBox: { marginBottom: 16 },
    customerLabel: { fontSize: 10, color: '#7A6B9C', fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
    customerName: { fontSize: 16, fontWeight: '800', color: '#2D2445', marginBottom: 4 },
    phoneLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
    phoneLinkText: { fontSize: 13, color: '#c084fc', fontWeight: '700', textDecorationLine: 'underline' },
    noPhoneText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },

    dateTimeGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    dateTimeCol: { flex: 1 },
    gridLabel: { fontSize: 10, color: '#7A6B9C', fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
    gridValue: { fontSize: 13, color: '#7A6B9C', fontWeight: '700' },

    notesBox: { 
        backgroundColor: 'rgba(255,255,255,0.01)', 
        borderRadius: 10, 
        padding: 10, 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.02)',
        marginBottom: 16
    },
    notesLabel: { fontSize: 10, color: '#c084fc', fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
    notesText: { fontSize: 12, color: '#9A8EBA', lineHeight: 16 },

    cardActions: { 
        borderTopWidth: 1, 
        borderTopColor: '#EFE9F8', 
        paddingTop: 12, 
        marginTop: 4,
        alignItems: 'center'
    },
    cancelBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingVertical: 6, 
        paddingHorizontal: 16 
    },
    cancelBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '800' },

    cancelledBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 10,
        paddingVertical: 8,
        marginTop: 4
    },
    cancelledText: { color: '#ef4444', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }
});
