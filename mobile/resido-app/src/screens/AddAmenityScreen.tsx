import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, Image, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { amenitiesApi } from '../services/api';
import { storageApi } from '../services/storage';

export default function AddAmenityScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [rules, setRules] = useState('');
    const [maxPersons, setMaxPersons] = useState('10');
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    // Advanced Scheduling State
    const [scheduleType, setScheduleType] = useState<'WEEKLY' | 'MONTHLY' | 'CUSTOM'>('WEEKLY');
    const [allowRecurringBookings, setAllowRecurringBookings] = useState(true);

    // 1. Weekly days schedule state
    const [weeklyConfig, setWeeklyConfig] = useState<Record<string, string[]>>({
        Monday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
        Tuesday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
        Wednesday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
        Thursday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
        Friday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
        Saturday: ['10:00 AM - 12:00 PM', '02:00 PM - 04:00 PM'],
        Sunday: ['10:00 AM - 12:00 PM', '02:00 PM - 04:00 PM'],
    });
    const [selectedWeeklyDay, setSelectedWeeklyDay] = useState('Monday');
    const [weeklyNewSlot, setWeeklyNewSlot] = useState('');

    // 2. Monthly schedule state
    const [monthlyDays, setMonthlyDays] = useState<number[]>([1, 15]);
    const [monthlySlots, setMonthlySlots] = useState<string[]>(['09:00 AM - 12:00 PM', '02:00 PM - 05:00 PM']);
    const [monthlyNewSlot, setMonthlyNewSlot] = useState('');
    const [monthlyDayInput, setMonthlyDayInput] = useState('');

    // 3. Custom calendar schedule state
    const [customDatesSlots, setCustomDatesSlots] = useState<Record<string, string[]>>({
        '2026-05-20': ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM'],
        '2026-05-21': ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM'],
    });
    const [selectedCustomDate, setSelectedCustomDate] = useState('2026-05-20');
    const [customNewSlot, setCustomNewSlot] = useState('');
    const [customDateInput, setCustomDateInput] = useState('');

    // Weekly slot handlers
    const handleAddWeeklySlot = () => {
        if (!weeklyNewSlot.trim()) return;
        const currentSlots = weeklyConfig[selectedWeeklyDay] || [];
        if (currentSlots.includes(weeklyNewSlot.trim())) {
            Alert.alert('Duplicate', 'This time slot is already added for ' + selectedWeeklyDay);
            return;
        }
        setWeeklyConfig({
            ...weeklyConfig,
            [selectedWeeklyDay]: [...currentSlots, weeklyNewSlot.trim()]
        });
        setWeeklyNewSlot('');
    };

    const handleRemoveWeeklySlot = (slotToRemove: string) => {
        const currentSlots = weeklyConfig[selectedWeeklyDay] || [];
        setWeeklyConfig({
            ...weeklyConfig,
            [selectedWeeklyDay]: currentSlots.filter(s => s !== slotToRemove)
        });
    };

    // Monthly slot/day handlers
    const handleAddMonthlyDay = () => {
        const dayNum = parseInt(monthlyDayInput);
        if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
            Alert.alert('Invalid Day', 'Please enter a day between 1 and 31');
            return;
        }
        if (monthlyDays.includes(dayNum)) {
            Alert.alert('Duplicate', 'This day is already added.');
            return;
        }
        setMonthlyDays([...monthlyDays, dayNum].sort((a, b) => a - b));
        setMonthlyDayInput('');
    };

    const handleRemoveMonthlyDay = (day: number) => {
        setMonthlyDays(monthlyDays.filter(d => d !== day));
    };

    const handleAddMonthlySlot = () => {
        if (!monthlyNewSlot.trim()) return;
        if (monthlySlots.includes(monthlyNewSlot.trim())) {
            Alert.alert('Duplicate', 'This slot is already added.');
            return;
        }
        setMonthlySlots([...monthlySlots, monthlyNewSlot.trim()]);
        setMonthlyNewSlot('');
    };

    const handleRemoveMonthlySlot = (slotToRemove: string) => {
        setMonthlySlots(monthlySlots.filter(s => s !== slotToRemove));
    };

    // Custom date/slot handlers
    const handleAddCustomDate = () => {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(customDateInput.trim())) {
            Alert.alert('Invalid Format', 'Please enter date as YYYY-MM-DD');
            return;
        }
        if (customDatesSlots[customDateInput.trim()]) {
            Alert.alert('Exists', 'This date is already initialized.');
            setSelectedCustomDate(customDateInput.trim());
            return;
        }
        setCustomDatesSlots({
            ...customDatesSlots,
            [customDateInput.trim()]: ['09:00 AM - 10:00 AM']
        });
        setSelectedCustomDate(customDateInput.trim());
        setCustomDateInput('');
    };

    const handleRemoveCustomDate = (dateStr: string) => {
        const updated = { ...customDatesSlots };
        delete updated[dateStr];
        setCustomDatesSlots(updated);
        
        const remainingKeys = Object.keys(updated);
        if (remainingKeys.length > 0) {
            setSelectedCustomDate(remainingKeys[0]);
        } else {
            setSelectedCustomDate('');
        }
    };

    const handleAddCustomSlot = () => {
        if (!selectedCustomDate) {
            Alert.alert('No Date', 'Please add or select a custom date first.');
            return;
        }
        if (!customNewSlot.trim()) return;
        const currentSlots = customDatesSlots[selectedCustomDate] || [];
        if (currentSlots.includes(customNewSlot.trim())) {
            Alert.alert('Duplicate', 'This slot is already added.');
            return;
        }
        setCustomDatesSlots({
            ...customDatesSlots,
            [selectedCustomDate]: [...currentSlots, customNewSlot.trim()]
        });
        setCustomNewSlot('');
    };

    const handleRemoveCustomSlot = (slotToRemove: string) => {
        const currentSlots = customDatesSlots[selectedCustomDate] || [];
        setCustomDatesSlots({
            ...customDatesSlots,
            [selectedCustomDate]: currentSlots.filter(s => s !== slotToRemove)
        });
    };

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Permission to access gallery is required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Amenity Name is required.');
            return;
        }

        // Formulate scheduling data
        let finalScheduleConfig = '';
        let finalTimeSlots: string[] = [];
        let finalAvailableDates: string[] = [];

        if (scheduleType === 'WEEKLY') {
            finalScheduleConfig = JSON.stringify(weeklyConfig);
            const allSlots = new Set<string>();
            Object.values(weeklyConfig).forEach(slots => slots.forEach(s => allSlots.add(s)));
            finalTimeSlots = Array.from(allSlots);
            if (finalTimeSlots.length === 0) {
                Alert.alert('Error', 'Please add at least one slot in your Weekly schedule.');
                return;
            }
            finalAvailableDates = ['Weekly Slots Enabled'];
        } else if (scheduleType === 'MONTHLY') {
            if (monthlyDays.length === 0 || monthlySlots.length === 0) {
                Alert.alert('Error', 'Monthly schedule needs both days of the month and available slots.');
                return;
            }
            finalScheduleConfig = JSON.stringify({
                daysOfMonth: monthlyDays,
                slots: monthlySlots
            });
            finalTimeSlots = monthlySlots;
            finalAvailableDates = monthlyDays.map(d => `Day ${d}`);
        } else { // CUSTOM
            const keys = Object.keys(customDatesSlots);
            if (keys.length === 0) {
                Alert.alert('Error', 'Please add at least one Custom Date with time slots.');
                return;
            }
            finalScheduleConfig = JSON.stringify({
                dates: customDatesSlots
            });
            const allSlots = new Set<string>();
            Object.values(customDatesSlots).forEach(slots => slots.forEach(s => allSlots.add(s)));
            finalTimeSlots = Array.from(allSlots);
            finalAvailableDates = keys;
        }

        setLoading(true);
        try {
            let uploadedPhotoUrl = '';
            if (photoUri) {
                const res = await storageApi.uploadFile(
                    photoUri,
                    `amenity_${Date.now()}.jpg`,
                    'image/jpeg',
                    'amenities'
                );
                uploadedPhotoUrl = res as string;
            }

            await amenitiesApi.createAmenity({
                name: name.trim(),
                description: description.trim(),
                rules: rules.trim(),
                maxPersons: parseInt(maxPersons) || 10,
                photoUrl: uploadedPhotoUrl,
                timeSlots: finalTimeSlots,
                availableDates: finalAvailableDates,
                scheduleType,
                scheduleConfig: finalScheduleConfig,
                allowRecurringBookings
            });

            Alert.alert('Success', 'Amenity successfully added with advanced schedules!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Failed to add amenity:', error);
            Alert.alert('Error', 'Failed to add amenity');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Amenity & Schedule</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 50 }}>
                {/* Photo Picker */}
                <TouchableOpacity style={styles.photoPicker} onPress={handlePickPhoto}>
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <Ionicons name="sparkles-outline" size={32} color="#6366f1" />
                            <Text style={styles.photoPlaceholderText}>Upload Amenity Cover Photo</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={{ paddingHorizontal: 20 }}>
                    {/* Basic Form fields */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Amenity Name</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. Clubhouse Lounge, Sports Court" 
                            placeholderTextColor="#94a3b8"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="Provide details about the amenity..." 
                            placeholderTextColor="#94a3b8"
                            multiline
                            numberOfLines={3}
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Rules & Regulations</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="Rules (e.g. Dress code, booking parameters)..." 
                            placeholderTextColor="#94a3b8"
                            multiline
                            numberOfLines={3}
                            value={rules}
                            onChangeText={setRules}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Text style={styles.label}>Max Persons per Slot</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="e.g. 10" 
                                placeholderTextColor="#94a3b8"
                                keyboardType="numeric"
                                value={maxPersons}
                                onChangeText={setMaxPersons}
                            />
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Premium Scheduling Builder */}
                    <Text style={styles.sectionTitle}>📅 Advanced Availability Schedule</Text>

                    {/* Selector Tabs */}
                    <View style={styles.tabsRow}>
                        <TouchableOpacity 
                            style={[styles.tabBtn, scheduleType === 'WEEKLY' && styles.tabBtnActive]} 
                            onPress={() => setScheduleType('WEEKLY')}
                        >
                            <Text style={[styles.tabBtnText, scheduleType === 'WEEKLY' && styles.tabBtnTextActive]}>Weekly Days</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabBtn, scheduleType === 'MONTHLY' && styles.tabBtnActive]} 
                            onPress={() => setScheduleType('MONTHLY')}
                        >
                            <Text style={[styles.tabBtnText, scheduleType === 'MONTHLY' && styles.tabBtnTextActive]}>Monthly Pattern</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabBtn, scheduleType === 'CUSTOM' && styles.tabBtnActive]} 
                            onPress={() => setScheduleType('CUSTOM')}
                        >
                            <Text style={[styles.tabBtnText, scheduleType === 'CUSTOM' && styles.tabBtnTextActive]}>Custom Calendar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 1. WEEKLY FORM */}
                    {scheduleType === 'WEEKLY' && (
                        <View style={styles.schedulePanel}>
                            <Text style={styles.helperText}>Select a day below to configure its valid time slots:</Text>
                            
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                                {Object.keys(weeklyConfig).map(day => (
                                    <TouchableOpacity 
                                        key={day} 
                                        style={[styles.dayChip, selectedWeeklyDay === day && styles.dayChipActive]}
                                        onPress={() => setSelectedWeeklyDay(day)}
                                    >
                                        <Text style={[styles.dayChipText, selectedWeeklyDay === day && styles.dayChipTextActive]}>{day}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={styles.builderCard}>
                                <Text style={styles.builderCardTitle}>Slots for {selectedWeeklyDay}</Text>
                                <View style={styles.slotInputRow}>
                                    <TextInput 
                                        style={[styles.input, { flex: 1, backgroundColor: '#f1f5f9' }]} 
                                        placeholder="e.g. 09:00 AM - 10:00 AM" 
                                        placeholderTextColor="#94a3b8"
                                        value={weeklyNewSlot}
                                        onChangeText={setWeeklyNewSlot}
                                    />
                                    <TouchableOpacity style={styles.addSlotBtn} onPress={handleAddWeeklySlot}>
                                        <Ionicons name="add" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.slotsContainer}>
                                    {(weeklyConfig[selectedWeeklyDay] || []).map((slot, index) => (
                                        <View key={index} style={styles.slotBadge}>
                                            <Text style={styles.slotBadgeText}>{slot}</Text>
                                            <TouchableOpacity onPress={() => handleRemoveWeeklySlot(slot)}>
                                                <Ionicons name="close-circle" size={16} color="#4f46e5" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {(weeklyConfig[selectedWeeklyDay] || []).length === 0 && (
                                        <Text style={styles.emptyText}>No slots configured for this day.</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* 2. MONTHLY FORM */}
                    {scheduleType === 'MONTHLY' && (
                        <View style={styles.schedulePanel}>
                            <Text style={styles.helperText}>Set which days of the month this amenity can be reserved:</Text>
                            
                            <View style={styles.slotInputRow}>
                                <TextInput 
                                    style={[styles.input, { flex: 1 }]} 
                                    placeholder="Enter day of month (1-31)" 
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={monthlyDayInput}
                                    onChangeText={setMonthlyDayInput}
                                />
                                <TouchableOpacity style={styles.addSlotBtn} onPress={handleAddMonthlyDay}>
                                    <Ionicons name="calendar-outline" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.slotsContainer}>
                                {monthlyDays.map(day => (
                                    <View key={day} style={[styles.slotBadge, { backgroundColor: '#eef2ff' }]}>
                                        <Text style={[styles.slotBadgeText, { color: '#6366f1' }]}>Every {day}th</Text>
                                        <TouchableOpacity onPress={() => handleRemoveMonthlyDay(day)}>
                                            <Ionicons name="close-circle" size={16} color="#6366f1" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>

                            <View style={[styles.builderCard, { marginTop: 20 }]}>
                                <Text style={styles.builderCardTitle}>Available Monthly Time Slots</Text>
                                <View style={styles.slotInputRow}>
                                    <TextInput 
                                        style={[styles.input, { flex: 1, backgroundColor: '#f1f5f9' }]} 
                                        placeholder="e.g. 09:00 AM - 12:00 PM" 
                                        placeholderTextColor="#94a3b8"
                                        value={monthlyNewSlot}
                                        onChangeText={setMonthlyNewSlot}
                                    />
                                    <TouchableOpacity style={styles.addSlotBtn} onPress={handleAddMonthlySlot}>
                                        <Ionicons name="add" size={24} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.slotsContainer}>
                                    {monthlySlots.map((slot, index) => (
                                        <View key={index} style={styles.slotBadge}>
                                            <Text style={styles.slotBadgeText}>{slot}</Text>
                                            <TouchableOpacity onPress={() => handleRemoveMonthlySlot(slot)}>
                                                <Ionicons name="close-circle" size={16} color="#4f46e5" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* 3. CUSTOM CALENDAR FORM */}
                    {scheduleType === 'CUSTOM' && (
                        <View style={styles.schedulePanel}>
                            <Text style={styles.helperText}>Configure specific isolated calendar dates and their exact slots:</Text>

                            <View style={styles.slotInputRow}>
                                <TextInput 
                                    style={[styles.input, { flex: 1 }]} 
                                    placeholder="Enter Date (YYYY-MM-DD)" 
                                    placeholderTextColor="#94a3b8"
                                    value={customDateInput}
                                    onChangeText={setCustomDateInput}
                                />
                                <TouchableOpacity style={styles.addSlotBtn} onPress={handleAddCustomDate}>
                                    <Ionicons name="checkmark" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
                                {Object.keys(customDatesSlots).map(dateStr => (
                                    <View key={dateStr} style={{ marginRight: 10, flexDirection: 'row', alignItems: 'center' }}>
                                        <TouchableOpacity 
                                            style={[styles.dayChip, selectedCustomDate === dateStr && styles.dayChipActive]}
                                            onPress={() => setSelectedCustomDate(dateStr)}
                                        >
                                            <Text style={[styles.dayChipText, selectedCustomDate === dateStr && styles.dayChipTextActive]}>{dateStr}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={{ marginLeft: -15, zIndex: 10 }} onPress={() => handleRemoveCustomDate(dateStr)}>
                                            <Ionicons name="close-circle" size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>

                            {selectedCustomDate ? (
                                <View style={styles.builderCard}>
                                    <Text style={styles.builderCardTitle}>Slots for {selectedCustomDate}</Text>
                                    <View style={styles.slotInputRow}>
                                        <TextInput 
                                            style={[styles.input, { flex: 1, backgroundColor: '#f1f5f9' }]} 
                                            placeholder="e.g. 02:00 PM - 03:00 PM" 
                                            placeholderTextColor="#94a3b8"
                                            value={customNewSlot}
                                            onChangeText={setCustomNewSlot}
                                        />
                                        <TouchableOpacity style={styles.addSlotBtn} onPress={handleAddCustomSlot}>
                                            <Ionicons name="add" size={24} color="#fff" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.slotsContainer}>
                                        {(customDatesSlots[selectedCustomDate] || []).map((slot, index) => (
                                            <View key={index} style={styles.slotBadge}>
                                                <Text style={styles.slotBadgeText}>{slot}</Text>
                                                <TouchableOpacity onPress={() => handleRemoveCustomSlot(slot)}>
                                                    <Ionicons name="close-circle" size={16} color="#4f46e5" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ) : (
                                <Text style={styles.emptyText}>Add a custom date to build its time slots list.</Text>
                            )}
                        </View>
                    )}

                    <View style={styles.divider} />

                    {/* Recurring Booking Option */}
                    <View style={styles.switchRow}>
                        <View style={{ flex: 1, marginRight: 15 }}>
                            <Text style={styles.switchLabel}>Allow Recurring Bookings</Text>
                            <Text style={styles.switchHelp}>Allows residents to schedule recurring reservations weekly or monthly if a slot fills up or is completed.</Text>
                        </View>
                        <Switch 
                            value={allowRecurringBookings}
                            onValueChange={setAllowRecurringBookings}
                            trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                            thumbColor={allowRecurringBookings ? '#6366f1' : '#f4f3f4'}
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Amenity & Schedule</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

    scroll: { flex: 1 },
    field: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', padding: 14, fontSize: 15, color: '#1e293b' },
    textArea: { height: 75, textAlignVertical: 'top' },
    
    photoPicker: { height: 160, backgroundColor: '#fff', borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', borderRadius: 20, margin: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    photoPreview: { width: '100%', height: '100%' },
    photoPlaceholder: { alignItems: 'center' },
    photoPlaceholderText: { fontSize: 14, color: '#6366f1', marginTop: 8, fontWeight: '700' },

    row: { flexDirection: 'row', gap: 16 },
    divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 20 },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 15 },
    
    tabsRow: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 20 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    tabBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    tabBtnTextActive: { color: '#6366f1' },

    schedulePanel: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    helperText: { fontSize: 13, color: '#64748b', marginBottom: 12, fontWeight: '500' },
    
    dayScroll: { flexDirection: 'row', marginBottom: 15, paddingBottom: 5 },
    dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
    dayChipActive: { backgroundColor: '#6366f1' },
    dayChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    dayChipTextActive: { color: '#2D2445' },

    builderCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    builderCardTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 10 },
    
    slotInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
    addSlotBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
    
    slotsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    slotBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e0e7ff' },
    slotBadgeText: { fontSize: 12, color: '#4f46e5', fontWeight: '700' },
    
    emptyText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', paddingVertical: 10 },

    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    switchLabel: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
    switchHelp: { fontSize: 12, color: '#64748b', lineHeight: 16 },

    submitBtn: { backgroundColor: '#6366f1', borderRadius: 16, padding: 18, alignItems: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    submitText: { color: '#2D2445', fontSize: 16, fontWeight: '800' }
});
