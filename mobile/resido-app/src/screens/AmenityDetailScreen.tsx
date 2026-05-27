import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, Alert, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { amenitiesApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function AmenityDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [amenity, setAmenity] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);

    const { activeWorkspace } = useAuthStore();
    const isAdmin = ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF'].includes(activeWorkspace?.role || '');

    // Date & Slot selection state
    const [bookingDate, setBookingDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [personsCount, setPersonsCount] = useState(1);

    // Recurring booking state
    const [isRecurringBooking, setIsRecurringBooking] = useState(false);
    const [recurringPeriod, setRecurringPeriod] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');

    useEffect(() => {
        if (id) {
            fetchAmenityDetails(bookingDate);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchBookingsForDate();
            fetchAmenityDetails(bookingDate);
        }
    }, [bookingDate, id]);

    const fetchAmenityDetails = async (dateVal: Date) => {
        try {
            const dateStr = dateVal.toISOString().split('T')[0];
            const { data } = await amenitiesApi.getAmenity(id, dateStr);
            setAmenity(data);
        } catch (error) {
            console.error('Failed to fetch amenity details:', error);
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
        const isFull = slotBookings.length > 0;
        // Remaining is forced to 0 if booked, else it takes the amenity maxPersons
        const maxPersons = amenity?.maxPersons || 0;
        const remaining = isFull ? 0 : maxPersons;
        return { bookedCount: slotBookings.length, remaining, isFull };
    };

    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const dateStr = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth()+1).padStart(2, '0')}-${String(bookingDate.getDate()).padStart(2, '0')}`;
    const isPastDate = dateStr < todayStr;

    const getAvailableSlotsForDate = () => {
        if (!amenity) return [];
        const configStr = amenity.scheduleConfig;
        if (!configStr) return amenity.timeSlots || [];
        
        try {
            const config = JSON.parse(configStr);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayOfWeek = days[bookingDate.getDay()];
            const dayOfMonth = bookingDate.getDate();

            if (amenity.scheduleType === 'WEEKLY') {
                return config[dayOfWeek] || [];
            } else if (amenity.scheduleType === 'MONTHLY') {
                if (config.daysOfMonth && config.daysOfMonth.includes(dayOfMonth)) {
                    return config.slots || [];
                }
                return [];
            } else if (amenity.scheduleType === 'CUSTOM') {
                if (config.dates && config.dates[dateStr]) {
                    return config.dates[dateStr];
                }
                return [];
            }
        } catch(e) {
            console.error(e);
        }
        return amenity.timeSlots || [];
    };

    const isPastTimeSlot = (slot: string) => {
        if (isPastDate) return true;
        if (dateStr > todayStr) return false;

        try {
            const startTimeStr = slot.split('-')[0].trim();
            const [time, ampm] = startTimeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            
            const now = new Date();
            const slotTime = new Date();
            slotTime.setHours(hours, minutes, 0, 0);
            
            return now > slotTime;
        } catch(e) {
            return false;
        }
    };

    const currentSlotsForDate = getAvailableSlotsForDate();

    const handleConfirmBooking = async () => {
        if (!selectedSlot) {
            Alert.alert('Selection Required', 'Please select a time slot.');
            return;
        }

        const { remaining, isFull } = getSlotCapacityInfo(selectedSlot);
        
        // Block simple bookings for full / past slots if recurring is not selected
        if ((isFull || isPastDate) && !isRecurringBooking) {
            Alert.alert('Unavailable', 'This slot is fully booked or has ended. Toggle "Schedule Recurrently" to book future occurrences.');
            return;
        }

        if (!isRecurringBooking && personsCount > remaining) {
            Alert.alert('Unavailable', 'This slot does not have enough remaining capacity for your requested party size.');
            return;
        }

        setBookingLoading(true);
        try {
            await amenitiesApi.bookAmenity(id, {
                bookingDate: dateStr,
                timeSlot: selectedSlot,
                persons: personsCount,
                isRecurring: isRecurringBooking,
                recurringPeriod: isRecurringBooking ? recurringPeriod : null
            });

            Alert.alert('Success', isRecurringBooking ? 'Recurring bookings successfully scheduled!' : 'Amenity booked successfully!', [
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
                        <Ionicons name="sparkles-outline" size={48} color="#cbd5e1" />
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
                            minimumDate={new Date()} // Prevent past dates
                            display="default"
                            onChange={(event, date) => {
                                setShowDatePicker(false);
                                if (date) setBookingDate(date);
                            }}
                        />
                    )}

                    {/* Admin Bookings Section */}
                    {isAdmin && bookings.length > 0 && (
                        <View style={styles.adminSection}>
                            <Text style={styles.adminSectionTitle}>Admin: Today's Bookings</Text>
                            {bookings.map((b, index) => (
                                <View key={b.id || index} style={styles.adminBookingCard}>
                                    <View style={styles.adminBookingRow}>
                                        <Ionicons name="time-outline" size={16} color="#6366f1" />
                                        <Text style={styles.adminBookingTime}>{b.timeSlot}</Text>
                                    </View>
                                    <View style={styles.adminBookingRow}>
                                        <Ionicons name="person-outline" size={16} color="#475569" />
                                        <Text style={styles.adminBookingName}>{b.member?.name || 'Resident'}</Text>
                                    </View>
                                    <View style={styles.adminBookingRow}>
                                        <Ionicons name="people-outline" size={16} color="#475569" />
                                        <Text style={styles.adminBookingPersons}>{b.persons} Person(s)</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Time Slots grid */}
                    <Text style={styles.label}>Select Available Slot</Text>
                    <View style={styles.slotsGrid}>
                        {currentSlotsForDate.map((slot: string) => {
                            const { remaining, isFull } = getSlotCapacityInfo(slot);
                            const isSelected = selectedSlot === slot;
                            const isPast = isPastTimeSlot(slot);
                            const isSelectable = !isFull && !isPast;
                            const allowRecur = amenity.allowRecurringBookings;

                            return (
                                <TouchableOpacity
                                    key={slot}
                                    style={[
                                        styles.slotCard,
                                        isFull && styles.slotCardFull,
                                        isPast && styles.slotCardPast,
                                        isSelected && styles.slotCardSelected
                                    ]}
                                    onPress={() => {
                                        if (isSelectable) {
                                            setSelectedSlot(slot);
                                            setIsRecurringBooking(false);
                                        } else if (allowRecur) {
                                            // Let them select full/past slots for recurring bookings
                                            setSelectedSlot(slot);
                                            setIsRecurringBooking(true);
                                        } else {
                                            Alert.alert('Unavailable', 'This slot is booked or past and recurring bookings are disabled.');
                                        }
                                    }}
                                >
                                    <Text style={[
                                        styles.slotTime,
                                        (isFull || isPast) && styles.slotTextDisabled,
                                        isSelected && styles.slotTextSelected
                                    ]}>{slot}</Text>
                                    <Text style={[
                                        styles.slotCapacity,
                                        (isFull || isPast) && styles.slotTextDisabled,
                                        isSelected && styles.slotTextSelected
                                    ]}>
                                        {isPast ? 'PAST' : isFull ? (allowRecur ? 'RECURRING OK' : 'ALREADY BOOKED') : 'AVAILABLE'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        {currentSlotsForDate.length === 0 && (
                            <Text style={styles.emptyText}>No available slots found for this date.</Text>
                        )}
                    </View>

                    {/* Dynamic Recurring Card for Full/Past Slots */}
                    {selectedSlot && (getSlotCapacityInfo(selectedSlot).isFull || isPastDate) && amenity.allowRecurringBookings && (
                        <View style={styles.recurringCard}>
                            <View style={styles.recHeader}>
                                <Ionicons name="repeat-outline" size={22} color="#6366f1" />
                                <Text style={styles.recTitle}>Book Future Occurrences</Text>
                            </View>
                            <Text style={styles.recHelp}>This slot is full or completed today. You can auto-schedule the next occurrences.</Text>
                            
                            <View style={styles.recSwitchRow}>
                                <Text style={styles.recLabel}>Schedule Recurrently</Text>
                                <Switch 
                                    value={isRecurringBooking}
                                    onValueChange={setIsRecurringBooking}
                                    trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                                    thumbColor={isRecurringBooking ? '#6366f1' : '#f4f3f4'}
                                />
                            </View>

                            {isRecurringBooking && (
                                <View style={styles.recTypeRow}>
                                    <TouchableOpacity 
                                        style={[styles.recTypeBtn, recurringPeriod === 'WEEKLY' && styles.recTypeBtnActive]}
                                        onPress={() => setRecurringPeriod('WEEKLY')}
                                    >
                                        <Text style={[styles.recTypeText, recurringPeriod === 'WEEKLY' && styles.recTypeTextActive]}>Weekly Day</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.recTypeBtn, recurringPeriod === 'MONTHLY' && styles.recTypeBtnActive]}
                                        onPress={() => setRecurringPeriod('MONTHLY')}
                                    >
                                        <Text style={[styles.recTypeText, recurringPeriod === 'MONTHLY' && styles.recTypeTextActive]}>Monthly Date</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Party size picker */}
                    {selectedSlot && (!getSlotCapacityInfo(selectedSlot).isFull && !isPastDate) && (
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
                            <Text style={styles.bookBtnText}>
                                {isRecurringBooking ? 'Confirm Recurring Booking' : 'Confirm Booking'}
                            </Text>
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

    label: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 12, textTransform: 'uppercase' },
    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    slotCard: { width: '47%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, alignItems: 'center' },
    slotCardFull: { backgroundColor: '#fff8f6', borderColor: '#fecaca' },
    slotCardPast: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', opacity: 0.8 },
    slotCardSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
    slotTime: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    slotCapacity: { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '700' },
    slotTextSelected: { color: '#6366f1' },
    slotTextDisabled: { color: '#94a3b8' },
    emptyText: { color: '#94a3b8', fontStyle: 'italic', paddingVertical: 15 },

    partyContainer: { marginBottom: 24 },
    counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    counterBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
    counterValue: { fontSize: 18, fontWeight: '800', color: '#1e293b' },

    // Recurring booking styling
    recurringCard: { backgroundColor: '#f8fafc', borderStyle: 'solid', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, marginBottom: 24 },
    recHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    recTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    recHelp: { fontSize: 12, color: '#64748b', lineHeight: 16, marginBottom: 12 },
    recSwitchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    recLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
    recTypeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    recTypeBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    recTypeBtnActive: { backgroundColor: '#6366f1' },
    recTypeText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    recTypeTextActive: { color: '#2D2445' },

    bookBtn: { backgroundColor: '#6366f1', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    bookBtnDisabled: { backgroundColor: '#cbd5e1', shadowOpacity: 0, elevation: 0 },
    bookBtnText: { color: '#2D2445', fontSize: 16, fontWeight: '800' },

    // Admin Bookings
    adminSection: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    adminSectionTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 12, textTransform: 'uppercase' },
    adminBookingCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    adminBookingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    adminBookingTime: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    adminBookingName: { fontSize: 14, fontWeight: '600', color: '#475569' },
    adminBookingPersons: { fontSize: 13, color: '#64748b' }
});
