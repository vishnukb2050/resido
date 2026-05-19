import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { amenitiesApi } from '../services/api';

export default function AmenityDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [amenity, setAmenity] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);

    // Date & Slot selection state
    const [bookingDate, setBookingDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [personsCount, setPersonsCount] = useState(1);

    useEffect(() => {
        if (id) {
            fetchAmenityDetails();
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchBookingsForDate();
        }
    }, [bookingDate, id]);

    const fetchAmenityDetails = async () => {
        try {
            const { data } = await amenitiesApi.getAmenity(id);
            setAmenity(data);
        } catch (error) {
            console.error('Failed to fetch amenity details:', error);
            Alert.alert('Error', 'Failed to load details.');
        } finally {
            setLoading(false);
        }
    };

    const fetchBookingsForDate = async () => {
        try {
            const dateStr = bookingDate.toISOString().split('T')[0];
            const { data } = await amenitiesApi.getAmenityBookings(id, dateStr);
            setBookings(data || []);
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        }
    };

    const getSlotCapacityInfo = (slot: string) => {
        const slotBookings = bookings.filter(b => b.timeSlot === slot);
        const bookedCount = slotBookings.reduce((sum, b) => sum + b.persons, 0);
        const maxPersons = amenity?.maxPersons || 0;
        const remaining = maxPersons - bookedCount;
        return { bookedCount, remaining, isFull: remaining <= 0 };
    };

    const handleConfirmBooking = async () => {
        if (!selectedSlot) {
            Alert.alert('Selection Required', 'Please select a time slot.');
            return;
        }

        const { remaining } = getSlotCapacityInfo(selectedSlot);
        if (personsCount > remaining) {
            Alert.alert('Unavailable', 'This slot does not have enough remaining capacity for your requested party size.');
            return;
        }

        setBookingLoading(true);
        try {
            const dateStr = bookingDate.toISOString().split('T')[0];
            await amenitiesApi.bookAmenity(id, {
                bookingDate: dateStr,
                timeSlot: selectedSlot,
                persons: personsCount,
            });

            Alert.alert('Success', 'Amenity booked successfully!', [
                { text: 'OK', onPress: () => router.push('/amenities') }
            ]);
        } catch (error: any) {
            console.error('Booking failed:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to complete booking');
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#6366f1" />
            </SafeAreaView>
        );
    }

    if (!amenity) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={{ color: '#64748b' }}>Amenity not found.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{amenity.name}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scroll}>
                {amenity.photoUrl ? (
                    <Image source={{ uri: amenity.photoUrl }} style={styles.image} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="sparkles-outline" size={48} color="#94a3b8" />
                    </View>
                )}

                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.description}>{amenity.description || 'No description available.'}</Text>

                    {amenity.rules ? (
                        <>
                            <Text style={styles.sectionTitle}>Rules & Guidelines</Text>
                            <View style={styles.rulesBox}>
                                <Text style={styles.rulesText}>{amenity.rules}</Text>
                            </View>
                        </>
                    ) : null}

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Select Date & Booking</Text>
                    
                    {/* Date Selector */}
                    <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={20} color="#6366f1" />
                        <Text style={styles.dateText}>{bookingDate.toDateString()}</Text>
                        <Ionicons name="chevron-down" size={20} color="#64748b" />
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={bookingDate}
                            mode="date"
                            minimumDate={new Date()}
                            display="default"
                            onChange={(event, date) => {
                                setShowDatePicker(false);
                                if (date) setBookingDate(date);
                            }}
                        />
                    )}

                    {/* Time Slots grid */}
                    <Text style={styles.label}>Select Available Slot</Text>
                    <View style={styles.slotsGrid}>
                        {amenity.timeSlots?.map((slot: string) => {
                            const { remaining, isFull } = getSlotCapacityInfo(slot);
                            const isSelected = selectedSlot === slot;

                            return (
                                <TouchableOpacity
                                    key={slot}
                                    style={[
                                        styles.slotCard,
                                        isFull && styles.slotCardFull,
                                        isSelected && styles.slotCardSelected
                                    ]}
                                    onPress={() => !isFull && setSelectedSlot(slot)}
                                    disabled={isFull}
                                >
                                    <Text style={[
                                        styles.slotTime,
                                        isFull && styles.slotTextDisabled,
                                        isSelected && styles.slotTextSelected
                                    ]}>{slot}</Text>
                                    <Text style={[
                                        styles.slotCapacity,
                                        isFull && styles.slotTextDisabled,
                                        isSelected && styles.slotTextSelected
                                    ]}>
                                        {isFull ? 'FULL' : `${remaining} left`}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Party size picker */}
                    {selectedSlot && (
                        <View style={styles.partyContainer}>
                            <Text style={styles.label}>Number of Persons</Text>
                            <View style={styles.counterRow}>
                                <TouchableOpacity 
                                    style={styles.counterBtn}
                                    onPress={() => setPersonsCount(p => Math.max(1, p - 1))}
                                >
                                    <Ionicons name="remove" size={20} color="#1e293b" />
                                </TouchableOpacity>
                                <Text style={styles.counterValue}>{personsCount}</Text>
                                <TouchableOpacity 
                                    style={styles.counterBtn}
                                    onPress={() => setPersonsCount(p => p + 1)}
                                >
                                    <Ionicons name="add" size={20} color="#1e293b" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity 
                        style={[styles.bookBtn, !selectedSlot && styles.bookBtnDisabled]}
                        onPress={handleConfirmBooking}
                        disabled={!selectedSlot || bookingLoading}
                    >
                        {bookingLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.bookBtnText}>Confirm Booking</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

    scroll: { flex: 1 },
    image: { width: '100%', height: 200, backgroundColor: '#cbd5e1' },
    imagePlaceholder: { width: '100%', height: 200, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

    content: { padding: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    description: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 20 },
    rulesBox: { backgroundColor: '#fef2f2', borderLeftWidth: 4, borderColor: '#ef4444', borderRadius: 8, padding: 12, marginBottom: 20 },
    rulesText: { fontSize: 13, color: '#ef4444', lineHeight: 18, fontWeight: '500' },
    
    divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10, marginBottom: 20 },

    dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 14, marginBottom: 20 },
    dateText: { flex: 1, marginLeft: 12, fontSize: 15, color: '#1e293b', fontWeight: '600' },

    label: { fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 12, textTransform: 'uppercase' },
    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    slotCard: { width: '47%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, alignItems: 'center' },
    slotCardFull: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', opacity: 0.6 },
    slotCardSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
    slotTime: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    slotCapacity: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },
    slotTextSelected: { color: '#6366f1' },
    slotTextDisabled: { color: '#94a3b8' },

    partyContainer: { marginBottom: 24 },
    counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    counterBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
    counterValue: { fontSize: 18, fontWeight: '800', color: '#1e293b' },

    bookBtn: { backgroundColor: '#6366f1', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    bookBtnDisabled: { backgroundColor: '#cbd5e1', shadowOpacity: 0, elevation: 0 },
    bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
